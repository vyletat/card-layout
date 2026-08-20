import { pairImageFiles } from '../../domain/filePairing';
import { useProjectStore } from '../../state/projectStore';

/**
 * Returns a function that imports image files into the project: stores them,
 * then auto-pairs front/back by filename and creates the resulting cards.
 * Non-image files are ignored. Returns the created image ids.
 */
export function useImageImport() {
  const addImageFiles = useProjectStore((s) => s.addImageFiles);
  const addCard = useProjectStore((s) => s.addCard);

  return async function importFiles(files: File[]): Promise<string[]> {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return [];

    const fileNames = imageFiles.map((f) => f.name);
    const ids = await addImageFiles(imageFiles);
    const nameToId = new Map(fileNames.map((name, i) => [name, ids[i]]));

    const { pairs } = pairImageFiles(fileNames);
    for (const pair of pairs) {
      const frontId = nameToId.get(pair.frontFileName)!;
      const backId = pair.backFileName ? (nameToId.get(pair.backFileName) ?? null) : null;
      addCard(frontId, backId);
    }

    return ids;
  };
}
