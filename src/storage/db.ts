import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CardImageMeta } from '../state/types';
import type { Project } from '../state/types';

interface StoredImage extends CardImageMeta {
  blob: Blob;
}

interface CardLayoutDB extends DBSchema {
  images: {
    key: string;
    value: StoredImage;
    indexes: { 'by-project': string };
  };
  projects: {
    key: string;
    value: Project;
  };
}

const DB_NAME = 'card-layout';
/** v2 added the by-project index that scopes the image library to one project. */
const DB_VERSION = 2;
const BY_PROJECT = 'by-project';

let dbPromise: Promise<IDBPDatabase<CardLayoutDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CardLayoutDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CardLayoutDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore('images', { keyPath: 'id' });
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          // Records saved before scoping have no projectId, so IndexedDB leaves
          // them out of the index; adoptOrphanImages() attaches them on startup.
          tx.objectStore('images').createIndex(BY_PROJECT, 'projectId');
        }
      },
    });
  }
  return dbPromise;
}

function stripBlob({ blob: _blob, ...meta }: StoredImage): CardImageMeta {
  return meta;
}

export async function putImage(meta: CardImageMeta, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put('images', { ...meta, blob });
}

export async function getImageBlob(id: string): Promise<Blob | undefined> {
  const db = await getDb();
  const stored = await db.get('images', id);
  return stored?.blob;
}

export async function getImageMeta(id: string): Promise<CardImageMeta | undefined> {
  const db = await getDb();
  const stored = await db.get('images', id);
  return stored ? stripBlob(stored) : undefined;
}

/** The image library of a single project. */
export async function getImagesForProject(projectId: string): Promise<CardImageMeta[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('images', BY_PROJECT, projectId);
  return all.map(stripBlob);
}

/** Images left over from before the library was scoped to a project. */
export async function getOrphanImageMeta(): Promise<CardImageMeta[]> {
  const db = await getDb();
  const all = await db.getAll('images');
  return all.filter((image) => !image.projectId).map(stripBlob);
}

export async function updateImageMeta(id: string, patch: Partial<CardImageMeta>): Promise<void> {
  const db = await getDb();
  const stored = await db.get('images', id);
  if (!stored) return;
  await db.put('images', { ...stored, ...patch, id: stored.id });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('images', id);
}

export async function putProject(project: Project): Promise<void> {
  const db = await getDb();
  await db.put('projects', project);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDb();
  return db.get('projects', id);
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDb();
  return db.getAll('projects');
}

/** Deletes a project together with the images it owns, in one transaction. */
export async function deleteProjectWithImages(projectId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['projects', 'images'], 'readwrite');
  const imageIds = await tx.objectStore('images').index(BY_PROJECT).getAllKeys(projectId);
  await Promise.all([
    tx.objectStore('projects').delete(projectId),
    ...imageIds.map((id) => tx.objectStore('images').delete(id)),
  ]);
  await tx.done;
}

/** Counts a project's images without loading them, for the projects list. */
export async function countImagesForProject(projectId: string): Promise<number> {
  const db = await getDb();
  return db.countFromIndex('images', BY_PROJECT, projectId);
}
