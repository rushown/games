import { beforeEach, describe, expect, it } from "vitest";
import { auctionReducer as R, assignError, choiceOptions, createAuction, DEFAULT_CONFIG, type AuctionState } from "@/features/auction/engine";
import { seeded } from "@/lib/random";
import { loadRecords, saveRecord, standings, type DraftRecord } from "@/lib/records";

const start = (seed = 3) => createAuction({ ...DEFAULT_CONFIG, control: "entry" }, seeded(seed));

describe("host entry", () => {
  it("assigns the lot to the named bidder for the typed amount", () => {
    let s = start();
    const key = s.lot!.key;
    s = R(s, { type: "assign", player: 1, amount: 9 });
    expect(s.players[1].team).toEqual([{ key, price: 9, via: "won" }]);
    expect(s.players[1].budget).toBe(16);
    expect(s.last).toMatchObject({ kind: "sold", key, player: 1, price: 9 });
    expect(s.lot!.key).not.toBe(key);
  });

  it("refuses amounts below $1 or above the winner's budget", () => {
    const s = start();
    expect(assignError(s, 0, 0)).toBeTruthy();
    expect(assignError(s, 0, 26)).toMatch(/only has \$25/);
    expect(R(s, { type: "assign", player: 0, amount: 26 })).toBe(s);
    expect(assignError(s, 0, 25)).toBeNull();
  });

  it("can run a whole draft to the end", () => {
    let s: AuctionState = start(7);
    for (let i = 0; i < 200 && s.phase !== "done"; i++) {
      if (s.phase === "auction") {
        const p = (i % 2) as 0 | 1;
        const who = assignError(s, p, 1) ? ((1 - p) as 0 | 1) : p;
        s = assignError(s, who, 1) ? R(s, { type: "hammer" }) : R(s, { type: "assign", player: who, amount: Math.min(3, s.players[who].budget) });
      } else s = choiceOptions(s)!.canKeep ? R(s, { type: "keep" }) : R(R(s, { type: "pass" }), { type: "accept" });
    }
    expect(s.phase).toBe("done");
    expect(s.players.every((p) => p.team.length === 5)).toBe(true);
    expect(s.log.length).toBeGreaterThanOrEqual(10);
  });
});

describe("draft records", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    Object.assign(globalThis, {
      window: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
        },
      },
    });
  });

  const rec = (id: number, names: [string, string], winner: 0 | 1 | null): DraftRecord => ({
    id,
    at: id,
    names,
    teams: [[{ key: "goku", price: 5, via: "won" }], [{ key: "levi", price: 2, via: "won" }]],
    left: [20, 23],
    boutWins: winner === null ? [2, 2] : winner === 0 ? [3, 2] : [2, 3],
    winner,
    hostEntry: true,
  });

  it("saves each draft once, newest first", () => {
    saveRecord(rec(1, ["Ana", "Bo"], 0));
    saveRecord(rec(2, ["Ana", "Bo"], 1));
    saveRecord(rec(2, ["Ana", "Bo"], 1));
    expect(loadRecords().map((r) => r.id)).toEqual([2, 1]);
  });

  it("builds a win/loss table across drafts", () => {
    const t = standings([rec(1, ["Ana", "Bo"], 0), rec(2, ["ana", "Cy"], 0), rec(3, ["Bo", "Cy"], null)]);
    expect(t[0]).toMatchObject({ name: "Ana", wins: 2, losses: 0, spent: 10 });
    expect(t.find((x) => x.name === "Bo")).toMatchObject({ wins: 0, losses: 1, draws: 1 });
  });
});
