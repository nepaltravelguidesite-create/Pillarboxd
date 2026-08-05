import { useEffect, useRef, useState, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayCell {
  date: Date;
  count: number;
  col: number;
  row: number;
}

interface WatchActivityHeatmapProps {
  logs: { watched_date: string | null }[];
  className?: string;
}

const CELL = 13;
const GAP = 3;
const CELL_PLUS_GAP = CELL + GAP;
const ROWS = 7;
const WEEKS = 53;
const SNAKE_LENGTH = 4;
const LERP_SPEED = 0.12;
const EMPTY_SKIP_SPEED = 0.35;

function buildGrid(logs: { watched_date: string | null }[]): {
  cells: DayCell[];
  maxCount: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));
  while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

  const countMap = new Map<string, number>();
  for (const log of logs) {
    if (!log.watched_date) continue;
    const d = new Date(log.watched_date + "T00:00:00");
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const cells: DayCell[] = [];
  let maxCount = 0;
  for (let col = 0; col < WEEKS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const date = new Date(start);
      date.setDate(start.getDate() + col * 7 + row);
      if (date > today) continue;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const count = countMap.get(key) ?? 0;
      maxCount = Math.max(maxCount, count);
      cells.push({ date, count, col, row });
    }
  }
  return { cells, maxCount };
}

function intensityColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "rgba(148, 163, 184, 0.08)";
  const ratio = Math.min(count / maxCount, 1);
  const opacity = 0.25 + ratio * 0.75;
  return `rgba(239, 169, 169, ${opacity})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function WatchActivityHeatmap({
  logs,
  className,
}: WatchActivityHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [finished, setFinished] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const gridDataRef = useRef<{ cells: DayCell[]; maxCount: number } | null>(
    null,
  );
  const rafRef = useRef<number>(0);
  const reducedMotionRef = useRef(false);

  const { cells } = (() => {
    if (!gridDataRef.current) {
      gridDataRef.current = buildGrid(logs);
    }
    return gridDataRef.current;
  })();

  const activeCells = cells.filter((c) => c.count > 0);
  const hasActivity = activeCells.length > 0;

  const replay = useCallback(() => {
    gridDataRef.current = null;
    setFinished(false);
    setReplayKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!hasActivity) return;
    gridDataRef.current = buildGrid(logs);
    const grid = gridDataRef.current!;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gctx = ctx; // non-null reference for closures

    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const dpr = window.devicePixelRatio || 1;
    const w = WEEKS * CELL_PLUS_GAP;
    const h = ROWS * CELL_PLUS_GAP;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    gctx.scale(dpr, dpr);

    const gridCells = grid.cells;
    const maxC = grid.maxCount;
    const activeIndices: number[] = [];
    gridCells.forEach((c, i) => {
      if (c.count > 0) activeIndices.push(i);
    });
    if (activeIndices.length === 0) return;

    const eaten = new Set<number>();

    function drawCell(idx: number, color: string) {
      const cell = gridCells[idx];
      if (!cell) return;
      gctx.fillStyle = color;
      gctx.beginPath();
      gctx.roundRect(
        cell.col * CELL_PLUS_GAP,
        cell.row * CELL_PLUS_GAP,
        CELL,
        CELL,
        3,
      );
      gctx.fill();
    }

    function drawAll() {
      gctx.clearRect(0, 0, w, h);
      for (let i = 0; i < gridCells.length; i++) {
        const c = gridCells[i];
        if (eaten.has(i)) {
          drawCell(i, intensityColor(c.count, maxC));
        } else {
          drawCell(i, "rgba(148, 163, 184, 0.08)");
        }
      }
    }

    function drawSnake(x: number, y: number) {
      const SEGMENT_SPACING = CELL_PLUS_GAP * 1.05;
      const size = CELL;
      for (let s = 0; s < SNAKE_LENGTH; s++) {
        const sx = x - s * SEGMENT_SPACING;
        const sy = y;
        // Stepped color gradient: head brightest, body progressively darker
        const shade = s / (SNAKE_LENGTH - 1);
        const r = Math.round(239 - shade * 55);
        const g = Math.round(169 - shade * 45);
        const b = Math.round(169 - shade * 50);
        gctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        gctx.beginPath();
        gctx.roundRect(sx - size / 2, sy - size / 2, size, size, 3);
        gctx.fill();
      }
    }

    if (reducedMotionRef.current) {
      // Static fully-colored heatmap
      eaten.clear();
      activeIndices.forEach((i) => eaten.add(i));
      drawAll();
      setFinished(true);
      return;
    }

    // Animation: snake moves through active cells in chronological order
    eaten.clear();
    drawAll();

    let currentTargetIdx = 0;
    let snakeX = gridCells[activeIndices[0]].col * CELL_PLUS_GAP + CELL / 2;
    let snakeY = gridCells[activeIndices[0]].row * CELL_PLUS_GAP + CELL / 2;
    let lastEatenIdx = -1;
    let phase: "moving" | "resting" = "moving";
    let restTimer = 0;
    const REST_DURATION = 8;

    function animate() {
      if (currentTargetIdx >= activeIndices.length) {
        // Eat the last cell
        const lastIdx = activeIndices[activeIndices.length - 1];
        if (lastIdx !== lastEatenIdx) {
          eaten.add(lastIdx);
          lastEatenIdx = lastIdx;
        }
        drawAll();
        setFinished(true);
        return;
      }

      const targetCell = gridCells[activeIndices[currentTargetIdx]];
      const targetX = targetCell.col * CELL_PLUS_GAP + CELL / 2;
      const targetY = targetCell.row * CELL_PLUS_GAP + CELL / 2;

      if (phase === "resting") {
        restTimer++;
        if (restTimer >= REST_DURATION) {
          restTimer = 0;
          phase = "moving";
          currentTargetIdx++;
        }
        // Continue drawing
        drawAll();
        drawSnake(snakeX, snakeY);
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const dx = targetX - snakeX;
      const dy = targetY - snakeY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1.5) {
        // Arrived - eat the cell
        const cellIdx = activeIndices[currentTargetIdx];
        if (cellIdx !== lastEatenIdx) {
          eaten.add(cellIdx);
          lastEatenIdx = cellIdx;
        }
        snakeX = targetX;
        snakeY = targetY;
        phase = "resting";
        drawAll();
        drawSnake(snakeX, snakeY);
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Move towards target - speed depends on whether current cell is empty
      const speed = LERP_SPEED;

      // If we're transitioning through empty space (large gap), move faster
      const prevActiveIdx =
        currentTargetIdx > 0
          ? activeIndices[currentTargetIdx - 1]
          : activeIndices[0];
      const prevCell = gridCells[prevActiveIdx];
      const gap =
        Math.abs(targetCell.col - prevCell.col) +
        Math.abs(targetCell.row - prevCell.row);
      const effectiveSpeed = gap > 3 ? EMPTY_SKIP_SPEED : speed;

      snakeX = lerp(snakeX, targetX, effectiveSpeed);
      snakeY = lerp(snakeY, targetY, effectiveSpeed);

      // Eat cells we pass over
      for (let i = currentTargetIdx; i < activeIndices.length; i++) {
        const idx = activeIndices[i];
        const c = gridCells[idx];
        const cx = c.col * CELL_PLUS_GAP + CELL / 2;
        const cy = c.row * CELL_PLUS_GAP + CELL / 2;
        const d = Math.sqrt((cx - snakeX) ** 2 + (cy - snakeY) ** 2);
        if (d < CELL_PLUS_GAP * 0.6 && !eaten.has(idx)) {
          eaten.add(idx);
          lastEatenIdx = idx;
        }
      }

      drawAll();
      drawSnake(snakeX, snakeY);
      rafRef.current = requestAnimationFrame(animate);
    }

    // Start animation when scrolled into view
    const container = containerRef.current;
    if (!container) return;

    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          started = true;
          rafRef.current = requestAnimationFrame(animate);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(container);

    return () => {
      io.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [replayKey, hasActivity]);

  if (!hasActivity) return null;

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div className={cn("space-y-3", className)} ref={containerRef}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Watch Activity
        </h2>
        {finished && (
          <button
            onClick={replay}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="size-3.5" />
            Replay
          </button>
        )}
      </div>
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex ml-[20px] mb-1" style={{ gap: 0 }}>
            {monthLabels.map((m) => (
              <span
                key={m}
                className="text-[10px] text-muted-foreground/60 font-medium"
                style={{ width: CELL_PLUS_GAP * 4.3, flexShrink: 0 }}
              >
                {m}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div
              className="flex flex-col gap-[3px] mr-1 shrink-0"
              style={{ width: 16 }}
            >
              {["", "M", "", "W", "", "F", ""].map((d, i) => (
                <span
                  key={i}
                  className="text-[10px] text-muted-foreground/60 font-medium flex items-center justify-end"
                  style={{ height: CELL, lineHeight: `${CELL}px` }}
                >
                  {d}
                </span>
              ))}
            </div>
            <canvas
              ref={canvasRef}
              className="block"
              aria-label="Watch activity heatmap showing daily viewing activity over the past year"
            />
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: 11,
              height: 11,
              background:
                i === 0
                  ? "rgba(148, 163, 184, 0.08)"
                  : `rgba(239, 169, 169, ${0.25 + (i / 4) * 0.75})`,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
