import { AppShell } from "@/components/app-shell";
import { SettingsView } from "@/components/settings-view";
import { readArchive } from "@/lib/archive-data";
import { toArchiveView } from "@/lib/archive-view";

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings & glitter"
      subtitle="Knobs from the environment. No secret sauce spilled."
    >
      <SettingsView initial={toArchiveView(readArchive())} />
    </AppShell>
  );
}
