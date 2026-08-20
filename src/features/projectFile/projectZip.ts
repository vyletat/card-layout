import { getImageBlob, putImage } from '../../storage/db';
import type { CardImageMeta, Project } from '../../state/types';

const PROJECT_ENTRY = 'project.json';
const IMAGES_META_ENTRY = 'images-meta.json';

/**
 * JSZip is only needed when the user actually saves or opens a project file,
 * so it is pulled in on demand instead of riding along in the initial bundle.
 */
async function loadJsZip() {
  const { default: JSZip } = await import('jszip');
  return JSZip;
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  return 'bin';
}

export async function exportProjectZip(project: Project, images: Record<string, CardImageMeta>): Promise<Blob> {
  const JSZip = await loadJsZip();
  const zip = new JSZip();
  zip.file(PROJECT_ENTRY, JSON.stringify(project));
  zip.file(IMAGES_META_ENTRY, JSON.stringify(Object.values(images)));

  const imagesFolder = zip.folder('images')!;
  for (const meta of Object.values(images)) {
    const blob = await getImageBlob(meta.id);
    if (!blob) continue;
    imagesFolder.file(`${meta.id}.${extensionForMimeType(blob.type)}`, blob);
  }

  return zip.generateAsync({ type: 'blob' });
}

export interface ImportedProject {
  project: Project;
  images: CardImageMeta[];
}

export async function importProjectZip(file: Blob): Promise<ImportedProject> {
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(file);

  const projectJson = await zip.file(PROJECT_ENTRY)?.async('string');
  if (!projectJson) throw new Error('Soubor projektu neobsahuje project.json.');
  const project = JSON.parse(projectJson) as Project;

  const imagesMetaJson = await zip.file(IMAGES_META_ENTRY)?.async('string');
  const storedMeta: CardImageMeta[] = imagesMetaJson ? JSON.parse(imagesMetaJson) : [];

  // The archive may have been written by another project (or by a version that
  // had no ownership at all), so every image is re-stamped for this project.
  const images = storedMeta.map((meta) => ({ ...meta, projectId: project.id }));

  for (const meta of images) {
    const entry = zip.file(new RegExp(`^images/${meta.id}\.`))[0];
    if (!entry) continue;
    const blob = await entry.async('blob');
    await putImage(meta, blob);
  }

  return { project, images };
}
