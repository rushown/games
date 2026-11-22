/** Preview-only stand-in for next/link: turns "/draft" into "#/draft" hash routes. */
import type { AnchorHTMLAttributes, ReactNode } from "react";

export const toHash = (href: string) => (href === "/" ? "#home" : `#${href.replace(/^\//, "")}`);

export default function Link({ href, children, ...rest }: { href: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={toHash(href)} {...rest}>
      {children}
    </a>
  );
}
