import type { Wheel } from "@/data/types";

/** Angles are degrees, clockwise from 12 o'clock. */
export interface Slice {
  index: number;
  start: number;
  end: number;
  mid: number;
  sweep: number;
}

export function slicesOf(wheel: Wheel): Slice[] {
  const total = wheel.segments.reduce((t, s) => t + s.weight, 0);
  let a = 0;
  return wheel.segments.map((s, index) => {
    const sweep = (s.weight / total) * 360;
    const slice = { index, start: a, end: a + sweep, mid: a + sweep / 2, sweep };
    a += sweep;
    return slice;
  });
}

export const polar = (r: number, deg: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
};

export function slicePath(r: number, start: number, end: number): string {
  const [x1, y1] = polar(r, start);
  const [x2, y2] = polar(r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M0 0 L${x1.toFixed(3)} ${y1.toFixed(3)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
}

/** Which slice sits under the pointer (12 o'clock) when the wheel is rotated by `rotation` degrees. */
export function sliceAtPointer(slices: Slice[], rotation: number): number {
  const a = (((360 - rotation) % 360) + 360) % 360;
  const s = slices.find((x) => a >= x.start && a < x.end);
  return s ? s.index : slices.length - 1;
}

/**
 * Final rotation that lands the pointer somewhere inside slice `index`
 * (away from the edges), after `turns` extra full spins.
 */
export function targetRotation(slices: Slice[], index: number, current: number, turns: number, rnd: number): number {
  const s = slices[index];
  const margin = Math.min(s.sweep * 0.2, 2);
  const landAt = s.start + margin + rnd * (s.sweep - 2 * margin);
  const want = (((360 - landAt) % 360) + 360) % 360;
  const now = ((current % 360) + 360) % 360;
  const delta = (want - now + 360) % 360;
  return current + turns * 360 + delta;
}
