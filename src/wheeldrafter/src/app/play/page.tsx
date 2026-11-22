import type { Metadata } from "next";
import PlayView from "@/features/game/PlayView";

export const metadata: Metadata = { title: "Spin" };

export default function Page() {
  return <PlayView />;
}
