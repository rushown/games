import type { Metadata } from "next";
import ImposterGame from "@/features/imposter/ImposterGame";

export const metadata: Metadata = { title: "Imposter" };

export default function Page() {
  return <ImposterGame />;
}
