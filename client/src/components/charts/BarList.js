"use client";

import { useState } from "react";

/** Horizontal magnitude bars, single hue, value labelled at the end. items: [{ label, value }] */
export default function BarList({ items, total }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3.5">
      {items.map((item) => {
        const share = total ? Math.round((item.value / total) * 100) : 0;
        return (
          <li
            key={item.label}
            onPointerEnter={() => setHover(item.label)}
            onPointerLeave={() => setHover(null)}
            className="group"
          >
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="truncate font-medium text-slate-700">{item.label}</span>
              <span className="tabular-nums text-slate-900">
                <span className="font-semibold">{item.value}</span>
                <span className={`ml-1.5 text-xs text-slate-500 transition-opacity ${hover === item.label ? "opacity-100" : "opacity-0 sm:opacity-100"}`}>
                  {share}%
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-[4px] bg-slate-100">
              <div
                className="h-full rounded-[4px] transition-all duration-700"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: "var(--series-1)",
                  opacity: hover && hover !== item.label ? 0.45 : 1,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
