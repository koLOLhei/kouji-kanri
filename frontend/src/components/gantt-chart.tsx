"use client";

import { useRef, useState, useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GanttPhase {
  id: string;
  name: string;
  level: number;
  planned_start: string | null;
  planned_end: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  progress_percent: number;
  is_critical: boolean;
  depends_on: string[];
  phase_code?: string | null;
  status?: string;
}

export interface GanttMilestone {
  id: string;
  title: string;
  date: string;
  milestone_type?: string;
  status?: string;
}

export type GanttZoom = "month" | "week" | "day";

interface GanttProps {
  phases: GanttPhase[];
  milestones: GanttMilestone[];
  zoom: GanttZoom;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 220;
const HEADER_HEIGHT = 56;
const MIN_BAR_WIDTH = 4;

// Pixels per day for each zoom level
const PX_PER_DAY: Record<GanttZoom, number> = {
  day: 40,
  week: 10,
  month: 3,
};

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatHeaderDate(d: Date, zoom: GanttZoom): string {
  if (zoom === "day") {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  if (zoom === "week") {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}`;
}

/* ------------------------------------------------------------------ */
/*  Build timeline header ticks                                        */
/* ------------------------------------------------------------------ */

interface Tick {
  label: string;
  dayOffset: number; // from chartStart
  isMonth?: boolean;
  isWeek?: boolean;
}

function buildTicks(chartStart: Date, totalDays: number, zoom: GanttZoom): Tick[] {
  const ticks: Tick[] = [];
  if (zoom === "day") {
    // One tick per day
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(chartStart, i);
      ticks.push({ label: formatHeaderDate(d, zoom), dayOffset: i });
    }
  } else if (zoom === "week") {
    // One tick per week (Monday)
    let cur = new Date(chartStart);
    // Step back to nearest Monday
    while (cur.getDay() !== 1) cur = addDays(cur, 1);
    while (daysBetween(chartStart, cur) < totalDays) {
      const off = daysBetween(chartStart, cur);
      if (off >= 0) {
        ticks.push({ label: `${cur.getMonth() + 1}/${cur.getDate()}`, dayOffset: off });
      }
      cur = addDays(cur, 7);
    }
  } else {
    // One tick per month
    let cur = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1);
    while (daysBetween(chartStart, cur) < totalDays) {
      const off = Math.max(0, daysBetween(chartStart, cur));
      ticks.push({
        label: `${cur.getFullYear()}/${cur.getMonth() + 1}`,
        dayOffset: off,
        isMonth: true,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }
  return ticks;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function GanttChart({ phases, milestones, zoom }: GanttProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const pxPerDay = PX_PER_DAY[zoom];

  /* ---- compute chart date range ---- */
  const { chartStart, chartEnd, totalDays } = useMemo(() => {
    const allDates: Date[] = [];
    for (const p of phases) {
      if (p.planned_start) allDates.push(parseDate(p.planned_start));
      if (p.planned_end) allDates.push(parseDate(p.planned_end));
      if (p.actual_start) allDates.push(parseDate(p.actual_start));
      if (p.actual_end) allDates.push(parseDate(p.actual_end));
    }
    for (const m of milestones) {
      if (m.date) allDates.push(parseDate(m.date));
    }

    if (allDates.length === 0) {
      const today = new Date();
      return {
        chartStart: addDays(today, -30),
        chartEnd: addDays(today, 90),
        totalDays: 120,
      };
    }

    const minD = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxD = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const start = addDays(minD, -7);
    const end = addDays(maxD, 14);
    const days = daysBetween(start, end) + 1;
    return { chartStart: start, chartEnd: end, totalDays: days };
  }, [phases, milestones]);

  const chartWidth = totalDays * pxPerDay;
  const ticks = useMemo(() => buildTicks(chartStart, totalDays, zoom), [chartStart, totalDays, zoom]);

  /* ---- today marker ---- */
  const todayOffset = daysBetween(chartStart, new Date());
  const todayX = todayOffset * pxPerDay;

  /* ---- filter visible phases (based on collapsed parents) ---- */
  // Build id -> phase map & determine parent-child by level
  const visiblePhases: GanttPhase[] = useMemo(() => {
    const result: GanttPhase[] = [];
    const stack: { id: string; level: number }[] = [];

    for (const p of phases) {
      // Pop stack if we are back at same or lower level
      while (stack.length > 0 && stack[stack.length - 1].level >= p.level) {
        stack.pop();
      }

      // Check if any ancestor is collapsed
      const isHidden = stack.some((ancestor) => collapsed[ancestor.id]);
      if (!isHidden) {
        result.push(p);
      }
      stack.push({ id: p.id, level: p.level });
    }
    return result;
  }, [phases, collapsed]);

  /* ---- determine which phases have children ---- */
  const hasChildren = useMemo(() => {
    const set = new Set<string>();
    for (let i = 1; i < phases.length; i++) {
      if (phases[i].level > (phases[i - 1]?.level ?? -1)) {
        set.add(phases[i - 1].id);
      }
    }
    return set;
  }, [phases]);

  /* ---- compute bar positions ---- */
  function barX(dateStr: string | null | undefined): number {
    if (!dateStr) return 0;
    return daysBetween(chartStart, parseDate(dateStr)) * pxPerDay;
  }

  function barWidth(startStr: string | null | undefined, endStr: string | null | undefined): number {
    if (!startStr || !endStr) return MIN_BAR_WIDTH;
    const w = daysBetween(parseDate(startStr), parseDate(endStr)) * pxPerDay;
    return Math.max(w, MIN_BAR_WIDTH);
  }

  /* ---- dependency arrows ---- */
  type Arrow = { x1: number; y1: number; x2: number; y2: number };
  const arrows: Arrow[] = useMemo(() => {
    const result: Arrow[] = [];
    const rowIndex = new Map<string, number>();
    visiblePhases.forEach((p, i) => rowIndex.set(p.id, i));

    for (const p of visiblePhases) {
      if (!p.planned_start) continue;
      const toRow = rowIndex.get(p.id);
      if (toRow === undefined) continue;

      const toY = HEADER_HEIGHT + toRow * ROW_HEIGHT + ROW_HEIGHT / 2;
      const toX = barX(p.planned_start);

      for (const depId of p.depends_on) {
        const dep = phases.find((ph) => ph.id === depId);
        if (!dep?.planned_end) continue;
        const fromRow = rowIndex.get(depId);
        if (fromRow === undefined) continue;

        const fromY = HEADER_HEIGHT + fromRow * ROW_HEIGHT + ROW_HEIGHT / 2;
        const fromX = barX(dep.planned_end) + barWidth(dep.planned_start, dep.planned_end);

        result.push({ x1: fromX, y1: fromY, x2: toX, y2: toY });
      }
    }
    return result;
  }, [visiblePhases, phases, chartStart, pxPerDay]);

  const svgHeight = HEADER_HEIGHT + visiblePhases.length * ROW_HEIGHT + 40;

  return (
    <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* ---- Label panel ---- */}
      <div className="flex-shrink-0 bg-gray-50 border-r border-gray-200" style={{ width: LABEL_WIDTH }}>
        {/* header spacer */}
        <div
          className="border-b border-gray-200 bg-gray-100 flex items-end px-3 pb-1"
          style={{ height: HEADER_HEIGHT }}
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">工程名</span>
        </div>

        {visiblePhases.map((p, i) => {
          const isCollapsible = hasChildren.has(p.id);
          const isCollapsed = !!collapsed[p.id];

          return (
            <div
              key={p.id}
              className="flex items-center border-b border-gray-100 hover:bg-blue-50/40 transition-colors"
              style={{ height: ROW_HEIGHT, paddingLeft: 8 + p.level * 16 }}
            >
              {isCollapsible ? (
                <button
                  onClick={() => setCollapsed((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  className="mr-1 flex-shrink-0"
                >
                  {isCollapsed
                    ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              ) : (
                <span className="w-4.5 mr-1 flex-shrink-0" />
              )}
              {p.is_critical && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 flex-shrink-0" title="クリティカルパス" />
              )}
              <span
                className="text-xs truncate text-gray-700"
                title={p.name}
              >
                {p.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* ---- Chart panel (scrollable) ---- */}
      <div className="flex-1 overflow-x-auto" ref={scrollRef}>
        <svg
          width={chartWidth}
          height={svgHeight}
          className="block"
          style={{ minWidth: chartWidth }}
        >
          {/* ---- Grid background ---- */}
          {ticks.map((tick, i) => {
            const x = tick.dayOffset * pxPerDay;
            return (
              <line
                key={i}
                x1={x} y1={HEADER_HEIGHT}
                x2={x} y2={svgHeight}
                stroke={tick.isMonth ? "#d1d5db" : "#f3f4f6"}
                strokeWidth={tick.isMonth ? 1.5 : 1}
              />
            );
          })}

          {/* ---- Row alternating background ---- */}
          {visiblePhases.map((_, i) => (
            <rect
              key={i}
              x={0}
              y={HEADER_HEIGHT + i * ROW_HEIGHT}
              width={chartWidth}
              height={ROW_HEIGHT}
              fill={i % 2 === 0 ? "transparent" : "#f9fafb"}
            />
          ))}

          {/* ---- Header ---- */}
          <rect x={0} y={0} width={chartWidth} height={HEADER_HEIGHT} fill="#f3f4f6" />
          <line x1={0} y1={HEADER_HEIGHT} x2={chartWidth} y2={HEADER_HEIGHT} stroke="#e5e7eb" strokeWidth={1} />

          {/* Ticks labels */}
          {ticks.map((tick, i) => {
            const x = tick.dayOffset * pxPerDay;
            return (
              <text
                key={i}
                x={x + 4}
                y={HEADER_HEIGHT - 8}
                fontSize={10}
                fill="#6b7280"
                fontFamily="system-ui, sans-serif"
              >
                {tick.label}
              </text>
            );
          })}

          {/* ---- Today line ---- */}
          {todayOffset >= 0 && todayOffset <= totalDays && (
            <>
              <line
                x1={todayX} y1={0}
                x2={todayX} y2={svgHeight}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4,3"
                opacity={0.7}
              />
              <text x={todayX + 3} y={14} fontSize={9} fill="#ef4444" fontFamily="system-ui, sans-serif">
                今日
              </text>
            </>
          )}

          {/* ---- Dependency arrows ---- */}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
            </marker>
          </defs>
          {arrows.map((a, i) => {
            const midX = (a.x1 + a.x2) / 2;
            return (
              <path
                key={i}
                d={`M ${a.x1} ${a.y1} C ${midX} ${a.y1}, ${midX} ${a.y2}, ${a.x2} ${a.y2}`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={1.2}
                markerEnd="url(#arrowhead)"
                opacity={0.7}
              />
            );
          })}

          {/* ---- Phase bars ---- */}
          {visiblePhases.map((p, i) => {
            const rowY = HEADER_HEIGHT + i * ROW_HEIGHT;
            const barY = rowY + 6;
            const barH = ROW_HEIGHT - 12;

            const hasPlanned = p.planned_start && p.planned_end;
            const hasActual = p.actual_start || p.actual_end;

            const plannedX = hasPlanned ? barX(p.planned_start) : null;
            const plannedW = hasPlanned ? barWidth(p.planned_start, p.planned_end) : null;

            const barColor = p.is_critical ? "#ef4444" : p.level === 0 ? "#3b82f6" : "#6366f1";
            const barColorLight = p.is_critical ? "#fecaca" : p.level === 0 ? "#bfdbfe" : "#c7d2fe";

            return (
              <g key={p.id}>
                {/* Planned bar */}
                {hasPlanned && plannedX !== null && plannedW !== null && (
                  <>
                    <rect
                      x={plannedX}
                      y={barY}
                      width={plannedW}
                      height={barH}
                      rx={3}
                      fill={barColorLight}
                      stroke={barColor}
                      strokeWidth={1}
                    />
                    {/* Progress overlay */}
                    {p.progress_percent > 0 && (
                      <rect
                        x={plannedX}
                        y={barY}
                        width={plannedW * (p.progress_percent / 100)}
                        height={barH}
                        rx={3}
                        fill={p.is_critical ? "#f87171" : "#22c55e"}
                        opacity={0.6}
                      />
                    )}
                    {/* Progress text */}
                    {plannedW > 30 && (
                      <text
                        x={plannedX + plannedW / 2}
                        y={barY + barH / 2 + 4}
                        textAnchor="middle"
                        fontSize={9}
                        fill={barColor}
                        fontFamily="system-ui, sans-serif"
                        fontWeight="600"
                      >
                        {p.progress_percent}%
                      </text>
                    )}
                  </>
                )}

                {/* Actual bar (thin stripe below) */}
                {hasActual && (
                  <rect
                    x={barX(p.actual_start || p.planned_start)}
                    y={rowY + ROW_HEIGHT - 5}
                    width={barWidth(
                      p.actual_start || p.planned_start,
                      p.actual_end || new Date().toISOString().split("T")[0],
                    )}
                    height={3}
                    rx={1}
                    fill="#22c55e"
                  />
                )}
              </g>
            );
          })}

          {/* ---- Milestones (diamonds) ---- */}
          {milestones.map((m) => {
            if (!m.date) return null;
            const off = daysBetween(chartStart, parseDate(m.date));
            if (off < 0 || off > totalDays) return null;
            const x = off * pxPerDay;
            const y = HEADER_HEIGHT - 4;
            const size = 7;
            return (
              <g key={m.id}>
                <polygon
                  points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`}
                  fill="#f59e0b"
                  stroke="#d97706"
                  strokeWidth={1}
                />
                <title>{m.title}</title>
              </g>
            );
          })}
        </svg>

        {/* Milestone labels below the chart area, rendered as HTML for better overflow handling */}
        <div className="relative" style={{ height: 0 }}>
          {milestones.map((m) => {
            if (!m.date) return null;
            const off = daysBetween(chartStart, parseDate(m.date));
            if (off < 0 || off > totalDays) return null;
            const x = off * pxPerDay;
            return (
              <div
                key={m.id}
                className="absolute top-0 whitespace-nowrap text-[9px] text-amber-700 font-medium pointer-events-none"
                style={{ left: x + 4, top: -(svgHeight - HEADER_HEIGHT + 14) }}
              >
                {/* tooltip via SVG title, label hidden to avoid clutter */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
