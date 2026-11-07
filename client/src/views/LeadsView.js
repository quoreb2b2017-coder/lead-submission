"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download, X, ChevronRight, SlidersHorizontal } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { STAGES, downloadCsv, formatDate, timeAgo } from "@/lib/leads";
import { Card, Skeleton } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/dashboard/LeadsTable";
import StatusSelect from "@/components/dashboard/StatusSelect";
import LeadDrawer from "@/components/dashboard/LeadDrawer";

const TABS = [{ key: "all", label: "All" }, ...STAGES];

export default function LeadsPageView() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <LeadsView />
    </Suspense>
  );
}

function LeadsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const urlQuery = searchParams.get("q") || "";

  const [allLeads, setAllLeads] = useState([]);
  const [search, setSearch] = useState(urlQuery);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [savingId, setSavingId] = useState(null);

  // Keep the input in sync when the topbar search changes the URL
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setSearch(urlQuery);
  }

  const load = useCallback(async () => {
    try {
      const d = await apiFetch("/leads?limit=200");
      setAllLeads(d.leads);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiFetch("/leads?limit=200")
      .then((d) => setAllLeads(d.leads))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: allLeads.length };
    STAGES.forEach((s) => (c[s.key] = allLeads.filter((l) => l.status === s.key).length));
    return c;
  }, [allLeads]);

  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allLeads.filter(
      (l) =>
        (status === "all" || l.status === status) &&
        (!q || [l.name, l.email, l.company, l.phone].some((v) => v?.toLowerCase().includes(q)))
    );
    const sorters = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(sorters[sort]);
  }, [allLeads, search, status, sort]);

  const updateStatus = async (lead, newStatus) => {
    if (lead.status === newStatus) return;
    const prev = allLeads;
    setSavingId(lead._id);
    setAllLeads((ls) => ls.map((l) => (l._id === lead._id ? { ...l, status: newStatus } : l)));
    setSelected((s) => (s?._id === lead._id ? { ...s, status: newStatus } : s));
    try {
      await apiFetch(`/leads/${lead._id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      toast(`${lead.name} moved to ${STAGES.find((s) => s.key === newStatus).label}`);
    } catch (err) {
      setAllLeads(prev);
      setSelected((s) => (s?._id === lead._id ? { ...s, status: lead.status } : s));
      toast(err.message || "Could not update lead", "error");
    } finally {
      setSavingId(null);
    }
  };

  const deleteLead = async (lead) => {
    try {
      await apiFetch(`/leads/${lead._id}`, { method: "DELETE" });
      setAllLeads((ls) => ls.filter((l) => l._id !== lead._id));
      setSelected(null);
      toast(`${lead.name} was deleted`);
    } catch (err) {
      toast(err.message || "Could not delete lead", "error");
    }
  };

  const clearSearch = () => {
    setSearch("");
    if (urlQuery) router.replace("/dashboard/leads");
  };

  const filtered = Boolean(search || status !== "all");

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Leads</h2>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? "Loading leads..." : `${counts.all} total leads. Click a row to see details.`}
          </p>
        </div>
        <button
          onClick={() => downloadCsv(leads, `leads-${status}-${new Date().toISOString().slice(0, 10)}.csv`)}
          disabled={!leads.length}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 sm:self-auto"
        >
          <Download className="h-4 w-4" /> Export {leads.length ? `(${leads.length})` : ""}
        </button>
      </div>

      <Card className="animate-fade-up overflow-hidden [animation-delay:80ms]">
        {/* Stage tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-3 sm:px-6">
          {TABS.map((t) => {
            const active = status === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={`relative flex shrink-0 items-center gap-2 px-3 pb-3 pt-1 text-sm font-medium transition ${
                  active ? "text-indigo-700" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.color && <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />}
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                    active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {loading ? "-" : counts[t.key]}
                </span>
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="group relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company or phone..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort leads"
              className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A to Z</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="mx-6 mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={load} className="font-semibold hover:underline">
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3 px-6 pb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !leads.length ? (
          <EmptyState
            title={filtered ? "No matching leads" : "No leads yet"}
            text={filtered ? "Try a different search term or stage filter." : "New leads will appear here as they come in."}
            action={
              filtered && (
                <button
                  onClick={() => {
                    clearSearch();
                    setStatus("all");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50/60">
                <tr className="text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-semibold">Lead</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">Phone</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Company</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Source</th>
                  <th className="px-4 py-3 font-semibold">Stage</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Added</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead._id}
                    onClick={() => setSelected(lead)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(lead)}
                    tabIndex={0}
                    className="group cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-indigo-50/40 focus:bg-indigo-50/40 focus:outline-none"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={lead.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{lead.name}</p>
                          <p className="truncate text-xs text-slate-500">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3.5 tabular-nums text-slate-600 lg:table-cell">
                      {lead.phone || "—"}
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-600 md:table-cell">{lead.company || "—"}</td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-600">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusSelect
                        value={lead.status}
                        disabled={savingId === lead._id}
                        onChange={(s) => updateStatus(lead, s)}
                      />
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3.5 md:table-cell">
                      <p className="text-slate-700">{formatDate(lead.createdAt)}</p>
                      <p className="text-xs text-slate-400">{timeAgo(lead.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
          onDelete={deleteLead}
        />
      )}
    </div>
  );
}
