import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
    // `delay` intentionally excluded: a parent passing a fresh literal each
    // render would otherwise re-arm the timer forever. The value change drives it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return debounced;
}
