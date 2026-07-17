import { Link } from "react-router-dom";
import { Heart, List as ListIcon } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import type { ShowList } from "@/context/SocialContext";

interface MobileListCardProps {
  list: ShowList;
  curatorName: string;
  curatorAvatarUrl?: string | null;
  posterPaths: (string | null)[];
  isLiked?: boolean;
  className?: string;
}

export function MobileListCard({
  list,
  curatorName,
  curatorAvatarUrl,
  posterPaths,
  isLiked,
  className,
}: MobileListCardProps) {
  // Show up to 3 overlapping poster thumbnails
  const thumbs = posterPaths.slice(0, 3);

  return (
    <Link
      to={`/lists/${list.id}`}
      className={cn(
        "block w-44 shrink-0 rounded-xl border border-border/50 bg-card overflow-hidden",
        "shadow-sm shadow-black/20 transition-all duration-200",
        "hover:border-border hover:shadow-md hover:shadow-black/30",
        className
      )}
    >
      {/* Overlapping poster stack */}
      <div className="relative h-28 bg-secondary/40 overflow-hidden">
        {thumbs.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <ListIcon className="size-8" />
          </div>
        )}
        {thumbs.map((path, i) => {
          const offsets = [
            { left: "8%", z: 3, w: "60%" },
            { left: "24%", z: 2, w: "56%" },
            { left: "40%", z: 1, w: "52%" },
          ];
          const cfg = offsets[i] || offsets[2];
          return (
            <img
              key={i}
              src={posterUrl(path, "w185")}
              alt=""
              className="absolute top-0 h-full object-cover rounded-sm shadow-md"
              style={{
                left: cfg.left,
                zIndex: cfg.z,
                width: cfg.w,
              }}
              loading="lazy"
            />
          );
        })}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1">
          {list.title}
        </h3>

        {/* Curator */}
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded-full bg-secondary border border-border/40 overflow-hidden shrink-0">
            {curatorAvatarUrl && (
              <img
                src={curatorAvatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate">{curatorName}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart
              className={cn("size-3", isLiked && "fill-rating text-rating")}
            />
            {list.like_count}
          </span>
          <span className="flex items-center gap-1">
            <ListIcon className="size-3" />
            {list.item_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
