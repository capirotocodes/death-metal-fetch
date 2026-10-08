/** Per-device choice of which site's releases to show (localStorage), shared by Home and Releases. */

import { useEffect, useState } from "react";

export type SourceFilter = "all" | "bluesky" | "deathgrind";

export const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bluesky", label: "Kman" },
  { value: "deathgrind", label: "DeathGrind" },
];

const KEY = "dmf:source";

export function filterBySource<T extends { source?: "bluesky" | "deathgrind" }>(
  releases: T[],
  filter: SourceFilter,
): T[] {
  if (filter === "all") return releases;
  // Rows stored before `source` existed are all Bluesky.
  return releases.filter((r) => (r.source ?? "bluesky") === filter);
}

function readFilter(): SourceFilter {
  try {
    const v = localStorage.getItem(KEY);
    return SOURCE_OPTIONS.some((o) => o.value === v) ? (v as SourceFilter) : "all";
  } catch {
    return "all";
  }
}

export function useSourceFilter(): [SourceFilter, (f: SourceFilter) => void] {
  const [filter, setFilter] = useState<SourceFilter>("all");
  useEffect(() => {
    const sync = () => setFilter(readFilter());
    sync();
    window.addEventListener("dmf:source", sync);
    return () => window.removeEventListener("dmf:source", sync);
  }, []);
  const choose = (f: SourceFilter) => {
    setFilter(f);
    try {
      localStorage.setItem(KEY, f);
    } catch {
      /* storage blocked: keep in-memory choice */
    }
    window.dispatchEvent(new CustomEvent("dmf:source"));
  };
  return [filter, choose];
}
