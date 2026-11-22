import { NextResponse } from "next/server";
import { BAKED_IMAGES, CHARACTERS, SERIES } from "@/data";

/** GET /api/characters: the full character + series database as JSON. */
export function GET() {
  return NextResponse.json({
    series: SERIES.map((s) => ({ ...s, cover: BAKED_IMAGES.series[s.key] ?? null })),
    characters: CHARACTERS.map((c) => ({ ...c, portrait: BAKED_IMAGES.characters[c.key] ?? null })),
  });
}
