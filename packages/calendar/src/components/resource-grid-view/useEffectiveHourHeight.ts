import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Computes an effective hour height that stretches rows to fill the container
 * when there is extra vertical space. The provided `hourHeight` acts as a minimum.
 */
export function useEffectiveHourHeight(
  hourHeight: number,
  totalHours: number,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [effectiveHourHeight, setEffectiveHourHeight] = useState(hourHeight);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const header = headerRef.current;
    if (!root || !header) return;

    function measure() {
      const containerHeight = root!.clientHeight;
      const headerHeight = header!.offsetHeight;
      const availableBodyHeight = containerHeight - headerHeight;
      const stretched = availableBodyHeight / totalHours;
      setEffectiveHourHeight(Math.max(hourHeight, stretched));
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(root);

    return () => observer.disconnect();
  }, [hourHeight, totalHours]);

  return { effectiveHourHeight, rootRef, headerRef };
}
