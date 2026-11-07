"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Download, Folder, FolderOpen, Search, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { apiDownload, apiFetch } from "@/lib/api";
import { CAMPAIGN_NAV } from "@/lib/campaignNav";
import CampaignComingSoon from "@/components/submit/CampaignComingSoon";
import { Skeleton } from "@/components/ui/Card";
import SheetTable from "@/components/records/SheetTable";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/ui/Toast";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "dry_run", label: "Dry run" },
  { key: "failed", label: "Failed" },
];

const nowIST = () => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${p.find((x) => x.type === "year").value}-${p.find((x) => x.type === "month").value}`;
};

export default function RecordsView({ campaignKey }) {
  const nav = CAMPAIGN_NAV.find((c) => c.key === campaignKey);
  if (nav && !nav.enabled) return <CampaignComingSoon label={nav.label} />;
  return (
    <Suspense fallback={<Skeleton className="h-[600px] rounded-xl" />}>
      <Records campaignKey={campaignKey} />
    </Suspense>
  );
}

function Records({ campaignKey }) {
  const params = useSearchParams();
  const toast = useToast();
  const nav = CAMPAIGN_NAV.find((c) => c.key === campaignKey);
  // Scout campaigns go through the client's BuyerZone form: no relay, so no relay status / dry runs
  const isScout = nav?.delivery === "scout";
  const current = nowIST();
  const initialMonth = /^\d{4}-\d{2}$/.test(params.get("month") || "") ? params.get("month") : current;

  const [year, setYear] = useState(Number(initialMonth.slice(0, 4)));
  const [month, setMonth] = useState(initialMonth);
  const [summary, setSummary] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    apiFetch(`/records/summary?campaign=${campaignKey}&year=${year}`)
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [campaignKey, year, reloadKey]);

  useEffect(() => {
    if (!month) return;
    apiFetch(`/records/month?campaign=${campaignKey}&month=${month}`)
      .then((d) => setSheet({ ...d, key: month }))
      .catch((err) => setError(err.message));
  }, [campaignKey, month, reloadKey]);

  const rows = useMemo(() => {
    if (!sheet) return [];
    const q = query.trim().toLowerCase();
    return sheet.rows
      .filter((r) => status === "all" || r._statusKey === status)
      .filter((r) => !q || Object.values(r).some((v) => typeof v === "string" && v.toLowerCase().includes(q)));
  }, [sheet, query, status]);

  const openMonth = (m) => {
    setMonth(m);
    setSelected(new Set());
    setQuery("");
    setStatus("all");
    setTimeout(() => document.getElementById("sheet")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => (rows.length && rows.every((r) => prev.has(r._id)) ? new Set() : new Set(rows.map((r) => r._id))));

  const selectedRows = sheet ? sheet.rows.filter((r) => selected.has(r._id)) : [];
  const selectedSent = selectedRows.filter((r) => r._statusKey === "sent").length;

  const deleteSelected = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch("/submissions/bulk-delete", { method: "POST", body: JSON.stringify({ ids: [...selected] }) });
      toast(res.message);
      setSelected(new Set());
      setConfirmDelete(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const name = await apiDownload(`/records/export?campaign=${campaignKey}&month=${month}&status=${status}`, `${campaignKey}-${month}.xlsx`);
      toast(`Downloaded ${name}`);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDownloading(false);
    }
  };

  const loadingSheet = !sheet || sheet.key !== month;
  const monthIdx = Number(month.slice(5, 7)) - 1;
  const shortName = summary?.campaign.shortName || nav?.shortName || campaignKey.toUpperCase();

  return (
    <div className="space-y-4 xl:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={nav?.href || "/dashboard"} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Back to form
          </Link>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{summary?.campaign.name || nav?.label} · Records</h2>
          <p className="mt-1 text-sm text-slate-500">Every lead submitted for this campaign, organised by month. Open a month to view or download its sheet.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button onClick={() => setYear((y) => y - 1)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Previous year">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-14 text-center text-sm font-semibold tabular-nums text-slate-800">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= Number(current.slice(0, 4))}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Year totals */}
      <div
        className={
          isScout
            ? "grid grid-cols-2 rounded-xl border border-slate-200 bg-white [&>div:first-child]:border-r [&>div]:border-slate-200"
            : "grid grid-cols-2 rounded-xl border border-slate-200 bg-white sm:grid-cols-4 [&>div]:border-slate-200 [&>div:nth-child(odd)]:border-r sm:[&>div:not(:last-child)]:border-r [&>div:nth-child(-n+2)]:border-b sm:[&>div]:border-b-0"
        }
      >
        {(isScout
          ? [
              ["Total in " + year, summary?.totals.total],
              [`In ${MONTHS[monthIdx]}`, summary?.months.find((m) => m.month === month)?.total],
            ]
          : [
              ["Total in " + year, summary?.totals.total],
              ["Sent to client", summary?.totals.sent],
              ["Dry runs", summary?.totals.dryRun],
              ["Failed", summary?.totals.failed],
            ]
        ).map(([label, v]) => (
          <div key={label} className="px-4 py-3 sm:px-5">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{v ?? "–"}</p>
          </div>
        ))}
      </div>

      {/* Month folders */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Monthly folders</h3>
        <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 xl:grid-cols-6">
          {MONTHS.map((name, i) => {
            const key = `${year}-${String(i + 1).padStart(2, "0")}`;
            const m = summary?.months[i];
            const future = key > current;
            const open = key === month;
            const Icon = open ? FolderOpen : Folder;
            return (
              <button
                key={key}
                onClick={() => !future && openMonth(key)}
                disabled={future}
                className={`group flex flex-col items-start rounded-lg border p-3 text-left transition ${
                  open
                    ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/15"
                    : future
                      ? "cursor-not-allowed border-dashed border-slate-200 bg-slate-50/50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Icon
                  className={`h-7 w-7 ${open ? "fill-indigo-200 text-indigo-600" : m?.total ? "fill-amber-100 text-amber-500" : "fill-slate-100 text-slate-300"}`}
                  strokeWidth={1.5}
                />
                <p className={`mt-2 text-sm font-semibold ${future ? "text-slate-400" : "text-slate-900"}`}>{name}</p>
                {summary ? (
                  <>
                    <p className={`text-xs tabular-nums ${future ? "text-slate-300" : "text-slate-500"}`}>
                      {future ? "Upcoming" : `${m.total} lead${m.total === 1 ? "" : "s"}`}
                    </p>
                    {!future && m.total > 0 && !isScout && (
                      <p className="mt-1.5 text-[11px] tabular-nums text-slate-500">
                        <span className="text-emerald-700">{m.sent} sent</span>
                        {m.dryRun > 0 && <span> · {m.dryRun} dry</span>}
                        {m.failed > 0 && <span className="text-red-600"> · {m.failed} failed</span>}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="skeleton mt-1 h-3 w-12 rounded" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sheet */}
      <section id="sheet" className="scroll-mt-24 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {MONTHS[monthIdx]} {month.slice(0, 4)}
              <span className="ml-2 font-mono text-xs font-normal text-slate-500">{shortName}-leads-{month}.xlsx</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isScout
                ? "LeadHub's copy of every lead submitted through the client's BuyerZone Scout form."
                : "All fields exactly as posted to the relay, including hidden campaign fields."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this sheet"
                className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className={`${isScout ? "hidden" : "flex"} rounded-lg border border-slate-200 bg-white p-0.5`}>
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatus(s.key)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${status === s.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {selected.size > 0 && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" /> Delete {selected.size}
              </button>
            )}
            <button
              onClick={download}
              disabled={downloading || loadingSheet || rows.length === 0}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" /> : <Download className="h-4 w-4" />}
              Download .xlsx
            </button>
          </div>
        </div>

        {loadingSheet ? (
          <Skeleton className="h-80 rounded-lg" />
        ) : (
          <SheetTable
            columns={sheet.columns}
            rows={rows}
            sheetName={`${shortName} · ${MONTHS[monthIdx].slice(0, 3)} ${month.slice(0, 4)}`}
            maxHeight={560}
            emptyText={sheet.rows.length ? "No rows match your filters." : `No ${shortName} leads were submitted in ${MONTHS[monthIdx]}.`}
            footerRight={`${selected.size ? `${selected.size} selected · ` : ""}${rows.length} of ${sheet.rows.length} rows · ${sheet.columns.length - 1} columns`}
            selectable
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        )}
      </section>

      {confirmDelete && (
        <DeleteDialog
          count={selected.size}
          sentCount={selectedSent}
          deleting={deleting}
          onCancel={() => !deleting && setConfirmDelete(false)}
          onConfirm={deleteSelected}
        />
      )}
    </div>
  );
}

function DeleteDialog({ count, sentCount, deleting, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="del-title">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md animate-fade-up overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <h3 id="del-title" className="mt-4 text-lg font-semibold text-slate-900">
            Delete {count} submission{count === 1 ? "" : "s"} from LeadHub?
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            This removes the selected rows from your panel, records and exports. <strong className="font-semibold text-slate-800">It does not recall anything from the client</strong>: leads that were already sent stay with them.
          </p>
          {sentCount > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
              {sentCount} of these {sentCount === 1 ? "was" : "were"} delivered to the client and will no longer count toward that month&apos;s target.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <button onClick={onCancel} disabled={deleting} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" /> : <Trash2 className="h-4 w-4" />}
            Delete from LeadHub
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
