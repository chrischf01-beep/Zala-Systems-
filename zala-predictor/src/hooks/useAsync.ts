import { useEffect, useState } from 'react';

/** Resolves an async value into state, re-running `fn` whenever `deps` changes. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let alive = true;
    fn().then((v) => {
      if (alive) setValue(v);
    });
    return () => {
      alive = false;
    };
  }, deps);
  return value;
}
