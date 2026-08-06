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
const EMPTY_STEPS_PER_FRAME = 1;
const STEP_SLIDE_FRAMES = 4;

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

    // Build serpentine (boustrophedon) path: down col 0, up col 1, down col 2...
    const cellMap = new Map<string, number>();
    gridCells.forEach((c, i) => cellMap.set(`${c.col},${c.row}`, i));
    const serpentinePath: number[] = [];
    for (let col = 0; col < WEEKS; col++) {
      const goDown = col % 2 === 0;
      for (let r = 0; r < ROWS; r++) {
        const row = goDown ? r : ROWS - 1 - r;
        const idx = cellMap.get(`${col},${row}`);
        if (idx !== undefined) serpentinePath.push(idx);
      }
    }

    function cellCenter(idx: number) {
      const c = gridCells[idx];
      return {
        x: c.col * CELL_PLUS_GAP + CELL / 2,
        y: c.row * CELL_PLUS_GAP + CELL / 2,
      };
    }

    function drawSnakeBody(
      headX: number,
      headY: number,
      bodyPathIdxs: number[],
    ) {
      const positions: { x: number; y: number }[] = [
        { x: headX, y: headY },
      ];
      for (const pi of bodyPathIdxs) {
        if (pi < 0 || pi >= serpentinePath.length) continue;
        positions.push(cellCenter(serpentinePath[pi]));
      }
      // Draw from tail to head so head renders on top
      for (let s = positions.length - 1; s >= 0; s--) {
        const shade = s / Math.max(1, positions.length - 1);
        const r = Math.round(239 - shade * 55);
        const g = Math.round(169 - shade * 45);
        const b = Math.round(169 - shade * 50);
        gctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        gctx.beginPath();
        gctx.roundRect(
          positions[s].x - CELL / 2,
          positions[s].y - CELL / 2,
          CELL,
          CELL,
          3,
        );
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

    // Animation: serpentine snake sweep through the grid
    eaten.clear();
    drawAll();

    const activeCount = activeIndices.length;
    const path = serpentinePath;

    // Fixed pacing: 1 cell/frame through empty space, ~500ms pause on active cells
    const REST_DURATION = 30; // ~500ms eating pause
    const LOOP_PAUSE_FRAMES = 100; // ~1.7s showing completed grid before loop
    const INITIAL_PAUSE = 25;

    let pathIdx = 0;
    let phase: "initial" | "resting" | "sliding" | "fasting" | "looping" =
      "initial";
    let restTimer = 0;
    let slideProgress = 0;
    let eatenCount = 0;
    let loopPauseTimer = 0;
    let firstPassComplete = false;
    let isVisible = false;
    const startTime = performance.now();
    console.log(
      `[heatmap] animation starting — ${activeCount} active cells, path=${path.length}, REST_DURATION=${REST_DURATION} frames/cell`,
    );

    function eatCurrentCell(): boolean {
      const cellIdx = path[pathIdx];
      if (cellIdx === undefined) return false;
      if (gridCells[cellIdx].count > 0 && !eaten.has(cellIdx)) {
        eaten.add(cellIdx);
        eatenCount++;
        const eatenCell = gridCells[cellIdx];
        const remaining = activeCount - eatenCount;
        console.log(
          `[heatmap] ate cell ${eatenCell.date.toISOString().slice(0, 10)} — ${remaining} remaining`,
        );
        return true;
      }
      return false;
    }

    function finishPass() {
      drawAll();
      if (!firstPassComplete) {
        firstPassComplete = true;
        setFinished(true);
        const elapsed = performance.now() - startTime;
        console.log(
          `[heatmap] first pass complete — ${eatenCount} cells eaten, ${Math.round(elapsed)}ms, looping...`,
        );
      }
      loopPauseTimer = 0;
      phase = "looping";
    }

    function restartLoop() {
      pathIdx = 0;
      eaten.clear();
      eatenCount = 0;
      restTimer = 0;
      slideProgress = 0;
      drawAll();
      phase = "initial";
      console.log(`[heatmap] loop restart — ${activeCount} active cells`);
    }

    function beginStep() {
      if (pathIdx + 1 >= path.length) {
        finishPass();
        return;
      }
      // Look ahead: fast-travel through runs of 3+ empty cells
      let emptyRun = 0;
      for (
        let i = pathIdx + 1;
        i < path.length && i <= pathIdx + 6;
        i++
      ) {
        if (gridCells[path[i]].count === 0) emptyRun++;
        else break;
      }
      if (emptyRun >= 3) {
        phase = "fasting";
      } else {
        slideProgress = 0;
        phase = "sliding";
      }
    }

    function getHeadPos(): { x: number; y: number } {
      if (phase === "sliding" && pathIdx + 1 < path.length) {
        const from = cellCenter(path[pathIdx]);
        const to = cellCenter(path[pathIdx + 1]);
        return {
          x: from.x + (to.x - from.x) * slideProgress,
          y: from.y + (to.y - from.y) * slideProgress,
        };
      }
      return cellCenter(path[pathIdx]);
    }

    function getBodyPathIndices(): number[] {
      const indices: number[] = [];
      const start = phase === "sliding" ? pathIdx : pathIdx - 1;
      for (let s = 0; s < SNAKE_LENGTH - 1; s++) {
        const pi = start - s;
        if (pi >= 0) indices.push(pi);
      }
      return indices;
    }

    function render() {
      drawAll();
      const head = getHeadPos();
      drawSnakeBody(head.x, head.y, getBodyPathIndices());
    }

    function animate() {
      if (!isVisible) return;

      if (phase === "looping") {
        loopPauseTimer++;
        if (loopPauseTimer >= LOOP_PAUSE_FRAMES) {
          restartLoop();
        }
        drawAll();
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      if (phase === "initial") {
        restTimer++;
        if (restTimer >= INITIAL_PAUSE) {
          restTimer = 0;
          const ate = eatCurrentCell();
          if (ate) {
            phase = "resting";
          } else if (pathIdx + 1 < path.length) {
            beginStep();
          } else {
            finishPass();
            return;
          }
        }
        render();
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      if (phase === "resting") {
        restTimer++;
        if (restTimer >= REST_DURATION) {
          restTimer = 0;
          if (pathIdx + 1 < path.length) {
            beginStep();
          } else {
            finishPass();
            return;
          }
        }
        render();
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      if (phase === "sliding") {
        slideProgress += 1 / STEP_SLIDE_FRAMES;
        if (slideProgress >= 1) {
          slideProgress = 0;
          pathIdx++;
          const ate = eatCurrentCell();
          if (ate) {
            phase = "resting";
          } else if (pathIdx + 1 < path.length) {
            beginStep();
          } else {
            finishPass();
            return;
          }
        }
        render();
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      if (phase === "fasting") {
        let advanced = 0;
        let hitActive = false;
        while (
          advanced < EMPTY_STEPS_PER_FRAME &&
          pathIdx + 1 < path.length
        ) {
          const nextCellIdx = path[pathIdx + 1];
          if (gridCells[nextCellIdx].count > 0) {
            hitActive = true;
            break;
          }
          pathIdx++;
          advanced++;
        }
        if (hitActive) {
          slideProgress = 0;
          phase = "sliding";
        } else if (pathIdx + 1 >= path.length) {
          const ate = eatCurrentCell();
          if (ate) {
            phase = "resting";
          } else {
            finishPass();
            return;
          }
        }
        render();
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
    }

    // Start/pause animation based on visibility
    const container = containerRef.current;
    if (!container) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (!isVisible) {
            isVisible = true;
            rafRef.current = requestAnimationFrame(animate);
          }
        } else {
          isVisible = false;
          cancelAnimationFrame(rafRef.current);
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
