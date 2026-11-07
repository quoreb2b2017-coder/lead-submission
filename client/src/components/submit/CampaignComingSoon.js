import Link from "next/link";
import { Clock } from "lucide-react";

/** Shown when a campaign page is opened directly while the campaign is still disabled in campaignNav. */
export default function CampaignComingSoon({ label }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Clock className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{label}</h2>
      <p className="mt-1 text-sm text-slate-500">This campaign isn&apos;t active yet. It will be available here once it is switched on.</p>
      <Link href="/dashboard" className="mt-5 inline-flex h-9 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
        Back to dashboard
      </Link>
    </div>
  );
}
