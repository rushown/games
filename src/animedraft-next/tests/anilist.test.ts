import { describe, expect, it } from "vitest";
import { buildQuery, characterLookup, parseResponse, seriesLookup } from "@/lib/anilist";
import { CHARACTER_BY_KEY, SERIES_BY_KEY } from "@/data";

const simon = characterLookup(CHARACTER_BY_KEY.simon, SERIES_BY_KEY.gl);
const power = characterLookup(CHARACTER_BY_KEY.power, SERIES_BY_KEY.csm);
const jjk = seriesLookup(SERIES_BY_KEY.jjk);

describe("AniList batching + matching", () => {
  it("builds one aliased query for several lookups", () => {
    const q = buildQuery([simon, power, jjk]);
    expect(q).toContain('q0: Page(perPage: 10) { characters(search: "Simon")');
    expect(q).toContain('q2: Page(perPage: 5) { media(search: "Jujutsu Kaisen", type: ANIME)');
  });

  it("skips same-name characters from other series", () => {
    const res = parseResponse([simon, power], {
      q0: {
        characters: [
          { id: 1, image: { large: "wrong.jpg" }, media: { nodes: [{ title: { romaji: "Some Other Show", english: null } }] } },
          { id: 2, image: { large: "simon.jpg" }, media: { nodes: [{ title: { romaji: "Tengen Toppa Gurren Lagann", english: null } }] } },
        ],
      },
      q1: { characters: [{ id: 3, image: { large: "x.jpg" }, media: { nodes: [{ title: { romaji: "Unrelated", english: "Unrelated" } }] } }] },
    });
    expect(res["c:simon"]).toEqual({ anilistId: 2, image: "simon.jpg" });
    expect(res["c:power"]).toBeNull();
  });

  it("returns series cover + banner", () => {
    const res = parseResponse([jjk], {
      q0: {
        media: [
          {
            id: 113415,
            title: { romaji: "Jujutsu Kaisen", english: "JUJUTSU KAISEN" },
            coverImage: { extraLarge: "cover-xl.jpg", large: "cover-l.jpg" },
            bannerImage: "banner.jpg",
          },
        ],
      },
    });
    expect(res["s:jjk"]).toEqual({ anilistId: 113415, image: "cover-xl.jpg", banner: "banner.jpg" });
  });
});
