"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { clearConfetti } from "@/lib/fx";
import s from "./AppShell.module.css";

const NAV = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/draft", label: "Draft", icon: "💰" },
  { href: "/choose", label: "Choose", icon: "⚔️" },
  { href: "/imposter", label: "Imposter", icon: "🕵️" },
  { href: "/roster", label: "Roster", icon: "📖" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  useEffect(() => {
    clearConfetti();
    window.scrollTo(0, 0);
  }, [path]);

  return (
    <>
      <header className={s.top}>
        <div className={`wrap ${s.bar}`}>
          <div className={s.side}>
            {/* a plain <a>: the arcade lives outside this app's basePath, so next/link would rewrite it */}
            <a className={s.arcade} href="/games#games" aria-label="All games">
              <span className={s.arcadeMark} aria-hidden>
                RA
              </span>
              <span aria-hidden>
                ←<span className={s.arcadeText}> All games</span>
              </span>
            </a>
            <Link className={s.logo} href="/">
              <span className={s.mark}>ア</span>ANIME<b>DRAFT</b>
            </Link>
          </div>
          <nav className={s.desk} aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={isActive(n.href) ? s.on : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className={s.main}>
        <div className="wrap">{children}</div>
      </main>
      <nav className={s.tabs} aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={isActive(n.href) ? s.on : undefined}>
            <span className={s.icon} aria-hidden>
              {n.icon}
            </span>
            {n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
