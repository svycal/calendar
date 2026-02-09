import { useCallback, useRef, useState } from 'react';

export function useAnnouncer() {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((text: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Clear first so repeated identical messages are re-announced
    setMessage('');
    timeoutRef.current = setTimeout(() => {
      setMessage(text);
    }, 50);
  }, []);

  return { message, announce };
}
