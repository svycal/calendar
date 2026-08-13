import { useLayoutEffect, useRef, useState } from 'react';

export function useColumnWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      setWidth(el!.clientWidth);
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
