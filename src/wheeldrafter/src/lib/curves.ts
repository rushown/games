/**
 * Parametric curves used to draw portraits.
 *
 * Superformula (Gielis): r(φ) = ( |cos(mφ/4)/a|^n2 + |sin(mφ/4)/b|^n3 )^(-1/n1)
 * Rose curve:            r(θ) = |cos(kθ)|
 * Both are sampled into SVG paths and scaled to a radius.
 */

export function superformula(phi: number, m: number, n1: number, n2: number, n3: number, a = 1, b = 1): number {
  const t1 = Math.pow(Math.abs(Math.cos((m * phi) / 4) / a), n2);
  const t2 = Math.pow(Math.abs(Math.sin((m * phi) / 4) / b), n3);
  const r = Math.pow(t1 + t2, -1 / n1);
  return isFinite(r) ? r : 0;
}

function polarPath(fn: (t: number) => number, cx: number, cy: number, radius: number, steps: number, turns = 1, rotate = 0): string {
  const pts: [number, number][] = [];
  let max = 0;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const r = fn(t);
    if (r > max) max = r;
    pts.push([r, t + rotate]);
  }
  const k = max > 0 ? radius / max : 0;
  return (
    pts
      .map(([r, t], i) => `${i ? "L" : "M"}${(cx + r * k * Math.cos(t)).toFixed(2)} ${(cy + r * k * Math.sin(t)).toFixed(2)}`)
      .join(" ") + " Z"
  );
}

export function superformulaPath(
  cx: number,
  cy: number,
  radius: number,
  p: { m: number; n1: number; n2: number; n3: number },
  rotate = 0,
): string {
  return polarPath((t) => superformula(t, p.m, p.n1, p.n2, p.n3), cx, cy, radius, 360, 1, rotate);
}

/** Rose with k petals-ish (k may be fractional; turns closes the curve). */
export function rosePath(cx: number, cy: number, radius: number, k: number, rotate = 0): string {
  const turns = Number.isInteger(k) ? 1 : 2;
  return polarPath((t) => Math.abs(Math.cos(k * t)), cx, cy, radius, 720, turns, rotate);
}
