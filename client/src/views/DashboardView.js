"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, FolderOpen, Inbox, RefreshCw, Send, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/leads";
import { CAMPAIGN_NAV } from "@/lib/campaignNav";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import StackedBars from "@/components/charts/StackedBars";
import BarList from "@/components/charts/BarList";

const PANEL = "rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const CAMPAIGNS = CAMPAIGN_NAV.filter((c) => c.enabled);
const RANGES = [7, 30, 90];
const STATUS_SERIES = [
  { key: "sent", label: "Sent to client", color: "#059669" },
  { key: "dryRun", label: "Dry run", color: "#f59e0b" },
  { key: "failed", label: "Failed", color: "#dc2626" },
];
const STATUS_BADGE = {
  sent: "bg-emerald-50 text-emerald-700",
  dry_run: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  not_sent: "bg-slate-100 text-slate-600",
};
const STATUS_LABEL = { sent: "Sent", dry_run: "Dry run", failed: "Failed", not_sent: "Not sent" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Change({ value }) {
  if (value == null) return null;
  const up = value > 0;
  const Icon = value === 0 ? null : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        value === 0 ? "bg-slate-100 text-slate-600" : up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`${PANEL} min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Empty({ text = "No submissions in this period yet." }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Inbox className="h-6 w-6 text-slate-300" />
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  );
}

export default function DashboardView() {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(() => (typeof window === "undefined" ? "all" : localStorage.getItem("dashboard-campaign") || "all"));
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    apiFetch(`/dashboard?campaign=${campaign}&days=${days}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false));
  }, [campaign, days, reloadKey]);

  const pickCampaign = (key) => {
    setCampaign(key);
    localStorage.setItem("dashboard-campaign", key);
  };

  const loading = !data || data.campaign !== campaign || data.days !== days;
  const k = data?.kpis;
  const selected = CAMPAIGNS.find((c) => c.key === campaign);
  const hasData = k && k.total > 0;
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-4 xl:space-y-5">
      {/* Header + filters */}
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {greeting()}, {firstName}
          </p>
          <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{selected ? `${selected.label} dashboard` : "All campaigns"}</h2>
          <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">Live numbers from submitted leads only.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={campaign}
            onChange={(e) => pickCampaign(e.target.value)}
            aria-label="Campaign"
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:hidden"
          >
            <option value="all">All campaigns</option>
            {CAMPAIGNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="hidden max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white p-0.5 sm:flex" role="tablist" aria-label="Campaign">
            {[{ key: "all", shortName: "All campaigns" }, ...CAMPAIGNS].map((c) => (
              <button
                key={c.key}
                role="tab"
                aria-selected={campaign === c.key}
                onClick={() => pickCampaign(c.key)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  campaign === c.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {c.key === "all" ? c.shortName : c.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`rounded-md px-2.5 py-1.5 text-sm font-medium tabular-nums transition ${
                  days === r ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              setReloadKey((x) => x + 1);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* KPI strip */}
      {loading ? (
        <Skeleton className="h-[104px] rounded-xl" />
      ) : (
        <section className={`${PANEL} grid grid-cols-2 lg:grid-cols-4`}>
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-r border-slate-200 lg:border-b-0">
            <p className="text-xs font-medium text-slate-500">Submissions · {days}d</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-semibold tabular-nums text-slate-900">{k.total}</span>
              <Change value={k.totalChange} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{k.allTime} all time</p>
          </div>
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 lg:border-b-0 lg:border-r">
            <p className="text-xs font-medium text-slate-500">Sent to client · {days}d</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-semibold tabular-nums text-slate-900">{k.sent}</span>
              <Change value={k.sentChange} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{k.deliveryRate == null ? "No live sends yet" : `${k.deliveryRate}% delivered`}</p>
          </div>
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-r border-slate-200">
            <p className="text-xs font-medium text-slate-500">Dry runs / Failed</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {k.dryRun}
              <span className="mx-1 text-slate-300">/</span>
              <span className={k.failed ? "text-red-600" : ""}>{k.failed}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Not counted toward targets</p>
          </div>
          <div className="px-4 py-3 sm:px-5 sm:py-3.5">
            <p className="text-xs font-medium text-slate-500">This month&apos;s target</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {k.monthSent}
              <span className="text-base font-normal text-slate-400"> / {k.monthTarget ?? "–"}</span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${k.monthPercent >= 100 ? "bg-emerald-500" : "bg-indigo-600"}`} style={{ width: `${k.monthPercent}%` }} />
            </div>
          </div>
        </section>
      )}

      {/* Trend + campaigns */}
      <div className="grid gap-4 lg:grid-cols-3 xl:gap-5">
        <Panel title="Submissions per day" subtitle={`Last ${days} days, by relay status`} className="lg:col-span-2">
          {loading ? <Skeleton className="h-[220px]" /> : hasData ? <StackedBars data={data.timeseries} series={STATUS_SERIES} height={190} /> : <Empty />}
        </Panel>

        <Panel title="Campaign targets" subtitle="Leads delivered this month">
          {loading ? (
            <Skeleton className="h-40" />
          ) : (
            <ul className="space-y-5">
              {data.campaigns.map((c) => {
                const nav = CAMPAIGN_NAV.find((n) => n.key === c.key);
                return (
                  <li key={c.key}>
                    <div className="flex items-center justify-between gap-2">
                      <Link href={nav?.href || "#"} className="truncate text-sm font-medium text-slate-800 hover:text-indigo-600">
                        {nav?.label || c.name}
                      </Link>
                      {c.month.met ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <Trophy className="h-3.5 w-3.5" /> Met
                        </span>
                      ) : (
                        <span className="text-xs tabular-nums text-slate-500">
                          {c.month.sent} / {c.month.target ?? "–"}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${c.month.met ? "bg-emerald-500" : "bg-indigo-600"}`} style={{ width: `${c.month.percent}%` }} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {c.month.target == null ? (
                        <Link href={nav?.href || "#"} className="text-indigo-600 hover:underline">
                          Set a target
                        </Link>
                      ) : c.month.met ? (
                        "Target reached"
                      ) : (
                        `${c.month.pending} pending`
                      )}
                      <span className="text-slate-400"> · {c.inRange.sent + c.inRange.dryRun + c.inRange.failed} submitted in {days}d</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        {[
          ["Company size", "companySize", "Employees"],
          ["Buying timeframe", "timeframe", "Implementation plans"],
          ["Top countries", "country", "Where leads are based"],
          ["Top industries", "industry", "Lead industries"],
        ].map(([title, key, subtitle]) => {
          const items = data?.breakdowns[key]?.filter((x) => x.count > 0) || [];
          return (
            <Panel key={key} title={title} subtitle={subtitle}>
              {loading ? <Skeleton className="h-32" /> : items.length ? <BarList items={items.map((x) => ({ label: x.label, value: x.count }))} total={k.total} /> : <Empty text="No data yet." />}
            </Panel>
          );
        })}
      </div>

      {/* Team + recent */}
      <div className="grid gap-4 lg:grid-cols-3 xl:gap-5">
        <Panel title="Team" subtitle={`Who submitted in the last ${days} days`}>
          {loading ? (
            <Skeleton className="h-32" />
          ) : data.submitters.length ? (
            <ul className="divide-y divide-slate-100">
              {data.submitters.map((s) => (
                <li key={s.name} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Avatar name={s.name} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium text-slate-800">{s.name}</span>
                  <span className="text-right text-xs tabular-nums text-slate-500">
                    <span className="text-sm font-semibold text-slate-900">{s.total}</span> submitted · {s.sent} sent
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No one has submitted yet." />
          )}
        </Panel>

        <Panel
          title="Recent submissions"
          subtitle="Latest leads across the selected campaigns"
          className="lg:col-span-2"
          action={
            selected && (
              <Link href={`${selected.href}/records`} className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                <FolderOpen className="h-4 w-4" /> Records <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )
          }
        >
          {loading ? (
            <Skeleton className="h-40" />
          ) : data.recent.length ? (
            <div className="-m-4 overflow-x-auto sm:-m-5">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Lead</th>
                    <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Company</th>
                    <th className="px-3 py-2.5 font-semibold">Campaign</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 text-right font-semibold">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent.map((r) => {
                    const nav = CAMPAIGN_NAV.find((n) => n.key === r.campaign);
                    return (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-slate-900">{r.name}</p>
                          <p className="text-xs text-slate-500">{r.email}</p>
                        </td>
                        <td className="hidden px-3 py-2.5 text-slate-600 md:table-cell">{r.company}</td>
                        <td className="px-3 py-2.5">
                          <Link href={`${nav?.href || "#"}/records`} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                            {nav?.shortName || r.campaign}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-2.5 text-right text-xs text-slate-500">{timeAgo(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <Send className="h-6 w-6 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No leads submitted yet.</p>
              <Link href={selected?.href || CAMPAIGNS[0].href} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white hover:bg-slate-800">
                Submit a lead
              </Link>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
