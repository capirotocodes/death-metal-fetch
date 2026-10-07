"use client";

import { Badge } from "@/components/ui/badge";
import type { ArchiveView } from "@/lib/archive-view";
import { formatPollInterval } from "@/lib/format";

type Props = {
  initial: ArchiveView;
};

export function SettingsView({ initial }: Props) {
  return (
    <div className="stack">
      <section className="settings-card">
        <h2>CallMeBot WhatsApp</h2>
        <p className="muted">
          When a brand-new blast-beat lands in the archive, a unicorn tries to
          text you. Delivery may be fashionably late — like a festival set time.
        </p>
        <dl className="kv">
          <div>
            <dt>Status</dt>
            <dd>
              {initial.alertsEnabled ? (
                <span className="pill-ok">Configured ✨</span>
              ) : (
                <span className="pill-warn">Dry-run (logs only)</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="settings-card">
        <h2>Poll rhythm</h2>
        <p className="muted">
          How often we gallop over to Bluesky and sniff{" "}
          <span className="mono">@{initial.handle}</span>.
        </p>
        <dl className="kv">
          <div>
            <dt>Interval</dt>
            <dd>about every {formatPollInterval(initial.pollIntervalMs)}</dd>
          </div>
          <div>
            <dt>Runs on</dt>
            <dd>GitHub Actions schedule</dd>
          </div>
        </dl>
      </section>

      <section className="settings-card">
        <h2>Genres we idolize</h2>
        <p className="muted">
          Real keywords. Fake emotional support animal energy.
        </p>
        <div className="genre-row">
          {initial.genres.map((g) => (
            <Badge key={g} variant="secondary" className="genre-chip">
              {g}
            </Badge>
          ))}
        </div>
      </section>

      <section className="settings-card silly-note">
        <h2>Why is this so cute?</h2>
        <p className="muted">
          Because staring at a black void while waiting for grindcore news is
          already metal enough. The unicorn is free. The riffs are not.
        </p>
        <p className="muted tiny">
          Tip: Add to Home Screen from your phone browser for the full
          “app that shouldn’t exist” experience.
        </p>
      </section>
    </div>
  );
}
