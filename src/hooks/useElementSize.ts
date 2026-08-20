import { useLayoutEffect, useRef, useState } from 'react';

export interface Size {
  width: number;
  height: number;
}

/** Tracks an element's content-box size via ResizeObserver. */
export function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, Size] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Measure once up front: ResizeObserver only reports after the first frame,
    // and a background tab may not get that frame for a long time.
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    setSize({
      width: rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      height: rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
    });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
