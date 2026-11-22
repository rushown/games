import type { Metadata } from "next";
import RosterView from "@/features/roster/RosterView";

export const metadata: Metadata = { title: "Roster" };

export default function Page() {
  return <RosterView />;
}
