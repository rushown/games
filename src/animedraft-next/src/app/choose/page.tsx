import type { Metadata } from "next";
import ChooseGame from "@/features/choose/ChooseGame";

export const metadata: Metadata = { title: "Choose Duel" };

export default function Page() {
  return <ChooseGame />;
}
