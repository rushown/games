import type { Metadata } from "next";
import AuctionGame from "@/features/auction/AuctionGame";

export const metadata: Metadata = { title: "Draft Duel" };

export default function Page() {
  return <AuctionGame />;
}
