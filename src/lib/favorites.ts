"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "jep-lyon-favorites";

function readIds(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [ids, setIds] = useState<Set<number>>(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(new Set(readIds()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  }, [ids, ready]);

  const toggle = useCallback((id: number) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return { ids, toggle, ready, count: ids.size };
}
