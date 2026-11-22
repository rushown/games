/**
 * Single-file preview of the app (no Next.js server): same components, hash routing.
 * Build with `npm run build:preview` → preview/dist/index.html
 */
import "@fontsource/dela-gothic-one/latin-400.css";
import "@fontsource/zen-kaku-gothic-new/latin-400.css";
import "@fontsource/zen-kaku-gothic-new/latin-700.css";
import "@fontsource/zen-kaku-gothic-new/latin-900.css";
import "@fontsource/space-mono/latin-700.css";
import "@/app/globals.css";
import { createRoot } from "react-dom/client";
import AppShell from "@/components/AppShell";
import HomeView from "@/features/home/HomeView";
import AuctionGame from "@/features/auction/AuctionGame";
import ChooseGame from "@/features/choose/ChooseGame";
import ImposterGame from "@/features/imposter/ImposterGame";
import RosterView from "@/features/roster/RosterView";
import { usePathname } from "./shims/navigation";

const ROUTES: Record<string, () => React.ReactNode> = {
  "/": () => <HomeView />,
  "/draft": () => <AuctionGame />,
  "/choose": () => <ChooseGame />,
  "/imposter": () => <ImposterGame />,
  "/roster": () => <RosterView />,
};

function App() {
  const path = usePathname();
  const View = ROUTES[path] ?? ROUTES["/"];
  return (
    <AppShell>
      <View key={path} />
    </AppShell>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
