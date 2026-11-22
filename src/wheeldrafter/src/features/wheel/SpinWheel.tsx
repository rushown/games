"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { Wheel } from "@/data/types";
import { sliceColor, textOnTier } from "@/data/wheels";
import { buzz } from "@/lib/fx";
import { sliceAtPointer, slicePath, slicesOf, targetRotation, type Slice } from "./geometry";
import s from "./wheel.module.css";

export interface SpinRequest {
  /** Changes for every new spin. */
  id: number;
  /** Segment the wheel must land on (decided by the engine's weighted roll). */
  segmentId: string;
}

interface Props {
  wheel: Wheel;
  request: SpinRequest | null;
  fast?: boolean;
  /** Segment to highlight after landing. */
  landedId?: string | null;
  onLanded: (segmentId: string) => void;
  onTap?: () => void;
  /** Increment to finish the current spin instantly. */
  skipSignal?: number;
}

const R = 98;

/** Long, smooth deceleration (ease-out quart). */
const ease = (k: number) => 1 - Math.pow(1 - k, 4);

/**
 * The wheel face is a static SVG inside a <div> that is rotated with a CSS transform,
 * so the browser composites it on the GPU instead of repainting vector paths every frame.
 * The pointer "ticks" as slices pass (throttled so it stays smooth at high speed).
 */
export default function SpinWheel({ wheel, request, fast, landedId, onLanded, onTap, skipSignal = 0 }: Props) {
  const slices = useMemo(() => slicesOf(wheel), [wheel]);
  const rot = useRef(0);
  const rotor = useRef<HTMLDivElement>(null);
  const pointer = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const finish = useRef<(() => void) | null>(null);
  const [spinning, setSpinning] = useState(false);
  const landed = useRef(onLanded);
  landed.current = onLanded;

  useEffect(() => {
    if (!request) return;
    const index = wheel.segments.findIndex((x) => x.id === request.segmentId);
    if (index < 0) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 400 : fast ? 1900 : 5200;
    const from = rot.current;
    const to = targetRotation(slices, index, from, reduce ? 1 : fast ? 3 : 7, Math.random());
    let t0 = 0;
    let lastSlice = sliceAtPointer(slices, from);
    let lastTick = 0;
    setSpinning(true);

    const apply = (a: number, now: number) => {
      rot.current = a;
      if (rotor.current) rotor.current.style.transform = `rotate(${a}deg)`;
      const cur = sliceAtPointer(slices, a);
      if (cur !== lastSlice) {
        lastSlice = cur;
        if (now - lastTick > 45) {
          lastTick = now;
          pointer.current?.animate?.(
            [{ transform: "translateX(-50%) rotate(-16deg)" }, { transform: "translateX(-50%) rotate(0deg)" }],
            { duration: 120, easing: "ease-out" },
          );
        }
      }
    };
    const done = () => {
      cancelAnimationFrame(raf.current);
      apply(to, performance.now());
      finish.current = null;
      setSpinning(false);
      buzz(20);
      landed.current(request.segmentId);
    };
    finish.current = done;
    const step = (now: number) => {
      if (!t0) t0 = now; // start timing on the first painted frame (no jump)
      const k = Math.min(1, (now - t0) / duration);
      apply(from + (to - from) * ease(k), now);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else done();
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  useEffect(() => {
    if (skipSignal) finish.current?.();
  }, [skipSignal]);

  const landedIndex = landedId ? wheel.segments.findIndex((x) => x.id === landedId) : -1;

  return (
    <div className={`${s.wrap} ${spinning ? s.spinning : ""}`}>
      <div className={s.pointer} ref={pointer} aria-hidden />
      {/* fixed circular frame clips the rotating disc, so it never widens the page */}
      <div className={s.frame}>
        <div className={s.rotor} data-ui="rotor" ref={rotor} style={{ transform: `rotate(${rot.current}deg)` }}>
          <Face wheel={wheel} slices={slices} landedIndex={landedIndex} />
        </div>
      </div>
      <button type="button" className={s.hub} onClick={onTap} disabled={!onTap || spinning} aria-label="Spin">
        Spin
      </button>
    </div>
  );
}

/** Static wheel face; memoised so nothing re-renders while spinning. */
const Face = memo(function Face({ wheel, slices, landedIndex }: { wheel: Wheel; slices: Slice[]; landedIndex: number }) {
  return (
    <svg viewBox="-100 -100 200 200" className={s.svg} role="img" aria-label={`${wheel.name} wheel`}>
      {slices.map((sl) => {
        const seg = wheel.segments[sl.index];
        const dim = landedIndex >= 0 && landedIndex !== sl.index;
        return (
          <g key={seg.id} opacity={dim ? 0.35 : 1}>
            <path d={slicePath(R, sl.start, sl.end)} fill={sliceColor(seg, sl.index)} stroke="#fbfaf7" strokeWidth={0.5} />
            {sl.sweep >= 7 && <Label text={seg.short} mid={sl.mid} sweep={sl.sweep} color={seg.tier < 0 ? "#15130f" : textOnTier(seg.tier)} />}
          </g>
        );
      })}
      {landedIndex >= 0 && (
        <path d={slicePath(R, slices[landedIndex].start, slices[landedIndex].end)} fill="none" stroke="#15130f" strokeWidth="1.6" />
      )}
    </svg>
  );
});

function Label({ text, mid, sweep, color }: { text: string; mid: number; sweep: number; color: string }) {
  const flip = mid > 180;
  const size = sweep < 11 ? 5 : 6;
  return (
    <text
      transform={`rotate(${flip ? mid + 90 : mid - 90})`}
      x={flip ? -90 : 90}
      y={size * 0.35}
      textAnchor={flip ? "start" : "end"}
      fontSize={size}
      fill={color}
      style={{ fontFamily: "var(--mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}
    >
      {text}
    </text>
  );
}
