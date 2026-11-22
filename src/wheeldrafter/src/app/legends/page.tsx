import type { Metadata } from "next";
import LegendsView from "@/features/legends/LegendsView";

export const metadata: Metadata = { title: "Hall of Legends" };

export default function Page() {
  return <LegendsView />;
}
