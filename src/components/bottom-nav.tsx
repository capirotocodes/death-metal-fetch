"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Home, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/releases", label: "Releases", icon: Archive },
  { href: "/settings", label: "Settings", icon: Sparkles },
] as const;

type Props = {
  unseenCount?: number;
};

export function BottomNav({ unseenCount = 0 }: Props) {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        const showBadge = href === "/releases" && unseenCount > 0;
        return (
          <Link
            key={href}
            href={href}
            className={cn("nav-tab", active && "nav-tab-active")}
            aria-current={active ? "page" : undefined}
          >
            <span className="nav-icon-wrap">
              <Icon aria-hidden className="nav-icon" strokeWidth={active ? 2.4 : 2} />
              {showBadge ? (
                <span className="nav-badge" aria-label={`${unseenCount} unread`}>
                  {unseenCount > 99 ? "99+" : unseenCount}
                </span>
              ) : null}
            </span>
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
