import { AppShell } from "@/components/app-shell";
import { HighlightsView } from "@/components/highlights-view";
import { readArchive } from "@/lib/archive-data";
import { toArchiveView } from "@/lib/archive-view";

export default function HighlightsPage() {
  return (
    <AppShell
      title="All highlights"
      subtitle="Every release you starred, newest pick first."
    >
      <HighlightsView initial={toArchiveView(readArchive())} />
    </AppShell>
  );
}
