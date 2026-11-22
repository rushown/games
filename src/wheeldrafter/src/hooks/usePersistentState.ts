"use client";
import { useEffect, useRef, useState } from "react";
import { load, save } from "@/lib/storage";

/**
 * useState that survives reloads. Merges stored data over `initial`, so adding
 * new settings later never breaks old saves. Hydrates after mount (SSR-safe).
 */
export function usePersistentState<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    setValue(load(key, initial));
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (hydrated.current) save(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
