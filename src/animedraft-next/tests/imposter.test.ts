import { describe, expect, it } from "vitest";
import {
  afterVote,
  aliveIndexes,
  cardFor,
  cleanNames,
  createImposterGame,
  DEFAULT_IMPOSTER_CONFIG,
  eliminate,
  guess,
  maxImposters,
  revealNext,
  skipVote,
  speakingOrder,
  startVote,
  type HintMode,
  type SecretKind,
} from "@/features/imposter/engine";
import { CHARACTER_BY_KEY, SERIES_BY_KEY } from "@/data";
import { seeded } from "@/lib/random";

const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i}`);

describe("imposter setup", () => {
  it("dedupes names", () => {
    expect(cleanNames(["Ash", "ash", "", "Kai"])).toEqual(["Ash", "ash 2", "P3", "Kai"]);
  });

  it("character mode + similar hint gives imposters a related character", () => {
    const s = createImposterGame({ ...DEFAULT_IMPOSTER_CONFIG, names: names(5), hint: "similar" }, [], seeded(2));
    const imp = s.imposters[0];
    const card = cardFor(s, imp);
    expect(card.role).toBe("imposter");
    if (card.role === "imposter" && card.hint?.type === "similar") {
      expect(card.hint.secret.key).not.toBe(s.secret.key);
      const c = CHARACTER_BY_KEY[s.secret.key];
      expect([...c.similar, ...Object.keys(CHARACTER_BY_KEY)]).toContain(card.hint.secret.key);
    } else throw new Error("expected similar hint");
    const crew = [0, 1, 2, 3, 4].find((i) => i !== imp)!;
    expect(cardFor(s, crew)).toEqual({ role: "crew", secret: s.secret });
  });

  it("series mode + clue gives a clue from that series", () => {
    const s = createImposterGame(
      { ...DEFAULT_IMPOSTER_CONFIG, names: names(4), secret: "series", hint: "clue" },
      [],
      seeded(9),
    );
    expect(s.secret.kind).toBe("series");
    expect(SERIES_BY_KEY[s.secret.key].clues).toContain(s.clue);
  });

  it("undercover imposters see a different secret and no imposter label", () => {
    const s = createImposterGame({ ...DEFAULT_IMPOSTER_CONFIG, names: names(6), hint: "undercover" }, [], seeded(4));
    const card = cardFor(s, s.imposters[0]);
    expect(card.role).toBe("undercover");
    if (card.role === "undercover") expect(card.secret.key).not.toBe(s.secret.key);
  });

  it("respects the series pool", () => {
    for (let i = 0; i < 30; i++) {
      const s = createImposterGame({ ...DEFAULT_IMPOSTER_CONFIG, names: names(4), series: ["jjk"] }, [], seeded(i));
      expect(CHARACTER_BY_KEY[s.secret.key].series).toBe("jjk");
    }
  });
});

describe("imposter flow", () => {
  it("speaking order skips eliminated players", () => {
    let s = createImposterGame({ ...DEFAULT_IMPOSTER_CONFIG, names: names(5) }, [], seeded(1));
    s = { ...s, starter: 3, alive: [true, false, true, true, true] };
    expect(speakingOrder(s)).toEqual([3, 4, 0, 2]);
  });

  it("caught imposter can steal the win by guessing", () => {
    let s = createImposterGame({ ...DEFAULT_IMPOSTER_CONFIG, names: names(5) }, [], seeded(3));
    for (let i = 0; i < 5; i++) s = revealNext(s);
    s = eliminate(startVote(s), s.imposters[0]);
    s = afterVote(s, seeded(1));
    expect(s.phase).toBe("guess");
    expect(s.guessOptions).toHaveLength(6);
    expect(new Set(s.guessOptions).size).toBe(6);
    expect(s.guessOptions).toContain(s.secret.key);
    const won = guess(s, s.secret.key);
    expect(won).toMatchObject({ phase: "end", winner: "imposters", how: "guessed" });
    const lost = guess(s, s.guessOptions.find((k) => k !== s.secret.key)!);
    expect(lost).toMatchObject({ phase: "end", winner: "crew", how: "caught" });
  });

  it("random games always end correctly (every size, mode and hint)", () => {
    let games = 0;
    for (let n = 3; n <= 15; n++)
      for (let k = 1; k <= maxImposters(n); k++)
        for (const secret of ["character", "series"] as SecretKind[])
          for (const hint of ["similar", "clue", "none", "undercover"] as HintMode[]) {
            const rng = seeded(n * 100 + k * 10 + games);
            let s = createImposterGame({ ...DEFAULT_IMPOSTER_CONFIG, names: names(n), imposters: k, secret, hint }, [], rng);
            expect(s.imposters).toHaveLength(k);
            for (let i = 0; i < n; i++) s = revealNext(s);
            let guard = 0;
            while (s.phase !== "end" && guard++ < 100) {
              if (s.phase === "discuss") s = startVote(s);
              else if (s.phase === "vote") {
                if (rng() < 0.1) s = skipVote(s);
                else {
                  const alive = aliveIndexes(s);
                  s = eliminate(s, alive[Math.floor(rng() * alive.length)]);
                }
              } else if (s.phase === "voted") s = afterVote(s, rng);
              else if (s.phase === "guess") s = guess(s, s.guessOptions[Math.floor(rng() * 6)]);
            }
            expect(s.phase).toBe("end");
            const alive = aliveIndexes(s);
            const impsAlive = alive.filter((i) => s.imposters.includes(i)).length;
            if (s.how === "caught") expect(impsAlive).toBe(0);
            if (s.how === "outnumbered") expect(impsAlive).toBeGreaterThanOrEqual(alive.length - impsAlive);
            games++;
          }
    expect(games).toBeGreaterThan(200);
  });
});
