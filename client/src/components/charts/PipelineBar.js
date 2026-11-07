"use client";

import { useState } from "react";
import { STAGES } from "@/lib/leads";

/** Segmented (stacked) bar of lead stages, with direct-labelled legend rows. */
export default function PipelineBar({ byStatus, total }) {
  const [hover, setHover] = useState(null);
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);

  return (
    <div>
      <div className="relative">
        <div className="flex h-3.5 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label="Leads by stage">
          {STAGES.map((s) => {
            const n = byStatus[s.key] || 0;
            if (!n) return null;
            return (
              <div
                key={s.key}
                onPointerEnter={() => setHover(s.key)}
                onPointerLeave={() => setHover(null)}
                className="h-full transition-opacity first:rounded-l-[4px] last:rounded-r-[4px]"
                style={{
                  width: `${pct(n)}%`,
                  background: s.color,
                  opacity: hover && hover !== s.key ? 0.35 : 1,
                }}
              />
            );
          })}
        </div>
      </div>

      <ul className="mt-5 space-y-1">
        {STAGES.map((s) => {
          const n = byStatus[s.key] || 0;
          return (
            <li
              key={s.key}
              onPointerEnter={() => setHover(s.key)}
              onPointerLeave={() => setHover(null)}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 transition ${hover === s.key ? "bg-slate-50" : ""}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="flex-1 text-sm text-slate-700">{s.label}</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">{n}</span>
              <span className="w-12 text-right text-xs tabular-nums text-slate-500">{pct(n)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
