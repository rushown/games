/** Small device effects. Every call is best-effort and silently does nothing if unsupported. */

export function buzz(pattern: number | number[] = 15): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

const COLORS = ["#ff5e1a", "#e8ff47", "#2ee6a6", "#ff5fa2", "#ece9e0"];

export function confetti(pieces = 70): void {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  clearConfetti();
  const box = document.createElement("div");
  box.className = "fx-confetti";
  for (let i = 0; i < pieces; i++) {
    const e = document.createElement("i");
    e.style.left = `${Math.random() * 100}%`;
    e.style.background = COLORS[i % COLORS.length];
    e.style.animationDuration = `${1.6 + Math.random() * 1.8}s`;
    e.style.animationDelay = `${Math.random() * 0.5}s`;
    e.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    box.appendChild(e);
  }
  document.body.appendChild(box);
  window.setTimeout(() => box.remove(), 4200);
}

export function clearConfetti(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll(".fx-confetti").forEach((n) => n.remove());
}
