import { AppShell } from "@/components/app-shell";
import { ReleasesView } from "@/components/releases-view";
import { readArchive } from "@/lib/archive-data";
import { toArchiveView } from "@/lib/archive-view";

export default function ReleasesPage() {
  return (
    <AppShell
      title="Release rainbow"
      subtitle="Every matched drop, dressed like it belongs at a birthday party."
    >
      <ReleasesView initial={toArchiveView(readArchive())} />
    </AppShell>
  );
}
