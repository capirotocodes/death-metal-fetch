"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { SparkleBurst, UnicornMark } from "@/components/unicorn-deco";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  initialUnseen?: number;
};

export function AppShell({
  title,
  subtitle,
  children,
  initialUnseen = 0,
}: Props) {
  const [unseen, setUnseen] = useState(initialUnseen);

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { unseenCount?: number };
        if (typeof json.unseenCount === "number") setUnseen(json.unseenCount);
      } catch {
        /* ignore */
      }
    };
    refresh();
    const id = setInterval(refresh, 30_000);
    const onSeen = (e: Event) => {
      const detail = (e as CustomEvent<{ unseenCount?: number }>).detail;
      if (typeof detail?.unseenCount === "number") setUnseen(detail.unseenCount);
      else refresh();
    };
    window.addEventListener("dmf:seen", onSeen);
    return () => {
      clearInterval(id);
      window.removeEventListener("dmf:seen", onSeen);
    };
  }, []);

  return (
    <div className="phone-frame">
      <div className="rainbow-bar" aria-hidden />
      <SparkleBurst />
      <header className="app-header">
        <div className="brand-row">
          <UnicornMark className="brand-mark" />
          <div>
            <p className="brand-name">Death Metal Fetch</p>
            <p className="brand-tag">brutality, but make it sparkly</p>
          </div>
        </div>
        <h1 className="screen-title">{title}</h1>
        {subtitle ? <p className="screen-sub">{subtitle}</p> : null}
      </header>
      <main className="app-main">{children}</main>
      <BottomNav unseenCount={unseen} />
    </div>
  );
}
