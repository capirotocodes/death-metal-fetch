import { AppShell } from "@/components/app-shell";
import { ReleasesView } from "@/components/releases-view";
import { getPublicStatus } from "@/lib/config";
import { countReleases, countUnseen, listReleases } from "@/lib/db";
import { toReleaseDTO } from "@/lib/releases";

export const dynamic = "force-dynamic";

export default function ReleasesPage() {
  const status = getPublicStatus();
  const releases = listReleases(200).map(toReleaseDTO);
  const unseenCount = countUnseen();

  return (
    <AppShell
      title="Release rainbow"
      subtitle="Every matched drop, dressed like it belongs at a birthday party."
      initialUnseen={unseenCount}
    >
      <ReleasesView
        initial={{
          count: countReleases(),
          unseenCount,
          callmebotConfigured: status.callmebotConfigured,
          releases,
        }}
      />
    </AppShell>
  );
}
