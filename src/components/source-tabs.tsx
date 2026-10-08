"use client";

import { Button } from "@/components/ui/button";
import { SOURCE_OPTIONS, type SourceFilter } from "@/lib/source-filter";

type Props = {
  value: SourceFilter;
  onChange: (f: SourceFilter) => void;
};

export function SourceTabs({ value, onChange }: Props) {
  return (
    <div className="source-tabs" role="group" aria-label="Show releases from">
      {SOURCE_OPTIONS.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          variant={value === o.value ? "default" : "outline"}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
