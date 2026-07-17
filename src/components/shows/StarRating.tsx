import { useState, useCallback, useRef } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RatingIcon } from "@/lib/showRatingIcons";

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number | null) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  className?: string;
  icon?: RatingIcon;
}

const SIZE_PX: Record<NonNullable<StarRatingProps["size"]>, number> = {
  sm: 14,
  md: 20,
  lg: 28,
};

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false,
  className,
  icon: CustomIcon,
}: StarRatingProps) {
  const [hoverSegment, setHoverSegment] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [justRated, setJustRated] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const px = SIZE_PX[size];
  const currentSegments = value !== null ? Math.round(value * 2) : 0;
  const displaySegments = hoverSegment ?? currentSegments;

  // -------------------------------------------------------------------------
  // Pointer-based drag precision
  // -------------------------------------------------------------------------

  function getSegmentFromX(clientX: number): number {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const segment = Math.ceil((x / rect.width) * 10);
    return Math.max(1, Math.min(10, segment));
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (readOnly || !onChange) return;
    setIsDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const seg = getSegmentFromX(e.clientX);
    setHoverSegment(seg);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (readOnly || !onChange) return;
    if (!isDragging && hoverSegment !== null) return;
    const seg = getSegmentFromX(e.clientX);
    setHoverSegment(seg);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (readOnly || !onChange) return;
    setIsDragging(false);
    const seg = getSegmentFromX(e.clientX);

    // Clicking the same segment as current rating clears it
    if (currentSegments === seg) {
      onChange(null);
      setJustRated(null);
    } else {
      const newRating = seg / 2;
      onChange(newRating);
      setJustRated(seg);
      // Clear the pop animation after it plays
      setTimeout(() => setJustRated(null), 300);
    }
    setHoverSegment(null);
  }

  function handlePointerEnter() {
    if (readOnly) return;
    // Start hover tracking even without drag
  }

  function handlePointerLeave() {
    if (readOnly) return;
    if (!isDragging) {
      setHoverSegment(null);
    }
  }

  // -------------------------------------------------------------------------
  // Click fallback for non-pointer devices
  // -------------------------------------------------------------------------

  const handleClick = useCallback(
    (segment: number) => {
      if (readOnly || !onChange || isDragging) return;

      if (currentSegments === segment) {
        onChange(null);
        setJustRated(null);
      } else {
        const newRating = segment / 2;
        onChange(newRating);
        setJustRated(segment);
        setTimeout(() => setJustRated(null), 300);
      }
    },
    [readOnly, onChange, isDragging, currentSegments]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center gap-0.5 select-none",
        readOnly ? "cursor-default" : "cursor-pointer",
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      role={readOnly ? undefined : "slider"}
      aria-valuetext={value !== null ? `${value} out of 5 stars` : "not rated"}
      aria-valuemin={0}
      aria-valuemax={5}
    >
      {Array.from({ length: 5 }).map((_, starIdx) => {
        const leftSegment = starIdx * 2 + 1;
        const rightSegment = starIdx * 2 + 2;
        const leftFilled = displaySegments >= leftSegment;
        const rightFilled = displaySegments >= rightSegment;

        // Pop animation on the segment that was just rated
        const leftPop = justRated === leftSegment;
        const rightPop = justRated === rightSegment;

        return (
          <div
            key={starIdx}
            className="relative inline-flex"
            style={{ width: px, height: px }}
          >
            {/* Base icon (outline / empty) */}
            {CustomIcon ? (
              <CustomIcon
                filled={false}
                className="absolute inset-0 text-muted-foreground/30"
                style={{ width: px, height: px }}
              />
            ) : (
              <Star
                className="absolute inset-0 text-muted-foreground/30"
                strokeWidth={1.5}
                style={{ width: px, height: px }}
              />
            )}

            {/* Left half overlay */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: px / 2 }}
              onClick={() => handleClick(leftSegment)}
            >
              {CustomIcon ? (
                <CustomIcon
                  filled={leftFilled}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-150",
                    leftPop && "pb-star-pop"
                  )}
                  style={{ width: px, height: px }}
                />
              ) : (
                <Star
                  className={cn(
                    "absolute inset-0 transition-colors duration-150",
                    leftFilled
                      ? cn(
                          "text-rating fill-rating",
                          leftPop && "pb-star-pop"
                        )
                      : "text-transparent"
                  )}
                  strokeWidth={1.5}
                  style={{ width: px, height: px }}
                />
              )}
            </div>

            {/* Right half overlay */}
            <div
              className="absolute top-0 overflow-hidden"
              style={{ width: px / 2, left: px / 2, height: px }}
              onClick={() => handleClick(rightSegment)}
            >
              {CustomIcon ? (
                <CustomIcon
                  filled={rightFilled}
                  className={cn(
                    "absolute top-0 transition-opacity duration-150",
                    rightPop && "pb-star-pop"
                  )}
                  style={{ width: px, height: px, left: -(px / 2) }}
                />
              ) : (
                <Star
                  className={cn(
                    "absolute top-0 transition-colors duration-150",
                    rightFilled
                      ? cn(
                          "text-rating fill-rating",
                          rightPop && "pb-star-pop"
                        )
                      : "text-transparent"
                  )}
                  strokeWidth={1.5}
                  style={{ width: px, height: px, left: -(px / 2) }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
