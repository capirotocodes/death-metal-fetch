import { AppShell } from "@/components/app-shell";
import { SettingsView } from "@/components/settings-view";
import { getPublicStatus } from "@/lib/config";
import { countReleases, countUnseen, getMeta } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const status = getPublicStatus();
  const unseenCount = countUnseen();

  return (
    <AppShell
      title="Settings & glitter"
      subtitle="Knobs from the environment. No secret sauce spilled."
      initialUnseen={unseenCount}
    >
      <SettingsView
        initial={{
          ...status,
          count: countReleases(),
          lastPollAt: getMeta("lastPollAt"),
        }}
      />
    </AppShell>
  );
}
