"use client";

import { useEffect, useState } from "react";
import { X, Mail, Phone, Building2, Globe, CalendarDays, MessageSquareText, Trash2, Copy, Check } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import StatusSelect from "./StatusSelect";
import { formatDate, timeAgo } from "@/lib/leads";

export default function LeadDrawer({ lead, onClose, onStatusChange, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!lead) return null;

  const copy = async (value, key) => {
    await navigator.clipboard?.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const rows = [
    { key: "email", icon: Mail, label: "Email", value: lead.email, href: `mailto:${lead.email}`, copy: true },
    { key: "phone", icon: Phone, label: "Phone", value: lead.phone, href: lead.phone && `tel:${lead.phone.replace(/\s/g, "")}`, copy: true },
    { key: "company", icon: Building2, label: "Company", value: lead.company },
    { key: "source", icon: Globe, label: "Source", value: lead.source, capitalize: true },
    { key: "date", icon: CalendarDays, label: "Submitted", value: `${formatDate(lead.createdAt)} · ${timeAgo(lead.createdAt)}` },
  ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Lead details for ${lead.name}`}>
      <div className="absolute inset-0 animate-fade-in bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-100 px-6 pb-6 pt-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-transparent" />
          <div className="relative flex justify-end">
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative mt-1 flex items-center gap-4">
            <Avatar name={lead.name} size="xl" />
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold text-slate-900">{lead.name}</h3>
              <p className="truncate text-sm text-slate-500">{lead.company || "No company"}</p>
            </div>
          </div>
          <div className="relative mt-5 flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Stage</span>
            <StatusSelect value={lead.status} onChange={(s) => onStatusChange(lead, s)} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <dl className="space-y-1">
            {rows.map(({ key, icon: Icon, label, value, href, copy: canCopy, capitalize }) => (
              <div key={key} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className={`truncate text-sm font-medium text-slate-900 ${capitalize ? "capitalize" : ""}`}>
                    {value ? (
                      href ? (
                        <a href={href} className="hover:text-indigo-600 hover:underline">{value}</a>
                      ) : (
                        value
                      )
                    ) : (
                      <span className="text-slate-400">Not provided</span>
                    )}
                  </dd>
                </div>
                {canCopy && value && (
                  <button
                    onClick={() => copy(value, key)}
                    className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-white hover:text-slate-600 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Copy ${label}`}
                  >
                    {copied === key ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
            ))}
          </dl>

          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <MessageSquareText className="h-3.5 w-3.5" /> Message
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700">
              {lead.message || <span className="text-slate-400">No message was included.</span>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-slate-100 p-4">
          {confirming ? (
            <>
              <p className="flex-1 text-sm text-slate-600">Delete this lead permanently?</p>
              <button onClick={() => setConfirming(false)} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={() => onDelete(lead)} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <a
                href={`mailto:${lead.email}`}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:shadow-lg"
              >
                <Mail className="h-4 w-4" /> Send email
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
