import { useEffect, useState, type DependencyList } from 'react';

export function useAsyncList<T>(load: () => Promise<T[]>, dependencies: DependencyList): T[] {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    let active = true;
    void load()
      .then((result) => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
    // The caller supplies the dependencies that determine when its loader changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return items;
}
