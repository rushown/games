"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Auction countdown: restarts whenever `rev` changes (new lot or new bid) and calls
 * `onExpire` once when it runs out. `grace` adds extra time (e.g. while the
 * "SOLD!" flash for the previous lot is on screen).
 */
export function useHammerTimer({
  rev,
  seconds,
  active,
  paused,
  grace = 0,
  onExpire,
}: {
  rev: number;
  seconds: number;
  active: boolean;
  paused: boolean;
  grace?: number;
  onExpire: () => void;
}) {
  const total = seconds * 1000;
  const [left, setLeft] = useState(total);
  const deadline = useRef(0);
  const firedFor = useRef(-1);
  const pausedLeft = useRef<number | null>(null);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  // restart on every change
  useEffect(() => {
    deadline.current = Date.now() + total + grace;
    pausedLeft.current = null;
    setLeft(total);
  }, [rev, total, grace]);

  // pause / resume
  useEffect(() => {
    if (paused) pausedLeft.current = Math.max(0, deadline.current - Date.now());
    else if (pausedLeft.current !== null) {
      deadline.current = Date.now() + pausedLeft.current;
      pausedLeft.current = null;
    }
  }, [paused]);

  useEffect(() => {
    if (!active || seconds <= 0) return;
    const id = window.setInterval(() => {
      if (pausedLeft.current !== null) return;
      const ms = deadline.current - Date.now();
      setLeft(Math.min(total, Math.max(0, ms)));
      if (ms <= 0 && firedFor.current !== rev) {
        firedFor.current = rev;
        expire.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [active, seconds, rev, total]);

  return { left, total, fraction: total ? left / total : 0 };
}
