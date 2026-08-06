import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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

const MIN_CELL = 7;
const MIN_WEEKS = 26;
const DAY_LABEL_COL_WIDTH = 18;
const CONTAINER_PADDING = 8;

interface Layout {
  cell: number;
  gap: number;
  cellPlusGap: number;
  weeks: number;
}

function computeLayout(containerWidth: number): Layout {
  const avail = Math.max(80, containerWidth - DAY_LABEL_COL_WIDTH - CONTAINER_PADDING);
  const gap = GAP;
  let weeks = WEEKS;
  let cell = Math.floor(avail / weeks) - gap;
  if (cell < MIN_CELL) {
    weeks = Math.max(MIN_WEEKS, Math.floor(avail / (MIN_CELL + gap)));
    cell = Math.floor(avail / weeks) - gap;
    if (cell < MIN_CELL) cell = MIN_CELL;
  }
  return { cell, gap, cellPlusGap: cell + gap, weeks };
}

function buildGrid(
  logs: { watched_date: string | null }[],
  weeks: number,
): { cells: DayCell[]; maxCount: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
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
  for (let col = 0; col < weeks; col++) {
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
  const [containerWidth, setContainerWidth] = useState(0);
  const gridDataRef = useRef<{ cells: DayCell[]; maxCount: number } | null>(
    null,
  );
  const gridWeeksRef = useRef<number>(WEEKS);
  const rafRef = useRef<number>(0);
  const reducedMotionRef = useRef(false);

  // Measure container width and track resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setContainerWidth(w);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => (containerWidth > 0 ? computeLayout(containerWidth) : null),
    [containerWidth],
  );

  const cell = layout?.cell ?? CELL;
  const gap = layout?.gap ?? GAP;
  const cellPlusGap = layout?.cellPlusGap ?? CELL_PLUS_GAP;
  const layoutWeeks = layout?.weeks ?? WEEKS;
  const cornerRadius = Math.max(1, Math.round(cell * 0.2));

  // Rebuild grid when weeks changes or on replay
  if (gridDataRef.current === null || gridWeeksRef.current !== layoutWeeks) {
    gridDataRef.current = buildGrid(logs, layoutWeeks);
    gridWeeksRef.current = layoutWeeks;
  }
  const { cells } = gridDataRef.current;

  const activeCells = cells.filter((c) => c.count > 0);
  const hasActivity = activeCells.length > 0;

  const replay = useCallback(() => {
    gridDataRef.current = null;
    setFinished(false);
    setReplayKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!hasActivity || !layout) return;
    gridDataRef.current = buildGrid(logs, layoutWeeks);
    const grid = gridDataRef.current!;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gctx = ctx;

    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const dpr = window.devicePixelRatio || 1;
    const w = layoutWeeks * cellPlusGap;
    const h = ROWS * cellPlusGap;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    gctx.setTransform(1, 0, 0, 1, 0, 0);
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
      const gridCell = gridCells[idx];
      if (!gridCell) return;
      gctx.fillStyle = color;
      gctx.beginPath();
      gctx.roundRect(
        gridCell.col * cellPlusGap,
        gridCell.row * cellPlusGap,
        cell,
        cell,
        cornerRadius,
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
    for (let col = 0; col < layoutWeeks; col++) {
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
        x: c.col * cellPlusGap + cell / 2,
        y: c.row * cellPlusGap + cell / 2,
      };
    }

    const REEL_ACCENT = "rgba(239, 169, 169, 1)";
    const REEL_DARK = "rgba(200, 130, 130, 1)";
    const REEL_HUB = "rgba(180, 110, 110, 1)";
    const TRAIL_COLOR = "239, 169, 169";

    function drawFilmReel(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
    ) {
      const radius = size * 0.42;
      const lineWidth = Math.max(1, size * 0.1);
      const holeRadius = Math.max(0.8, size * 0.1);
      const hubRadius = Math.max(1, size * 0.14);

      ctx.save();
      ctx.strokeStyle = REEL_ACCENT;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = REEL_DARK;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const hx = x + Math.cos(angle) * radius * 0.55;
        const hy = y + Math.sin(angle) * radius * 0.55;
        ctx.beginPath();
        ctx.arc(hx, hy, holeRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = REEL_HUB;
      ctx.beginPath();
      ctx.arc(x, y, hubRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawLightTrail(
      ctx: CanvasRenderingContext2D,
      headX: number,
      headY: number,
      bodyPathIdxs: number[],
    ) {
      const positions: { x: number; y: number }[] = [{ x: headX, y: headY }];
      for (const pi of bodyPathIdxs) {
        if (pi < 0 || pi >= serpentinePath.length) continue;
        positions.push(cellCenter(serpentinePath[pi]));
      }
      if (positions.length < 2) return;

      const beamLength = cellPlusGap * 3.5;
      const beamWidth = cell * 0.7;

      for (let s = 1; s < positions.length; s++) {
        const from = positions[s - 1];
        const to = positions[s];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.1) continue;
        const ux = dx / dist;
        const uy = dy / dist;

        const tailX = from.x;
        const tailY = from.y;
        const tipX = from.x + ux * beamLength * (1 - (s - 1) / positions.length);
        const tipY = from.y + uy * beamLength * (1 - (s - 1) / positions.length);

        const px = -uy;
        const py = ux;
        const fade = 0.18 * (1 - (s - 1) / positions.length);
        const halfW = beamWidth * 0.5 * (1 - (s - 1) / positions.length);

        ctx.fillStyle = `rgba(${TRAIL_COLOR}, ${fade})`;
        ctx.beginPath();
        ctx.moveTo(tailX + px * halfW, tailY + py * halfW);
        ctx.lineTo(tailX - px * halfW, tailY - py * halfW);
        ctx.lineTo(tipX - px * halfW * 0.3, tipY - py * halfW * 0.3);
        ctx.lineTo(tipX + px * halfW * 0.3, tipY + py * halfW * 0.3);
        ctx.closePath();
        ctx.fill();
      }

      const head = positions[0];
      const prev = positions[1];
      const hdx = head.x - prev.x;
      const hdy = head.y - prev.y;
      const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
      if (hdist > 0.1) {
        const hux = hdx / hdist;
        const huy = hdy / hdist;
        const hpx = -huy;
        const hpy = hux;
        const hHalfW = beamWidth * 0.5;
        const hTipX = head.x + hux * beamLength;
        const hTipY = head.y + huy * beamLength;
        ctx.fillStyle = `rgba(${TRAIL_COLOR}, 0.22)`;
        ctx.beginPath();
        ctx.moveTo(head.x + hpx * hHalfW, head.y + hpy * hHalfW);
        ctx.lineTo(head.x - hpx * hHalfW, head.y - hpy * hHalfW);
        ctx.lineTo(hTipX - hpx * hHalfW * 0.25, hTipY - hpy * hHalfW * 0.25);
        ctx.lineTo(hTipX + hpx * hHalfW * 0.25, hTipY + hpy * hHalfW * 0.25);
        ctx.closePath();
        ctx.fill();
      }
    }

    function drawSnakeBody(
      headX: number,
      headY: number,
      bodyPathIdxs: number[],
    ) {
      drawLightTrail(gctx, headX, headY, bodyPathIdxs);
      drawFilmReel(gctx, headX, headY, cell);
    }

    if (reducedMotionRef.current) {
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

    const REST_DURATION = 30;
    const LOOP_PAUSE_FRAMES = 100;
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
      `[heatmap] animation starting — ${activeCount} active cells, path=${path.length}, weeks=${layoutWeeks}, cell=${cell}, REST_DURATION=${REST_DURATION} frames/cell`,
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
  }, [replayKey, hasActivity, cell, gap, cellPlusGap, layoutWeeks, layout]);

  if (!hasActivity) return null;

  const monthLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const labelCount = Math.min(12, Math.ceil(layoutWeeks / 4.4));
  const visibleLabels = monthLabels.slice(0, labelCount);
  const labelWidth = cellPlusGap * 4.3;

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
        <div style={{ width: DAY_LABEL_COL_WIDTH + layoutWeeks * cellPlusGap }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ marginLeft: DAY_LABEL_COL_WIDTH + 2 }}>
            {visibleLabels.map((m) => (
              <span
                key={m}
                className="text-[10px] text-muted-foreground/60 font-medium"
                style={{ width: labelWidth, flexShrink: 0 }}
              >
                {m}
              </span>
            ))}
          </div>
          <div className="flex" style={{ gap }}>
            {/* Day labels */}
            <div
              className="flex flex-col shrink-0"
              style={{ width: DAY_LABEL_COL_WIDTH - gap, gap }}
            >
              {["", "M", "", "W", "", "F", ""].map((d, i) => (
                <span
                  key={i}
                  className="text-[10px] text-muted-foreground/60 font-medium flex items-center justify-end"
                  style={{ height: cell, lineHeight: `${cell}px` }}
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
              width: Math.min(cell, 11),
              height: Math.min(cell, 11),
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
