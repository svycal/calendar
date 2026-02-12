import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Computes an effective hour height that stretches rows to fill the container
 * when there is extra vertical space. The provided `hourHeight` acts as a minimum.
 *
 * Also exposes the measured header height so the all-day row can be positioned
 * sticky below the header.
 */
export function useEffectiveHourHeight(hourHeight: number, totalHours: number) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const allDayRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [effectiveHourHeight, setEffectiveHourHeight] = useState(hourHeight);
  const [headerHeight, setHeaderHeight] = useState(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const header = headerRef.current;
    const grid = gridRef.current;
    if (!root || !header) return;

    function measure() {
      const containerHeight = root!.clientHeight;

      // Prefer reading the resolved first-row height from the grid's computed
      // style. The corner cell (headerRef) may not stretch to the full grid
      // row height, so offsetHeight can under-report.
      let measuredHeaderHeight = header!.offsetHeight;
      if (grid) {
        const resolvedRows = getComputedStyle(grid).gridTemplateRows;
        const firstRow = parseFloat(resolvedRows);
        if (firstRow > 0) measuredHeaderHeight = firstRow;
      }

      setHeaderHeight(measuredHeaderHeight);
      const allDayHeight = allDayRef.current?.offsetHeight ?? 0;
      const availableBodyHeight =
        containerHeight - measuredHeaderHeight - allDayHeight;
      const stretched = availableBodyHeight / totalHours;
      setEffectiveHourHeight(Math.max(hourHeight, stretched));
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(root);

    return () => observer.disconnect();
  }, [hourHeight, totalHours]);

  return {
    effectiveHourHeight,
    rootRef,
    headerRef,
    allDayRef,
    gridRef,
    headerHeight,
  };
}
