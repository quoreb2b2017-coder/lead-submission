"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

const PAD = { top: 16, right: 12, bottom: 28, left: 32 };

/** Integer-only ticks (counts are whole numbers): the smallest "nice" step that fits in <= 5 steps. */
function integerScale(v) {
  const top = Math.max(1, Math.ceil(v));
  const pow = Math.pow(10, Math.max(0, Math.floor(Math.log10(top)) - 1));
  const step = [1, 2, 5, 10, 20, 50].map((m) => m * pow).find((st) => Math.ceil(top / st) <= 5);
  const steps = Math.max(2, Math.ceil(top / step));
  return { max: step * steps, step, steps };
}

/** Monotone cubic (Fritsch–Carlson): smooth, never overshoots the data. */
function monotonePath(pts) {
  const n = pts.length;
  if (n < 2) return `M${pts[0][0]},${pts[0][1]}`;
  const dx = [], m = [], t = new Array(n);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

const fmtShort = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtLong = (d) =>
  new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Single-series area chart with crosshair + tooltip. data: [{ date, count }] */
export default function AreaChart({ data, height = 260, label = "Leads" }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);
  const gradId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (!width || !data.length) return null;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const { max, step, steps } = integerScale(Math.max(...data.map((d) => d.count), 1));
    const x = (i) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v) => PAD.top + innerH - (v / max) * innerH;
    const pts = data.map((d, i) => [x(i), y(d.count)]);

    const line = monotonePath(pts);
    const area = `${line} L${pts.at(-1)[0]},${y(0)} L${pts[0][0]},${y(0)} Z`;
    const ticks = Array.from({ length: steps + 1 }, (_, k) => step * k);
    const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(innerW / 70)));
    // Show every Nth label plus the last one, dropping any that would collide with the last
    const xLabels = data
      .map((_, i) => i)
      .filter((i) => i === data.length - 1 || (i % labelEvery === 0 && data.length - 1 - i >= labelEvery * 0.75));
    return { innerW, innerH, max, x, y, pts, line, area, ticks, xLabels };
  }, [width, height, data]);

  const handleMove = (e) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - PAD.left) / geo.innerW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const h = hover != null && geo ? { i: hover, d: data[hover], p: geo.pts[hover] } : null;

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      {geo && (
        <svg
          width={width}
          height={height}
          className="overflow-visible"
          onPointerMove={handleMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`${label} per day over the last ${data.length} days`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Recessive grid + y ticks */}
          {geo.ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geo.y(t)}
                y2={geo.y(t)}
                stroke="#e9ebf0"
                strokeDasharray={t === 0 ? undefined : "3 4"}
              />
              <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">
                {t}
              </text>
            </g>
          ))}

          {/* X labels */}
          {geo.xLabels.map((i) => (
            <text
              key={data[i].date}
              x={geo.x(i)}
              y={height - 8}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              className="fill-slate-400 text-[11px]"
            >
              {fmtShort(data[i].date)}
            </text>
          ))}

          <path d={geo.area} fill={`url(#${gradId})`} />
          <path d={geo.line} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Crosshair */}
          {h && (
            <g pointerEvents="none">
              <line x1={h.p[0]} x2={h.p[0]} y1={PAD.top} y2={geo.y(0)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={h.p[0]} cy={h.p[1]} r="5" fill="var(--series-1)" stroke="white" strokeWidth="2" />
            </g>
          )}

          {/* Hit area larger than the marks */}
          <rect x={PAD.left} y={0} width={geo.innerW} height={height} fill="transparent" />
        </svg>
      )}

      {h && (
        <div
          className="pointer-events-none absolute z-10 min-w-36 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg shadow-slate-900/10 backdrop-blur"
          style={{
            left: h.p[0],
            top: PAD.top,
            transform: h.p[0] > width * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          }}
        >
          <p className="text-xs text-slate-500">{fmtLong(h.d.date)}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: "var(--series-1)" }} />
            <span className="text-sm font-semibold tabular-nums text-slate-900">{h.d.count}</span>
            <span className="text-xs text-slate-500">{label.toLowerCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
