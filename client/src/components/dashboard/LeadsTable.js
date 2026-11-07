import { Inbox } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, timeAgo } from "@/lib/leads";

export function EmptyState({ title = "No leads found", text = "New leads will appear here as they come in.", action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-indigo-200/40 blur-xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Inbox className="h-6 w-6 text-indigo-500" />
        </div>
      </div>
      <p className="mt-4 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Compact table for the dashboard overview. */
export default function LeadsTable({ leads }) {
  if (!leads.length) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-slate-400">
            <th className="px-6 py-3 font-semibold">Lead</th>
            <th className="hidden px-4 py-3 font-semibold md:table-cell">Company</th>
            <th className="hidden px-4 py-3 font-semibold sm:table-cell">Source</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-6 py-3 text-right font-semibold">Added</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead._id} className="border-t border-slate-100 transition hover:bg-slate-50/70">
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={lead.name} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{lead.name}</p>
                    <p className="truncate text-xs text-slate-500">{lead.email}</p>
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3.5 text-slate-600 md:table-cell">{lead.company || "—"}</td>
              <td className="hidden px-4 py-3.5 sm:table-cell">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-600">{lead.source}</span>
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={lead.status} />
              </td>
              <td className="whitespace-nowrap px-6 py-3.5 text-right text-xs text-slate-500" title={formatDate(lead.createdAt)}>
                {timeAgo(lead.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
