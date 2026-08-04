import { cn } from "@/lib/utils";

interface TagChipsProps {
  tags?: string[] | null;
  className?: string;
  size?: "sm" | "xs";
  onClick?: (tag: string) => void;
}

export function TagChips({ tags, className, size = "sm", onClick }: TagChipsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          onClick={onClick ? () => onClick(tag) : undefined}
          className={cn(
            "inline-flex items-center rounded-full bg-primary/10 text-primary font-medium",
            "border border-primary/20",
            size === "xs" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
            onClick && "cursor-pointer hover:bg-primary/20 transition-colors"
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
