"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BASE_PATH } from "@/lib/base-path";
import { relativeTime, releaseHeading } from "@/lib/format";
import type { ReleaseDTO } from "@/lib/releases";
import { cn } from "@/lib/utils";
import { ExternalLink, Eye } from "lucide-react";

type Props = {
  release: ReleaseDTO;
  onMarkSeen?: (uri: string) => void;
  compact?: boolean;
};

export function ReleaseCard({ release, onMarkSeen, compact }: Props) {
  const heading = releaseHeading(release);
  const when = relativeTime(release.postedAt ?? release.createdAt);
  const unread = !release.seen;

  return (
    <article
      className={cn(
        "release-card",
        unread && "release-card-new",
        compact && "release-card-compact",
      )}
    >
      <div className="release-card-body">
        {release.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Bluesky CDN thumbs; plain img keeps PWA/mobile simple
          <img
            className="release-cover"
            src={
              release.coverUrl.startsWith("http")
                ? release.coverUrl
                : `${BASE_PATH}/${release.coverUrl}`
            }
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="release-cover release-cover-empty" aria-hidden>
            🦄
          </div>
        )}

        <div className="release-card-main">
          <div className="release-card-top">
            <div className="release-card-titles">
              <h2>{heading}</h2>
              <time dateTime={release.postedAt ?? release.createdAt}>
                {when}
              </time>
            </div>
            {unread ? <span className="new-badge">NEW 🦄</span> : null}
          </div>

          <div className="genre-row">
            {release.genres.map((g) => (
              <Badge key={g} variant="secondary" className="genre-chip">
                {g}
              </Badge>
            ))}
            {release.hasReleaseCue ? (
              <Badge variant="outline" className="cue-chip">
                sounds like a drop
              </Badge>
            ) : null}
          </div>

          {!compact ? (
            <p className="release-text">{release.text}</p>
          ) : (
            <p className="release-text release-text-snip">
              {release.text.length > 120
                ? `${release.text.slice(0, 119)}…`
                : release.text}
            </p>
          )}

          <div className="release-actions">
            <a
              className="bsky-link"
              href={release.bskyUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink aria-hidden className="size-3.5" />
              {release.source === "deathgrind" ? "DeathGrind" : "Bluesky"}
            </a>
            {unread && onMarkSeen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="seen-btn"
                onClick={() => onMarkSeen(release.uri)}
              >
                <Eye aria-hidden className="size-3.5" />
                Mark seen
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
