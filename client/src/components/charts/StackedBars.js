"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const PAD = { top: 12, right: 8, bottom: 26, left: 28 };

function integerScale(v) {
  const top = Math.max(1, Math.ceil(v));
  const pow = Math.pow(10, Math.max(0, Math.floor(Math.log10(top)) - 1));
  const step = [1, 2, 5, 10, 20, 50].map((m) => m * pow).find((st) => Math.ceil(top / st) <= 4);
  const steps = Math.max(2, Math.ceil(top / step));
  return { max: step * steps, step, steps };
}

const fmtShort = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtLong = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/**
 * Stacked daily bars. series: [{ key, label, color }], data: [{ date, [key]: number }]
 * Status colours carry a legend + tooltip text, never colour alone.
 */
export default function StackedBars({ data, series, height = 240 }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (!width || !data.length) return null;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const totals = data.map((d) => series.reduce((a, s) => a + (d[s.key] || 0), 0));
    const { max, step, steps } = integerScale(Math.max(...totals, 1));
    const slot = innerW / data.length;
    const barW = Math.max(2, Math.min(18, slot * 0.62));
    const y = (v) => PAD.top + innerH - (v / max) * innerH;
    const every = Math.ceil(data.length / Math.max(2, Math.floor(innerW / 64)));
    return { innerW, innerH, totals, max, step, steps, slot, barW, y, every };
  }, [width, height, data, series]);

  const h = hover != null && geo ? { i: hover, d: data[hover], total: geo.totals[hover] } : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <div ref={ref} className="relative w-full select-none" style={{ height }}>
        {geo && (
          <svg width={width} height={height} role="img" aria-label="Submissions per day" onPointerLeave={() => setHover(null)}>
            {Array.from({ length: geo.steps + 1 }, (_, k) => k * geo.step).map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke="#eef0f3" strokeDasharray={t ? "3 4" : undefined} />
                <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              const cx = PAD.left + geo.slot * i + geo.slot / 2;
              let acc = 0;
              const segs = series
                .map((s) => ({ s, v: d[s.key] || 0 }))
                .filter((x) => x.v > 0)
                .map((x, idx, arr) => {
                  const y0 = geo.y(acc);
                  acc += x.v;
                  const y1 = geo.y(acc);
                  // 2px surface gap between stacked fills; round only the top data-end
                  const gap = idx > 0 ? 2 : 0;
                  return { ...x, y: y1, h: Math.max(1, y0 - y1 - gap), top: idx === arr.length - 1 };
                });
              return (
                <g key={d.date} opacity={hover == null || hover === i ? 1 : 0.45}>
                  {segs.map(({ s, y, h: hh, top }) => (
                    <rect
                      key={s.key}
                      x={cx - geo.barW / 2}
                      y={y}
                      width={geo.barW}
                      height={hh}
                      rx={top ? Math.min(4, geo.barW / 2) : 0}
                      fill={s.color}
                    />
                  ))}
                  {/* hit target larger than the bar */}
                  <rect
                    x={PAD.left + geo.slot * i}
                    y={PAD.top}
                    width={geo.slot}
                    height={geo.innerH}
                    fill="transparent"
                    onPointerEnter={() => setHover(i)}
                  />
                  {(i % geo.every === 0 || i === data.length - 1) && (data.length - 1 - i >= geo.every * 0.6 || i === data.length - 1) && (
                    <text x={cx} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[11px]">
                      {fmtShort(d.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {h && (
          <div
            className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{
              left: PAD.left + geo.slot * h.i + geo.slot / 2,
              top: 4,
              transform: h.i > data.length * 0.6 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <p className="mb-1 font-medium text-slate-500">{fmtLong(h.d.date)}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-2 py-0.5">
                <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                <span className="font-semibold tabular-nums text-slate-900">{h.d[s.key] || 0}</span>
                <span className="text-slate-500">{s.label}</span>
              </p>
            ))}
            <p className="mt-1 border-t border-slate-100 pt-1 text-slate-500">
              Total <span className="font-semibold tabular-nums text-slate-900">{h.total}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
