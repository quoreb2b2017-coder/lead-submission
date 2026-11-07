"use client";

import { ChevronDown } from "lucide-react";
import { STAGES, STAGE_MAP } from "@/lib/leads";

export default function StatusSelect({ value, onChange, disabled }) {
  const stage = STAGE_MAP[value] || STAGE_MAP.new;
  return (
    <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
        style={{ background: stage.color }}
      />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Change lead stage"
        className="cursor-pointer appearance-none rounded-full border border-slate-200 bg-white py-1 pl-6 pr-7 text-xs font-medium text-slate-700 transition hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
      >
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
