import { loadValue, save } from "./storage";

/** One finished Draft Duel, kept on this device. */
export interface DraftRecord {
  /** AuctionState.startedAt: unique per draft. */
  id: number;
  at: number;
  names: [string, string];
  teams: [{ key: string; price: number; via: "won" | "kept" | "passed" }[], { key: string; price: number; via: "won" | "kept" | "passed" }[]];
  left: [number, number];
  boutWins: [number, number];
  winner: 0 | 1 | null;
  hostEntry: boolean;
}

const KEY = "draft-records";
const MAX = 60;

export function loadRecords(): DraftRecord[] {
  const list = loadValue<DraftRecord[]>(KEY, []);
  return Array.isArray(list) ? list.filter((r) => r && Array.isArray(r.teams)) : [];
}

/** Saves a draft once (same id twice is ignored). Newest first. */
export function saveRecord(r: DraftRecord): DraftRecord[] {
  const list = loadRecords().filter((x) => x.id !== r.id);
  const next = [r, ...list].slice(0, MAX);
  save(KEY, next);
  return next;
}

export function clearRecords(): void {
  save(KEY, []);
}

export interface Standing {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  spent: number;
}

/** Win / loss table per player name (case-insensitive), best first. */
export function standings(records: DraftRecord[]): Standing[] {
  const map = new Map<string, Standing>();
  const get = (name: string) => {
    const k = name.trim().toLowerCase();
    if (!map.has(k)) map.set(k, { name: name.trim(), wins: 0, losses: 0, draws: 0, spent: 0 });
    return map.get(k)!;
  };
  for (const r of records) {
    r.names.forEach((n, i) => {
      const st = get(n);
      st.spent += r.teams[i].reduce((t, o) => t + o.price, 0);
      if (r.winner === null) st.draws++;
      else if (r.winner === i) st.wins++;
      else st.losses++;
    });
  }
  return [...map.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
}
