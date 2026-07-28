import { useState } from "react";
import { Play, Check, CircleX } from "lucide-react";
import { type TVShow } from "@/lib/tmdb";
import { type WatchStatus, useUserData } from "@/context/UserDataContext";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const STATUS_OPTIONS: { label: string; value: WatchStatus; icon: typeof Play }[] = [
  { label: "Watching", value: "watching", icon: Play },
  { label: "Finished", value: "completed", icon: Check },
  { label: "Dropped", value: "dropped", icon: CircleX },
];

const STATUS_ICONS: Partial<Record<WatchStatus, typeof Play>> = {
  watching: Play,
  completed: Check,
  dropped: CircleX,
};

export function statusBadgeIcon(status: WatchStatus | null): typeof Play | null {
  return status ? STATUS_ICONS[status] ?? null : null;
}

export function StatusBadge({ status, className }: { status: WatchStatus | null; className?: string }) {
  const Icon = statusBadgeIcon(status);
  if (!Icon) return null;
  const colors: Partial<Record<WatchStatus, string>> = {
    watching: "bg-primary/90 text-primary-foreground",
    completed: "bg-emerald-500/90 text-white",
    dropped: "bg-muted-foreground/70 text-background",
  };
  const colorClass = status ? colors[status] : undefined;
  return (
    <div className={cn("absolute top-1.5 left-1.5 z-10 flex items-center justify-center size-5 rounded-full backdrop-blur-sm", colorClass, className)}>
      <Icon className="size-3" strokeWidth={2.5} fill="currentColor" />
    </div>
  );
}

export function StatusSelectPopover({
  show,
  children,
  align = "center",
  className,
}: {
  show: TVShow;
  children: React.ReactNode;
  align?: "center" | "start" | "end";
  className?: string;
}) {
  const { setShowStatus, getShowData } = useUserData();
  const { openAuthModal } = useUI();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const currentStatus = getShowData(show.id)?.status ?? null;

  function handleSelect(status: WatchStatus) {
    if (!user) {
      openAuthModal("signin");
      return;
    }
    setShowStatus(show, currentStatus === status ? null : status);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className={className}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-1.5">
        <div className="flex flex-col gap-0.5">
          {STATUS_OPTIONS.map((opt) => {
            const active = currentStatus === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(opt.value);
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60"
                )}
              >
                <Icon
                  className="size-4"
                  strokeWidth={2.5}
                  fill={active ? "currentColor" : "none"}
                />
                {opt.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function StatusSegmentedControl({
  show,
  className,
}: {
  show: TVShow;
  className?: string;
}) {
  const { setShowStatus, getShowData } = useUserData();
  const { openAuthModal } = useUI();
  const { user } = useAuth();
  const currentStatus = getShowData(show.id)?.status ?? null;

  function handleClick(status: WatchStatus) {
    if (!user) {
      openAuthModal("signin");
      return;
    }
    setShowStatus(show, currentStatus === status ? null : status);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border/50 bg-secondary/40 p-0.5",
        className
      )}
    >
      {STATUS_OPTIONS.map((opt) => {
        const active = currentStatus === opt.value;
        const Icon = opt.icon;
        const colors: Record<WatchStatus, string> = {
          watching: "bg-primary text-primary-foreground",
          completed: "bg-emerald-500 text-white",
          dropped: "bg-muted-foreground text-background",
          want_to_watch: "",
          on_hold: "",
        };
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleClick(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              active
                ? colors[opt.value]
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" strokeWidth={2.5} fill={active ? "currentColor" : "none"} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
