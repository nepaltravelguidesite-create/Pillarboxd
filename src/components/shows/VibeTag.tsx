import { cn } from "@/lib/utils";

export type VibeTagValue = "skip_it" | "timepass" | "go_for_it" | "perfection";

export const VIBE_TAGS: { value: VibeTagValue; label: string; color: string; bg: string; text: string }[] = [
  { value: "skip_it", label: "Skip It", color: "#E5484D", bg: "bg-destructive/15", text: "text-destructive" },
  { value: "timepass", label: "Timepass", color: "#D4A84B", bg: "bg-chart-4/15", text: "text-chart-4" },
  { value: "go_for_it", label: "Go For It", color: "#5EB8B0", bg: "bg-chart-3/15", text: "text-chart-3" },
  { value: "perfection", label: "Perfection", color: "#E9A6A6", bg: "bg-primary/15", text: "text-primary" },
];

export function getVibeTagMeta(value: string | null | undefined) {
  return VIBE_TAGS.find((t) => t.value === value) ?? null;
}

interface VibeTagPickerProps {
  value: VibeTagValue | null;
  onChange: (value: VibeTagValue | null) => void;
}

export function VibeTagPicker({ value, onChange }: VibeTagPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {VIBE_TAGS.map((tag) => {
        const selected = value === tag.value;
        return (
          <button
            key={tag.value}
            type="button"
            onClick={() => onChange(selected ? null : tag.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
              "border hover:-translate-y-px active:translate-y-0",
              selected
                ? cn(tag.bg, tag.text, "border-transparent")
                : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
            )}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}

export function VibeTagBadge({ value }: { value: string | null | undefined }) {
  const meta = getVibeTagMeta(value);
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
        meta.bg,
        meta.text
      )}
    >
      {meta.label}
    </span>
  );
}
