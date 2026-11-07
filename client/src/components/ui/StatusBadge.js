import { STAGE_MAP } from "@/lib/leads";

export default function StatusBadge({ status }) {
  const stage = STAGE_MAP[status] || STAGE_MAP.lost;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
      <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
      {stage.label}
    </span>
  );
}
