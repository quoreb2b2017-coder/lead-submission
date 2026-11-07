"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FlaskConical,
  FolderOpen,
  Plus,
  Lock,
  RefreshCw,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { CAMPAIGN_NAV } from "@/lib/campaignNav";
import { Skeleton } from "@/components/ui/Card";
import LeadForm from "@/components/submit/LeadForm";
import ScoutWidget from "@/components/submit/ScoutWidget";
import CampaignComingSoon from "@/components/submit/CampaignComingSoon";
import TargetCard from "@/components/submit/TargetCard";
import SheetTable from "@/components/records/SheetTable";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/ui/Toast";

export const PANEL = "rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export default function SubmitLeadView({ campaignKey = "hris" }) {
  const nav = CAMPAIGN_NAV.find((c) => c.key === campaignKey);
  const [config, setConfig] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [result, setResult] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // "N" opens a new lead form (when not typing somewhere)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
      e.preventDefault();
      setFormOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    apiFetch("/submissions/config")
      .then(setConfig)
      .catch((err) => setLoadError(err.message));
  }, []);

  const campaign = config?.campaigns.find((c) => c.key === campaignKey);
  const live = config?.relay.mode === "live";
  const recordsHref = `${nav?.href || `/dashboard/submit/${campaignKey}`}/records`;

  if (nav && !nav.enabled) return <CampaignComingSoon label={nav.label} />;

  if (campaign?.delivery === "scout") {
    return <ScoutSubmitView campaign={campaign} recordsHref={recordsHref} />;
  }

  return (
    <div className="space-y-4 xl:space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Lead capture <span className="mx-1 text-slate-300">/</span> {campaign?.category || nav?.shortName}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2.5">
            <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{campaign?.name || nav?.label}</h2>
            {config && <RelayModePill relay={config.relay} />}
          </div>
          <p className="mt-0.5 hidden truncate text-sm text-slate-500 lg:block">Enter the prospect&apos;s details. Campaign hidden fields are attached automatically.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={recordsHref}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FolderOpen className="h-4 w-4 text-slate-500" /> Records
          </Link>
          <button
            onClick={() => setFormOpen(true)}
            disabled={!campaign}
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> New lead
            <kbd className="hidden rounded border border-white/30 px-1 font-mono text-[10px] text-indigo-100 lg:inline">N</kbd>
          </button>
        </div>
      </header>

      {loadError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> {loadError}
        </div>
      )}
      {config && !campaign && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" /> This campaign isn&apos;t configured on the server yet.
        </div>
      )}

      <TargetCard campaignKey={campaignKey} refreshKey={historyKey} />

      {campaign ? <CampaignSummary campaign={campaign} onOpen={() => setDetailsOpen(true)} /> : <Skeleton className="h-[76px] rounded-xl" />}

      {campaign && (
        <button
          onClick={() => setFormOpen(true)}
          className="group flex w-full items-center gap-4 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 px-5 py-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition group-hover:scale-105">
            <Plus className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Submit a new {campaign.shortName} lead</span>
            <span className="block text-xs text-slate-500">Opens the lead form in a side panel · {Object.keys(campaign.hidden).length} hidden fields are added automatically</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-indigo-500 transition group-hover:translate-x-0.5" />
        </button>
      )}

      {campaign && (
        <LeadDrawer open={formOpen} onClose={() => setFormOpen(false)}>
          {result ? (
            <ResultPanel
              result={result}
              campaign={campaign}
              live={live}
              recordsHref={recordsHref}
              onClose={() => setFormOpen(false)}
              onRetry={(r) => {
                setResult(r);
                setHistoryKey((k) => k + 1);
              }}
              onReset={() => {
                setResult(null);
                setFormKey((k) => k + 1);
              }}
            />
          ) : (
            <LeadForm
              key={`${campaign.key}-${formKey}`}
              config={config}
              campaign={campaign}
              live={live}
              onClose={() => setFormOpen(false)}
              onDone={(r) => {
                setResult(r);
                setHistoryKey((k) => k + 1);
              }}
            />
          )}
        </LeadDrawer>
      )}

      {detailsOpen && campaign && <DetailsDrawer campaign={campaign} relay={config.relay} onClose={() => setDetailsOpen(false)} />}

      <RecentSubmissions campaignKey={campaignKey} shortName={campaign?.shortName || nav?.shortName} recordsHref={recordsHref} refreshKey={historyKey} />
    </div>
  );
}

/* ───────────────────────── Header ───────────────────────── */

function RelayModePill({ relay }) {
  const live = relay.mode === "live";
  return (
    <span
      title={live ? `Live: leads are posted to ${relay.url}` : "Dry run: leads are saved but not sent. Set RELAY_MODE=live in server/.env to go live."}
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset ${
        live ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-amber-50 text-amber-800 ring-amber-600/25"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${live ? "bg-emerald-500" : "bg-amber-500"}`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`} />
      </span>
      {live ? "Live · sending to client" : "Dry run"}
    </span>
  );
}

/* ───────────────────────── Campaign brief ───────────────────────── */

function BriefCover({ asset, shortName }) {
  if (asset.image) {
    return (
      <Image
        src={asset.image}
        alt={`${asset.tagline || shortName} cover`}
        width={676}
        height={870}
        className="mx-auto h-auto w-[150px] rounded-md shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/10"
        priority
      />
    );
  }
  return (
    <div className="relative mx-auto aspect-[676/870] w-[150px] overflow-hidden rounded-md bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 p-3.5 text-white shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/10">
      <div className="absolute -bottom-8 -right-8 h-24 w-24 rotate-12 bg-emerald-500/90" />
      <p className="relative text-[8px] font-semibold uppercase tracking-[0.18em] text-sky-200">{shortName} report</p>
      <p className="relative mt-2 text-[15px] font-extrabold leading-tight">{asset.tagline || asset.title}</p>
      <div className="relative mt-3 space-y-1">
        {[78, 64, 90, 52].map((w, i) => (
          <div key={i} className="h-1 rounded-full bg-white/25" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

function BriefRow({ label, children }) {
  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function BriefPanel({ campaign, relay }) {
  const { asset, hidden, competitors = [] } = campaign;
  const [showHidden, setShowHidden] = useState(true);
  const [allFeatures, setAllFeatures] = useState(false);
  const features = asset.features || [];
  const hiddenEntries = Object.entries(hidden);

  return (
    <div className="overflow-hidden">
      <div className="flex justify-center border-b border-slate-100 bg-slate-50 px-5 py-6">
        <BriefCover asset={asset} shortName={campaign.shortName} />
      </div>

      <div className="px-5 py-4">
        <h3 className="text-[15px] font-semibold leading-snug text-slate-900">{asset.title}</h3>
        {asset.description && <p className="mt-2 text-sm leading-relaxed text-slate-500">{asset.description}</p>}
        {!asset.image && <p className="mt-2 text-xs text-amber-700">Cover graphic not added yet.</p>}
      </div>

      <dl className="grid grid-cols-2 border-t border-slate-100 text-sm">
        <div className="border-r border-slate-100 px-5 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Category</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{campaign.category}</dd>
        </div>
        <div className="px-5 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Asset type</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{hidden.asset_type || "—"}</dd>
        </div>
      </dl>

      {asset.vendors?.length > 0 && (
        <BriefRow label="Compared">
          <div className="flex flex-wrap gap-1.5">
            {asset.vendors.map((v) => (
              <span key={v} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                {v}
              </span>
            ))}
          </div>
        </BriefRow>
      )}

      {features.length > 0 && (
        <BriefRow label={`Features compared (${features.length})`}>
          <ul className="space-y-1">
            {(allFeatures ? features : features.slice(0, 5)).map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> {f}
              </li>
            ))}
          </ul>
          {features.length > 5 && (
            <button onClick={() => setAllFeatures((v) => !v)} className="mt-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              {allFeatures ? "Show less" : `Show all ${features.length}`}
            </button>
          )}
        </BriefRow>
      )}

      {competitors.length > 0 && (
        <BriefRow label="Blocked competitors">
          <p className="mb-2 flex items-start gap-1.5 text-xs text-slate-500">
            <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-red-500" />
            Leads matching these companies or email domains are rejected.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {competitors.map((c) => (
              <span key={c} className="rounded border border-red-200 bg-red-50/60 px-2 py-0.5 text-xs font-medium text-red-700">
                {c}
              </span>
            ))}
          </div>
        </BriefRow>
      )}

      <div className="border-t border-slate-100">
        <button
          onClick={() => setShowHidden((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-slate-50"
          aria-expanded={showHidden}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Lock className="h-4 w-4 text-slate-400" /> Hidden fields
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">{hiddenEntries.length}</span>
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showHidden ? "rotate-180" : ""}`} />
        </button>
        {showHidden && (
          <div className="animate-fade-in border-t border-slate-100 bg-slate-50/60">
            <table className="w-full text-xs">
              <tbody>
                {hiddenEntries.map(([code, value]) => (
                  <tr key={code} className="border-b border-slate-100 last:border-0">
                    <td className="w-[42%] px-5 py-2 align-top font-mono text-[11px] text-slate-500">{code}</td>
                    <td className="break-words py-2 pr-5 text-slate-800">{value === "" ? <span className="italic text-slate-400">blank</span> : value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-slate-100 px-5 py-2.5 font-mono text-[11px] text-slate-500">
              POST {relay.url} · {relay.contentType === "json" ? "JSON" : "form-urlencoded"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Summary bar + drawer ───────────────────────── */

function CampaignSummary({ campaign, onOpen }) {
  const { asset, hidden, competitors = [] } = campaign;
  const chips = [
    ["Category", campaign.category],
    ["Asset", hidden.asset_type],
    ["Campaign", hidden.campaign],
  ].filter(([, v]) => v);
  return (
    <section className={`${PANEL} flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center`}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="hidden shrink-0 sm:block">
          <div className="w-12 overflow-hidden rounded ring-1 ring-slate-900/10">
            {asset.image ? (
              <Image src={asset.image} alt="" width={676} height={870} className="h-auto w-full" />
            ) : (
              <div className="flex aspect-[676/870] items-center justify-center bg-gradient-to-br from-sky-600 to-indigo-800 text-[9px] font-bold text-white">
                {campaign.shortName}
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold text-slate-900 lg:line-clamp-1">{asset.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chips.map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600">
                <span className="text-slate-400">{k}</span> <span className="font-medium text-slate-700">{v}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {competitors.length > 0 && (
          <button onClick={onOpen} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-red-50/60 px-2.5 text-xs font-medium text-red-700 hover:bg-red-50">
            <ShieldAlert className="h-3.5 w-3.5" /> {competitors.length} blocked competitors
          </button>
        )}
        <button onClick={onOpen} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
          <Lock className="h-3.5 w-3.5 text-slate-400" /> {Object.keys(hidden).length} hidden fields
        </button>
        <button onClick={onOpen} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800">
          Campaign details <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

function DetailsDrawer({ campaign, relay, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Campaign details">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{campaign.shortName} campaign</p>
            <h3 className="text-sm font-semibold text-slate-900">Campaign details</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <BriefPanel campaign={campaign} relay={relay} />
        </div>
      </div>
    </div>,
    document.body
  );
}

function LeadDrawer({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    // Escapes already handled by a dropdown or the confirm dialog don't close the drawer
    const onKey = (e) => e.key === "Escape" && !e.defaultPrevented && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Portal to <body>: a transformed ancestor would otherwise trap position:fixed inside the page
  return createPortal(
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open} inert={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/35 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="New lead"
        className={`absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {children}
      </aside>
    </div>,
    document.body
  );
}

/* ───────────────────────── Result ───────────────────────── */

const RESULT_STYLES = {
  sent: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", title: "Lead sent to the client" },
  dry_run: { icon: FlaskConical, color: "text-amber-600", bg: "bg-amber-50", title: "Dry run complete" },
  failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", title: "Relay rejected the lead" },
};

function ThankYouMessage({ thankYou }) {
  const { message, reportName } = thankYou;
  const parts = reportName && message.includes(reportName) ? message.split(reportName) : [message];
  const bold = (text) =>
    text.split(/(inbox)/).map((t, i) => (t === "inbox" ? <strong key={i} className="font-semibold text-slate-800">inbox</strong> : t));
  return (
    <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-slate-600">
      {parts.length === 2 ? (
        <>
          {bold(parts[0])}
          <strong className="font-semibold text-slate-800">{reportName}</strong>
          {bold(parts[1])}
        </>
      ) : (
        bold(message)
      )}
    </p>
  );
}

function ResultPanel({ result, campaign, live, recordsHref, onRetry, onReset, onClose }) {
  const toast = useToast();
  const [showPayload, setShowPayload] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const { lead } = result;
  const relay = lead.relay || {};
  const style = RESULT_STYLES[relay.status] || RESULT_STYLES.failed;
  const payloadEntries = Object.entries(relay.payload || {});

  const copyPayload = async () => {
    await navigator.clipboard?.writeText(JSON.stringify(relay.payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const retry = async () => {
    setRetrying(true);
    try {
      const res = await apiFetch(`/submissions/${lead._id}/retry`, { method: "POST" });
      onRetry({ ok: true, message: res.message, lead: res.lead });
      toast(res.message);
    } catch (err) {
      if (err.data?.lead) onRetry({ ok: false, message: err.message, lead: err.data.lead });
      toast(err.message, "error");
    } finally {
      setRetrying(false);
    }
  };

  const thankYou = campaign?.thankYou;
  const ok = relay.status === "sent" || relay.status === "dry_run";
  const delivery =
    relay.status === "sent"
      ? {
          cls: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
          icon: CheckCircle2,
          text: `Delivered · relay replied HTTP ${relay.httpStatus}${relay.durationMs ? ` in ${relay.durationMs} ms` : ""}`,
        }
      : relay.status === "dry_run"
        ? { cls: "bg-amber-50 text-amber-800 ring-amber-600/25", icon: FlaskConical, text: "Dry run · nothing was sent to the client" }
        : { cls: "bg-red-50 text-red-700 ring-red-600/20", icon: XCircle, text: relay.error || "Relay rejected the lead" };
  const DeliveryIcon = delivery.icon;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-white">
      <div className="flex justify-end px-4 pt-3">
        {onClose && (
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Hero */}
      <div className="border-b border-slate-100 px-6 pb-7 pt-1 text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${ok ? "bg-emerald-50" : "bg-red-50"}`}>
          {ok ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
        </div>
        {ok && thankYou ? (
          <>
            <h3 className="mt-4 text-[26px] font-bold leading-tight tracking-tight text-sky-600">{thankYou.title}</h3>
            <ThankYouMessage thankYou={thankYou} />
          </>
        ) : (
          <>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">{style.title}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{result.message}</p>
          </>
        )}
        <span className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${delivery.cls}`}>
          <DeliveryIcon className="h-3.5 w-3.5" /> {delivery.text}
        </span>
        {ok && thankYou && (
          <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-slate-400">
            {relay.status === "sent"
              ? "This mirrors the client's thank-you page. The relay accepted the lead; the report email and follow-up are sent from the client's side."
              : "Preview of the client's thank-you page. Nothing was sent, so the prospect will not receive anything yet."}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 sm:grid-cols-3">
        {[
          ["Lead", lead.name],
          ["Email", relay.payload?.email || lead.email],
          ["Company", lead.company],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 px-6 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k}</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap justify-center gap-2 border-b border-slate-100 px-6 py-4">
        <button onClick={onReset} className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700">
          <RefreshCw className="h-4 w-4" /> Submit another lead
        </button>
        {(relay.status === "failed" || (relay.status === "dry_run" && live)) && (
          <button
            onClick={retry}
            disabled={retrying}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {retrying ? <Spinner className="h-4 w-4 border-2" /> : <Send className="h-4 w-4" />}
            {relay.status === "failed" ? "Retry" : "Send to client"}
          </button>
        )}
        <Link
          href={recordsHref}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <FolderOpen className="h-4 w-4 text-slate-500" /> Open records
        </Link>
      </div>

      <div className="flex items-center justify-between px-6 py-3">
        <button onClick={() => setShowPayload((s) => !s)} className="flex items-center gap-2 text-sm font-medium text-slate-800">
          {showPayload ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
          {relay.status === "dry_run" ? "Payload that would be sent" : "Payload sent"}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{payloadEntries.length}</span>
        </button>
        <button onClick={copyPayload} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      {showPayload && (
        <div className="max-h-[420px] overflow-y-auto border-t border-slate-100">
          <table className="w-full text-left text-xs">
            <tbody>
              {payloadEntries.map(([k, v]) => (
                <tr key={k} className="border-b border-slate-100 last:border-0 odd:bg-slate-50/50">
                  <td className="w-52 whitespace-nowrap px-6 py-2 font-mono text-slate-500">{k}</td>
                  <td className="break-all px-6 py-2 text-slate-800">{v === "" ? <span className="italic text-slate-400">blank</span> : v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {relay.response && relay.status !== "dry_run" && (
        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Relay response {relay.httpStatus ? `· HTTP ${relay.httpStatus}` : ""} {relay.durationMs ? `· ${relay.durationMs} ms` : ""}
          </p>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-900 p-3 font-mono text-[11px] text-slate-100">{relay.response}</pre>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Recent submissions (sheet) ───────────────────────── */

const STATUS_LABEL = { sent: "Sent", dry_run: "Dry run", failed: "Failed", not_sent: "Not sent" };
const RECENT_COLUMNS = [
  { key: "email", label: "Email" },
  { key: "first_name", label: "First name", width: 110 },
  { key: "last_name", label: "Last name", width: 110 },
  { key: "company_name", label: "Company" },
  { key: "company_size", label: "Company size", width: 120 },
  { key: "phone_number", label: "Phone" },
  { key: "country", label: "Country", width: 120 },
  { key: "timeframe_to_decision", label: "Timeframe", width: 160 },
  { key: "_status", label: "Relay status", meta: true, width: 110 },
  { key: "_submittedAt", label: "Submitted at", meta: true, width: 160 },
  { key: "_by", label: "Submitted by", meta: true, width: 110 },
];

const istMonth = (d) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(new Date(d));
  return `${p.find((x) => x.type === "year").value}-${p.find((x) => x.type === "month").value}`;
};

const SCOUT_RECENT_COLUMNS = [
  { key: "email", label: "Email" },
  { key: "first_name", label: "First name", width: 110 },
  { key: "last_name", label: "Last name", width: 110 },
  { key: "phone_number", label: "Phone" },
  { key: "company_name", label: "Company" },
  { key: "postal_code", label: "Zip", width: 90 },
  { key: "conversion", label: "Conversion", width: 120 },
  { key: "_submittedAt", label: "Submitted at", meta: true, width: 160 },
  { key: "_by", label: "Submitted by", meta: true, width: 110 },
];

function RecentSubmissions({ campaignKey, shortName, recordsHref, refreshKey, columns = RECENT_COLUMNS }) {
  const router = useRouter();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    apiFetch(`/submissions?limit=8&campaign=${encodeURIComponent(campaignKey)}`)
      .then((d) =>
        setRows(
          d.submissions.map((s) => ({
            ...(s.relay?.payload || {}),
            email: s.relay?.payload?.email || s.email,
            _id: s._id,
            _month: istMonth(s.createdAt),
            _status: STATUS_LABEL[s.relay?.status] || "Not sent",
            _statusKey: s.relay?.status || "not_sent",
            _submittedAt: new Date(s.relay?.sentAt || s.createdAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            _by: s.submittedBy?.name || "",
          }))
        )
      )
      .catch(() => setRows([]));
  }, [campaignKey, refreshKey]);

  return (
    <section className={`${PANEL} overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">Recent submissions</h3>
          <p className="text-sm text-slate-500">Latest {shortName} leads. Click a row to open that month&apos;s records.</p>
        </div>
        <Link
          href={recordsHref}
          className="group inline-flex h-9 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:self-auto"
        >
          <FolderOpen className="h-4 w-4 text-amber-500" /> Open records (Jan to Dec)
          <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="p-4">
        {rows === null ? (
          <Skeleton className="h-56 rounded-lg" />
        ) : (
          <SheetTable
            columns={columns}
            rows={rows}
            sheetName={`${shortName} · Recent`}
            maxHeight={360}
            emptyText={`No ${shortName} leads submitted yet.`}
            onRowClick={(r) => router.push(`${recordsHref}?month=${r._month}`)}
          />
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── BuyerZone Scout campaigns (GPS Fleet, Payroll) ───────────────────────── */

function ScoutSubmitView({ campaign, recordsHref }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saved, setSaved] = useState(null); // last copy saved in LeadHub (or the error)
  const { scout } = campaign;

  const openForm = () => {
    setSaved(null);
    setFormKey((k) => k + 1); // fresh, empty Scout form every time
    setOpen(true);
  };

  // "N" opens a new lead form (when not typing somewhere)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
      e.preventDefault();
      setSaved(null);
      setFormKey((k) => k + 1);
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Scout confirmed the submission → save LeadHub's copy (retries a few times so a copy isn't lost)
  const onConversion = async ({ ref, upsell, fields }) => {
    const body = JSON.stringify({ ref, upsell, fields });
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await apiFetch(`/submissions/${campaign.key}/scout`, { method: "POST", body });
        setSaved({ ok: true, lead: res.lead });
        setRefreshKey((k) => k + 1);
        if (!res.duplicate) toast(res.lead?.email || res.lead?.name || "", "success", { title: `${campaign.shortName} lead submitted · copy saved` });
        return;
      } catch (err) {
        if (attempt === 3 || (err.status && err.status < 500)) {
          setSaved({ ok: false, message: err.message });
          toast(err.message, "error", { title: "Sent to BuyerZone, but the LeadHub copy was not saved" });
          return;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  };

  return (
    <div className="space-y-4 xl:space-y-5">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Lead capture <span className="mx-1 text-slate-300">/</span> BuyerZone Scout
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2.5">
            <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{campaign.name}</h2>
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live · BuyerZone
            </span>
          </div>
          <p className="mt-0.5 hidden truncate text-sm text-slate-500 lg:block">
            Enter the prospect in the client&apos;s Scout form. It goes to BuyerZone and a copy is saved in LeadHub.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={recordsHref}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FolderOpen className="h-4 w-4 text-slate-500" /> Records
          </Link>
          <button
            onClick={openForm}
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> New lead
            <kbd className="hidden rounded border border-white/30 px-1 font-mono text-[10px] text-indigo-100 lg:inline">N</kbd>
          </button>
        </div>
      </header>

      <TargetCard campaignKey={campaign.key} refreshKey={refreshKey} />

      <section className={`${PANEL} flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{campaign.asset.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[
              ["Form", "BuyerZone Scout"],
              ["Embed ID", scout.embedId],
              ["Source ID", scout.sourceId],
              ["Configuration", scout.configName],
            ].map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600">
                <span className="text-slate-400">{k}</span> <span className="font-medium text-slate-700">{v}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <button
        onClick={openForm}
        className="group flex w-full items-center gap-4 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 px-5 py-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition group-hover:scale-105">
          <Plus className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">Submit a new {campaign.shortName} lead</span>
          <span className="block text-xs text-slate-500">Opens the client&apos;s Scout form in a side panel · a copy of every submitted lead is saved here</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-indigo-500 transition group-hover:translate-x-0.5" />
      </button>

      <LeadDrawer open={open} onClose={() => setOpen(false)}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">{campaign.shortName} · New lead · BuyerZone Scout</p>
            <h3 className="truncate text-base font-semibold text-slate-900">{campaign.name}</h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close form"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        {saved && (
          <div
            className={`flex shrink-0 items-center gap-3 border-b px-4 py-3 sm:px-5 ${saved.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
            role="status"
          >
            {saved.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />}
            <p className={`min-w-0 flex-1 text-sm ${saved.ok ? "text-emerald-800" : "text-red-700"}`}>
              {saved.ok ? (
                <>
                  Submitted to BuyerZone · copy saved in LeadHub
                  {saved.lead?.email ? <span className="font-medium"> ({saved.lead.email})</span> : null}
                </>
              ) : (
                `Sent to BuyerZone, but the LeadHub copy was not saved: ${saved.message}`
              )}
            </p>
            <button
              onClick={openForm}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Next lead
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          {open && (
            <div className="mx-auto max-w-[480px]">
              <ScoutWidget key={formKey} embedId={scout.embedId} sourceId={scout.sourceId} onConversion={onConversion} />
            </div>
          )}
        </div>
      </LeadDrawer>

      <RecentSubmissions
        campaignKey={campaign.key}
        shortName={campaign.shortName}
        recordsHref={recordsHref}
        refreshKey={refreshKey}
        columns={SCOUT_RECENT_COLUMNS}
      />
    </div>
  );
}
