import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Sparkline from "@/components/charts/Sparkline";

export default function StatCard({ title, value, icon: Icon, iconClass, trend, trendLabel, spark, footnote, delay = 0 }) {
  const hasTrend = typeof trend === "number";
  const up = trend > 0;
  const flat = trend === 0;
  const TrendIcon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="group relative animate-fade-up overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        {spark && <Sparkline values={spark} />}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-[28px] font-bold leading-none tracking-tight tabular-nums text-slate-900">{value}</p>

      <div className="mt-3 flex items-center gap-2 text-xs">
        {hasTrend && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${
              flat ? "bg-slate-100 text-slate-600" : up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(trend)}%
          </span>
        )}
        <span className="text-slate-500">{hasTrend ? trendLabel : footnote}</span>
      </div>
    </Card>
  );
}
