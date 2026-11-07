export default function Logo({ dark = false, collapsed = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </div>
      {!collapsed && (
        <span className={`text-lg font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
          Lead<span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">Hub</span>
        </span>
      )}
    </div>
  );
}
