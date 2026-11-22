/** Preview-only stand-in for next/navigation, driven by location.hash. */
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
export const hashPath = () => {
  const h = window.location.hash.replace(/^#\/?/, "");
  return !h || h === "home" ? "/" : `/${h}`;
};
export function usePathname(): string {
  return useSyncExternalStore(subscribe, hashPath, () => "/");
}
export function useRouter() {
  return { push: (p: string) => (window.location.hash = p === "/" ? "home" : p.replace(/^\//, "")) };
}
