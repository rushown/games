/**
 * Single-file build of WheelDrafter (no Next.js server): same components, hash routing.
 * `npm run build:preview` → preview/dist/index.html
 */
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "@fontsource/geist-sans/latin-400.css";
import "@fontsource/geist-sans/latin-500.css";
import "@fontsource/geist-sans/latin-600.css";
import "@fontsource/geist-mono/latin-400.css";
import "@fontsource/geist-mono/latin-500.css";
import "@/app/globals.css";
import { createRoot } from "react-dom/client";
import AppShell from "@/components/AppShell";
import HomeView from "@/features/home/HomeView";
import PlayView from "@/features/game/PlayView";
import LegendsView from "@/features/legends/LegendsView";
import { usePathname } from "./shims/navigation";

const ROUTES: Record<string, () => React.ReactNode> = {
  "/": () => <HomeView />,
  "/play": () => <PlayView />,
  "/legends": () => <LegendsView />,
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
