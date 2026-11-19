import { useEffect, useRef, useState } from 'react';

/**
 * Returns `value`, or for `lingerMs` after it is cleared, its last non-null
 * value. Keeps an overlay mounted briefly after clearing so a popover's close
 * transition doesn't lose its reference element.
 */
export function useLingeringValue<T>(
  value: T | null | undefined,
  lingerMs: number
): T | null {
  const lastRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stale, setStale] = useState<T | null>(null);

  useEffect(() => {
    if (value) {
      // A new value arrived: cancel any pending linger timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastRef.current = value;
    } else if (lastRef.current && lingerMs > 0) {
      const last = lastRef.current;
      lastRef.current = null;
      setStale(last);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setStale(null);
      }, lingerMs);
    }
  }, [value, lingerMs]);

  return value ?? stale;
}
