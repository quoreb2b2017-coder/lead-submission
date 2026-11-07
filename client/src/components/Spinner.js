export default function Spinner({ className = "h-8 w-8" }) {
  return (
    <div
      className={`animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-[#f6f7fb]">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-indigo-400/30" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 17l5-5 4 4 7-8" />
            <path d="M15 8h5v5" />
          </svg>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-500" role="status">Loading your workspace...</p>
    </div>
  );
}
