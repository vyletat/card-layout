import { create } from 'zustand';
import * as db from '../storage/db';
import { newId } from '../domain/ids';
import { deriveDisplayName, detectFileSide } from '../domain/filePairing';
import {
  createEmptyProject,
  DEFAULT_IMAGE_TRANSFORM,
  MAX_CARD_COUNT,
  normalizeProject,
  type Card,
  type CardImageMeta,
  type ImageKind,
  type ImageTransform,
  type Project,
  type ProjectSettings,
} from './types';

const MAX_TRANSFORM_HISTORY = 50;

/** A card to create in bulk, e.g. from a CSV import or a library selection. */
export interface NewCardSpec {
  frontImageId: string | null;
  backImageId?: string | null;
  name?: string;
  count?: number;
}

/** One undo step: every transform a single editor edit can change. */
interface TransformSnapshot {
  cards: Card[];
  sharedBackTransform: ImageTransform;
}

interface ProjectState {
  project: Project;
  images: Record<string, CardImageMeta>;
  transformHistory: TransformSnapshot[];
  transformFuture: TransformSnapshot[];
  /** `project.updatedAt` as of the last save/load; drives the unsaved-changes warning. */
  savedAt: number;

  updateSettings: (patch: Partial<ProjectSettings>) => void;
  renameProject: (name: string) => void;

  addImageFiles: (files: File[]) => Promise<string[]>;
  removeImage: (imageId: string) => Promise<void>;
  removeImages: (imageIds: string[]) => Promise<void>;
  renameImage: (imageId: string, displayName: string) => void;
  setImageKind: (imageId: string, kind: ImageKind) => void;
  setImagesKind: (imageIds: string[], kind: ImageKind) => void;
  autoNameImages: () => void;

  addCard: (frontImageId: string | null, backImageId?: string | null) => string;
  addCards: (specs: NewCardSpec[]) => string[];
  duplicateCard: (cardId: string) => string | null;
  removeCard: (cardId: string) => void;
  removeAllCards: () => void;
  reorderCards: (orderedCardIds: string[]) => void;
  setCardCount: (cardId: string, count: number) => void;
  setCardName: (cardId: string, name: string) => void;
  setCardLocked: (cardId: string, locked: boolean) => void;

  updateCardImage: (cardId: string, side: 'front' | 'back', imageId: string | null) => void;
  updateCardTransform: (
    cardId: string,
    side: 'front' | 'back',
    patch: Partial<ImageTransform>,
  ) => void;

  setSharedBackImage: (imageId: string | null) => void;
  updateSharedBackTransform: (patch: Partial<ImageTransform>) => void;

  undoTransform: () => void;
  redoTransform: () => void;

  loadProject: (project: Project, images: CardImageMeta[]) => void;
  openProjectById: (projectId: string) => Promise<void>;
  restoreLastSession: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  resetProject: () => void;
  saveNow: () => Promise<void>;
  markSaved: () => void;
}

const PERSIST_DEBOUNCE_MS = 500;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(project: Project) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void db.putProject(project);
  }, PERSIST_DEBOUNCE_MS);
}

function touch(project: Project): Project {
  return { ...project, updatedAt: Date.now() };
}

function snapshot(project: Project): TransformSnapshot {
  return { cards: project.cards, sharedBackTransform: project.sharedBackTransform };
}

/** Guards against StrictMode's double effect re-running the boot restore. */
let sessionRestored = false;

function makeCard(spec: NewCardSpec, order: number): Card {
  return {
    id: newId(),
    order,
    name: spec.name?.trim() || undefined,
    frontImageId: spec.frontImageId,
    frontTransform: { ...DEFAULT_IMAGE_TRANSFORM },
    backImageId: spec.backImageId ?? null,
    backTransform: { ...DEFAULT_IMAGE_TRANSFORM },
    count: spec.count && spec.count > 1 ? Math.min(MAX_CARD_COUNT, Math.floor(spec.count)) : undefined,
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createEmptyProject(),
  images: {},
  transformHistory: [],
  transformFuture: [],
  savedAt: Date.now(),

  updateSettings: (patch) => {
    set((state) => {
      const project = touch({ ...state.project, settings: { ...state.project.settings, ...patch } });
      schedulePersist(project);
      return { project };
    });
  },

  renameProject: (name) => {
    set((state) => {
      const project = touch({ ...state.project, name: name.trim() || 'Untitled' });
      schedulePersist(project);
      return { project };
    });
  },

  addImageFiles: async (files) => {
    const ids: string[] = [];
    const newMetas: Record<string, CardImageMeta> = {};
    const projectId = get().project.id;

    for (const file of files) {
      const dims = await readImageDimensions(file);
      const meta: CardImageMeta = {
        id: newId(),
        projectId,
        fileName: file.name,
        kind: detectFileSide(file.name) === 'back' ? 'back' : 'front',
        widthPx: dims.width,
        heightPx: dims.height,
        createdAt: Date.now(),
      };
      await db.putImage(meta, file);
      newMetas[meta.id] = meta;
      ids.push(meta.id);
    }

    set((state) => ({ images: { ...state.images, ...newMetas } }));
    return ids;
  },

  removeImage: async (imageId) => {
    await get().removeImages([imageId]);
  },

  removeImages: async (imageIds) => {
    const ids = new Set(imageIds);
    for (const id of ids) await db.deleteImage(id);

    set((state) => {
      const images = { ...state.images };
      for (const id of ids) delete images[id];

      // Unlink the deleted images from any card side and the shared back.
      const cards = state.project.cards.map((c) => ({
        ...c,
        frontImageId: c.frontImageId && ids.has(c.frontImageId) ? null : c.frontImageId,
        backImageId: c.backImageId && ids.has(c.backImageId) ? null : c.backImageId,
      }));
      const sharedBackImageId =
        state.project.sharedBackImageId && ids.has(state.project.sharedBackImageId)
          ? null
          : state.project.sharedBackImageId;
      const project = touch({ ...state.project, cards, sharedBackImageId });
      schedulePersist(project);

      return { images, project };
    });
  },

  renameImage: (imageId, displayName) => {
    const trimmed = displayName.trim();
    void db.updateImageMeta(imageId, { displayName: trimmed || undefined });
    set((state) => {
      const meta = state.images[imageId];
      if (!meta) return state;
      return {
        images: { ...state.images, [imageId]: { ...meta, displayName: trimmed || undefined } },
      };
    });
  },

  setImageKind: (imageId, kind) => {
    get().setImagesKind([imageId], kind);
  },

  setImagesKind: (imageIds, kind) => {
    set((state) => {
      const images = { ...state.images };
      for (const id of imageIds) {
        const meta = images[id];
        if (!meta) continue;
        images[id] = { ...meta, kind };
        void db.updateImageMeta(id, { kind });
      }
      return { images };
    });
  },

  autoNameImages: () => {
    set((state) => {
      const images = { ...state.images };
      for (const [id, meta] of Object.entries(images)) {
        const displayName = deriveDisplayName(meta.fileName);
        images[id] = { ...meta, displayName };
        void db.updateImageMeta(id, { displayName });
      }
      return { images };
    });
  },

  addCard: (frontImageId, backImageId = null) => {
    return get().addCards([{ frontImageId, backImageId }])[0];
  },

  addCards: (specs) => {
    if (specs.length === 0) return [];
    const created: Card[] = [];
    set((state) => {
      specs.forEach((spec, i) => {
        created.push(makeCard(spec, state.project.cards.length + i));
      });
      const project = touch({ ...state.project, cards: [...state.project.cards, ...created] });
      schedulePersist(project);
      return { project };
    });
    return created.map((c) => c.id);
  },

  duplicateCard: (cardId) => {
    const source = get().project.cards.find((c) => c.id === cardId);
    if (!source) return null;
    const copyId = newId();

    set((state) => {
      const sorted = state.project.cards.slice().sort((a, b) => a.order - b.order);
      const at = sorted.findIndex((c) => c.id === cardId);
      const copy: Card = {
        ...source,
        id: copyId,
        // Transforms are shared objects on the source card; clone so edits don't leak across.
        frontTransform: { ...source.frontTransform },
        backTransform: { ...source.backTransform },
        order: 0,
      };
      sorted.splice(at + 1, 0, copy);
      const cards = sorted.map((c, i) => ({ ...c, order: i }));
      const project = touch({ ...state.project, cards });
      schedulePersist(project);
      return { project };
    });

    return copyId;
  },

  removeCard: (cardId) => {
    set((state) => {
      const cards = state.project.cards
        .filter((c) => c.id !== cardId)
        .map((c, i) => ({ ...c, order: i }));
      const project = touch({ ...state.project, cards });
      schedulePersist(project);
      return { project };
    });
  },

  removeAllCards: () => {
    set((state) => {
      const project = touch({ ...state.project, cards: [] });
      schedulePersist(project);
      return { project, transformHistory: [], transformFuture: [] };
    });
  },

  reorderCards: (orderedCardIds) => {
    set((state) => {
      const byId = new Map(state.project.cards.map((c) => [c.id, c]));
      const cards = orderedCardIds
        .map((id, i) => {
          const card = byId.get(id);
          return card ? { ...card, order: i } : null;
        })
        .filter((c): c is Card => c !== null);
      const project = touch({ ...state.project, cards });
      schedulePersist(project);
      return { project };
    });
  },

  setCardCount: (cardId, count) => {
    const clamped = Math.max(1, Math.min(MAX_CARD_COUNT, Math.floor(count)));
    set((state) => {
      const cards = state.project.cards.map((c) => (c.id === cardId ? { ...c, count: clamped } : c));
      const project = touch({ ...state.project, cards });
      schedulePersist(project);
      return { project };
    });
  },

  setCardName: (cardId, name) => {
    const trimmed = name.trim();
    set((state) => {
      const cards = state.project.cards.map((c) =>
        c.id === cardId ? { ...c, name: trimmed || undefined } : c,
      );
      const project = touch({ ...state.project, cards });
      schedulePersist(project);
      return { project };
    });
  },

  setCardLocked: (cardId, locked) => {
    set((state) => {
      const cards = state.project.cards.map((c) =>
        c.id === cardId ? { ...c, locked: locked || undefined } : c,
      );
      const project = touch({ ...state.project, cards });
      schedulePersist(project);
      return { project };
    });
  },

  updateCardImage: (cardId, side, imageId) => {
    set((state) => {
      const cards = state.project.cards.map((c) =>
        c.id === cardId ? { ...c, [side === 'front' ? 'frontImageId' : 'backImageId']: imageId } : c,
      );
      const project = touch({ ...state.project, cards });
      schedulePersist(project);
      return { project };
    });
  },

  updateCardTransform: (cardId, side, patch) => {
    set((state) => {
      const target = state.project.cards.find((c) => c.id === cardId);
      // A locked card keeps its framing; only unlocking can change it again.
      if (!target || target.locked) return state;

      const key = side === 'front' ? 'frontTransform' : 'backTransform';
      const cards = state.project.cards.map((c) =>
        c.id === cardId ? { ...c, [key]: { ...c[key], ...patch } } : c,
      );
      const project = touch({ ...state.project, cards });
      schedulePersist(project);
      const transformHistory = [...state.transformHistory, snapshot(state.project)].slice(
        -MAX_TRANSFORM_HISTORY,
      );
      return { project, transformHistory, transformFuture: [] };
    });
  },

  setSharedBackImage: (imageId) => {
    set((state) => {
      const project = touch({ ...state.project, sharedBackImageId: imageId });
      schedulePersist(project);
      return { project };
    });
  },

  updateSharedBackTransform: (patch) => {
    set((state) => {
      const project = touch({
        ...state.project,
        sharedBackTransform: { ...state.project.sharedBackTransform, ...patch },
      });
      schedulePersist(project);
      // Framing the shared back is a transform edit like any other, so it joins
      // the same undo history instead of quietly bypassing it.
      const transformHistory = [...state.transformHistory, snapshot(state.project)].slice(
        -MAX_TRANSFORM_HISTORY,
      );
      return { project, transformHistory, transformFuture: [] };
    });
  },

  undoTransform: () => {
    set((state) => {
      if (state.transformHistory.length === 0) return state;
      const previous = state.transformHistory[state.transformHistory.length - 1];
      const project = touch({ ...state.project, ...previous });
      schedulePersist(project);
      return {
        project,
        transformHistory: state.transformHistory.slice(0, -1),
        transformFuture: [...state.transformFuture, snapshot(state.project)],
      };
    });
  },

  redoTransform: () => {
    set((state) => {
      if (state.transformFuture.length === 0) return state;
      const next = state.transformFuture[state.transformFuture.length - 1];
      const project = touch({ ...state.project, ...next });
      schedulePersist(project);
      return {
        project,
        transformFuture: state.transformFuture.slice(0, -1),
        transformHistory: [...state.transformHistory, snapshot(state.project)],
      };
    });
  },

  loadProject: (project, images) => {
    const normalized = normalizeProject(project);
    void db.putProject(normalized);
    set({
      project: normalized,
      images: Object.fromEntries(images.map((m) => [m.id, m])),
      transformHistory: [],
      transformFuture: [],
      savedAt: normalized.updatedAt,
    });
  },

  openProjectById: async (projectId) => {
    const stored = await db.getProject(projectId);
    if (!stored) return;
    get().loadProject(stored, await db.getImagesForProject(projectId));
  },

  restoreLastSession: async () => {
    if (sessionRestored) return;
    sessionRestored = true;
    const all = await db.getAllProjects();
    if (all.length === 0) return;
    const latest = all.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));

    // Images stored before the library was scoped belong to no project. There
    // was only ever one pool back then, so the newest project adopts them.
    const orphans = await db.getOrphanImageMeta();
    for (const orphan of orphans) {
      await db.updateImageMeta(orphan.id, { projectId: latest.id });
    }

    get().loadProject(latest, await db.getImagesForProject(latest.id));
  },

  deleteProject: async (projectId) => {
    await db.deleteProjectWithImages(projectId);
    if (get().project.id !== projectId) return;

    // The open project just went away; fall back to the next most recent one.
    const remaining = await db.getAllProjects();
    if (remaining.length === 0) {
      get().resetProject();
      return;
    }
    const latest = remaining.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
    get().loadProject(latest, await db.getImagesForProject(latest.id));
  },

  resetProject: () => {
    const project = createEmptyProject();
    void db.putProject(project);
    set({
      project,
      images: {},
      transformHistory: [],
      transformFuture: [],
      savedAt: project.updatedAt,
    });
  },

  saveNow: async () => {
    // Writes are debounced while you work; an explicit save skips the wait so
    // the project on disk matches what is on screen the moment the click lands.
    const project = get().project;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    await db.putProject(project);
    set({ savedAt: project.updatedAt });
  },

  markSaved: () => {
    set((state) => ({ savedAt: state.project.updatedAt }));
  },
}));

/** True when the project has changed since it was last saved to a file or loaded. */
export function useIsDirty(): boolean {
  return useProjectStore((s) => s.project.updatedAt > s.savedAt && s.project.cards.length > 0);
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __projectStore: typeof useProjectStore }).__projectStore = useProjectStore;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}
