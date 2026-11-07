"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Trophy, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/Card";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/ui/Toast";

const shiftMonth = (month, delta) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

function Cell({ label, children, sub, className = "" }) {
  return (
    <div className={`px-3 py-3 sm:px-5 sm:py-3.5 ${className}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">{children}</div>
      {sub && <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">{sub}</p>}
    </div>
  );
}

export default function TargetCard({ campaignKey, refreshKey }) {
  const toast = useToast();
  const [month, setMonth] = useState(null);
  const [current, setCurrent] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const q = new URLSearchParams({ campaign: campaignKey });
    if (month) q.set("month", month);
    apiFetch(`/targets?${q}`)
      .then((d) => {
        setData(d.targets[0]);
        setCurrent(d.currentMonth);
        setMonth((m) => m || d.month);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [campaignKey, month, refreshKey]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(data?.target ? String(data.target) : "");
    setEditing(true);
  };

  const save = async (e) => {
    e?.preventDefault();
    const value = Number(draft);
    if (!Number.isInteger(value) || value < 1) {
      toast("Enter a whole number greater than 0", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/targets/${campaignKey}`, { method: "PUT", body: JSON.stringify({ month: data.month, target: value }) });
      setData(res.target);
      setEditing(false);
      toast(`${monthLabel(data.month)} target set to ${value} leads`);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!data) return <Skeleton className="h-[104px] rounded-xl" />;

  const isCurrent = data.month === current;
  const isPast = current && data.month < current;
  const hasTarget = data.target != null;
  const pct = data.percent;

  let status;
  if (!hasTarget) status = { label: "No target", cls: "bg-slate-100 text-slate-600" };
  else if (data.met) status = { label: data.exceededBy ? `Met · +${data.exceededBy}` : "Target met", cls: "bg-emerald-100 text-emerald-800" };
  else if (isPast) status = { label: "Missed", cls: "bg-red-100 text-red-700" };
  else status = { label: "On track", cls: "bg-indigo-100 text-indigo-700" };

  return (
    <section
      className={`grid grid-cols-3 overflow-hidden rounded-xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))] xl:divide-x ${
        data.met ? "border-emerald-300 xl:divide-emerald-100" : "border-slate-200 xl:divide-slate-200"
      }`}
    >
      {/* Progress */}
      <div className="col-span-3 border-b border-slate-200 px-4 py-3.5 sm:px-5 xl:col-span-1 xl:border-b-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <p className="whitespace-nowrap text-xs font-medium text-slate-500">Monthly target</p>
            <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 text-sm">
            <button onClick={() => setMonth(shiftMonth(data.month, -1))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-24 whitespace-nowrap text-center text-xs font-medium text-slate-700">{monthLabel(data.month)}</span>
            <button
              onClick={() => setMonth(shiftMonth(data.month, 1))}
              disabled={isCurrent}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums text-slate-900">{data.submitted}</span>
          <span className="text-sm text-slate-400">/ {hasTarget ? data.target : "–"} leads</span>
          <span className="ml-auto text-xs font-medium tabular-nums text-slate-500">{hasTarget ? `${pct}%` : ""}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Target progress">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${data.met ? "bg-emerald-500" : "bg-indigo-600"}`}
            style={{ width: `${hasTarget ? Math.max(pct, data.submitted ? 2 : 0) : 0}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {!hasTarget
            ? "Set a target to start tracking."
            : data.met
              ? `Goal reached for ${monthLabel(data.month)}.`
              : isCurrent && data.perDayNeeded
                ? `About ${data.perDayNeeded} lead${data.perDayNeeded > 1 ? "s" : ""} a day needed · ${data.daysLeft} day${data.daysLeft > 1 ? "s" : ""} left`
                : ""}
          {data.dryRuns > 0 && <span className="text-amber-700"> · {data.dryRuns} dry run{data.dryRuns > 1 ? "s" : ""} not counted</span>}
        </p>
      </div>

      {/* Target (editable) */}
      <div className="group relative border-r border-slate-200 xl:border-r-0">
        {editing ? (
          <form onSubmit={save} className="px-3 py-3 sm:px-5 sm:py-3.5">
            <label htmlFor="target-input" className="text-xs font-medium text-slate-500">
              Target leads
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                ref={inputRef}
                id="target-input"
                type="number"
                min={1}
                max={100000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                placeholder="50"
                className="h-9 w-full min-w-0 rounded-md border border-indigo-400 px-2 text-lg font-semibold tabular-nums outline-none ring-4 ring-indigo-500/10"
              />
              <button type="submit" disabled={saving} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white hover:bg-indigo-700" aria-label="Save target">
                {saving ? <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Cancel">
                <X className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          <button onClick={startEdit} className="h-full w-full text-left transition hover:bg-slate-50" title={hasTarget ? "Change target" : "Set target"}>
            <Cell label="Target" sub={hasTarget ? "Click to change" : "Click to set"}>
              {hasTarget ? data.target : <span className="text-base font-medium text-indigo-600">Set target</span>}
            </Cell>
            <Pencil className="absolute right-4 top-4 h-3.5 w-3.5 text-slate-300 transition group-hover:text-indigo-600" />
          </button>
        )}
      </div>

      <div className="border-r border-slate-200 xl:border-r-0">
        <Cell label="Submitted" sub={data.failed ? `${data.failed} failed this month` : "Delivered to client"}>
          {data.submitted}
        </Cell>
      </div>

      <div>
        {data.met ? (
          <Cell label="Status" sub={data.exceededBy ? `${data.exceededBy} over target` : "All leads delivered"}>
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <Trophy className="h-5 w-5" /> Met
            </span>
          </Cell>
        ) : (
          <Cell label="Pending" sub="Still to submit">
            {hasTarget ? data.pending : "–"}
          </Cell>
        )}
      </div>
    </section>
  );
}
