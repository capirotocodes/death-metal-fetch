import { AppShell } from "@/components/app-shell";
import { HomeView } from "@/components/home-view";
import { readArchive } from "@/lib/archive-data";
import { toArchiveView } from "@/lib/archive-view";

export default function HomePage() {
  return (
    <AppShell
      title="Home base"
      subtitle="Status, sparkles, and the three freshest riffs in the glitter vault."
    >
      <HomeView initial={toArchiveView(readArchive())} />
    </AppShell>
  );
}
