import { useEffect, useState } from 'react';
import { getImageBlob } from '../storage/db';

const urlCache = new Map<string, string>();

/** Resolves a stored image id to an object URL, caching it for reuse across components. */
export function useImageUrl(imageId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(imageId ? (urlCache.get(imageId) ?? null) : null);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return;
    }
    const cached = urlCache.get(imageId);
    if (cached) {
      setUrl(cached);
      return;
    }

    let cancelled = false;
    void getImageBlob(imageId).then((blob) => {
      if (!blob || cancelled) return;
      const objectUrl = URL.createObjectURL(blob);
      urlCache.set(imageId, objectUrl);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [imageId]);

  return url;
}
