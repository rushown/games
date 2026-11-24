import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "@fontsource/geist-sans/latin-400.css";
import "@fontsource/geist-sans/latin-500.css";
import "@fontsource/geist-sans/latin-600.css";
import "@fontsource/geist-mono/latin-400.css";
import "@fontsource/geist-mono/latin-500.css";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "WheelDrafter", template: "%s · WheelDrafter" },
  description: "Spin the wheels of fate to build a one-of-a-kind legend: race, power, speed, up to six powers, a backstory and an exact rarity rating.",
  applicationName: "WheelDrafter",
  openGraph: {
    title: "WheelDrafter",
    description: "Spin the wheels of fate. Rare races tilt every wheel. Every combination is a unique legend.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#060606", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
