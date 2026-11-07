"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { apiFetch } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/submit", label: "Submit Lead" },
  { href: "/dashboard/profile", label: "Admin Profile" },
];

const STATUS = {
  checking: { dot: "bg-slate-300", text: "Checking status...", pulse: false },
  ok: { dot: "bg-emerald-500", text: "All systems operational", pulse: true },
  degraded: { dot: "bg-amber-500", text: "Database unavailable", pulse: false },
  down: { dot: "bg-red-500", text: "API unreachable", pulse: false },
};

/** variant "app" (dashboard) shows page links; "public" (login) hides them since they need sign-in. */
export default function Footer({ variant = "app" }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const check = () =>
      apiFetch("/health")
        .then((d) => setStatus(d.database === "connected" ? "ok" : "degraded"))
        .catch(() => setStatus("down"));
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  const s = STATUS[status];

  return (
    <footer className="border-t border-slate-200/70 bg-white/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3.5 sm:px-5 md:flex-row md:items-center md:justify-between xl:px-7">
        <div className="flex items-center gap-3">
          <div className="hidden scale-90 opacity-90 sm:block">
            <Logo />
          </div>
          <span className="hidden h-4 w-px bg-slate-200 sm:block" />
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} LeadHub. All rights reserved.</p>
        </div>

        {variant === "app" && (
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs font-medium text-slate-500 transition hover:text-indigo-600">
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
            role="status"
          >
            <span className="relative flex h-2 w-2">
              {s.pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${s.dot}`} />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
            </span>
            {s.text}
          </span>
        </div>
      </div>
    </footer>
  );
}
