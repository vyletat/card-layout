import { useEffect, useState } from 'react';

/** Loads a decoded HTMLImageElement for a given object URL, for use with Konva's <Image>. */
export function useHtmlImage(url: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => setImage(null);
  }, [url]);

  return image;
}
