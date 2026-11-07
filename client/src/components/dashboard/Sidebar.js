"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserCog, LogOut, X, ChevronsLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { CAMPAIGN_NAV } from "@/lib/campaignNav";
import Avatar from "@/components/ui/Avatar";

export const navSections = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Your pipeline at a glance" }],
  },
  {
    title: "Lead Capture",
    items: CAMPAIGN_NAV.map((c) => ({
      href: c.href,
      label: c.label,
      icon: c.icon,
      description: c.enabled ? `Submit a lead · ${c.description}` : c.description,
      disabled: !c.enabled,
    })),
  },
  {
    title: "Account",
    items: [{ href: "/dashboard/profile", label: "Admin Profile", icon: UserCog, description: "Your account, security and session" }],
  },
];

export const navItems = navSections.flatMap((s) => s.items);

// Pages reachable from links but not listed in the sidebar (used for the breadcrumb)
export const pageItems = [
  ...navItems.filter((i) => !i.disabled),
  { href: "/dashboard/leads", label: "Leads", description: "All leads" },
  { href: "/dashboard/submit", label: "Submit Lead", description: "Send a lead to the client relay" },
  ...CAMPAIGN_NAV.filter((c) => c.enabled).map((c) => ({ href: `${c.href}/records`, label: `${c.label} · Records`, description: "Monthly records" })),
];

export const isActive = (pathname, href) =>
  href === "/dashboard" ? pathname === href : pathname.startsWith(href);

export default function Sidebar({ open, collapsed, onClose, onToggleCollapse, onLogout, user }) {
  const pathname = usePathname();

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 lg:translate-x-0 ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        } ${collapsed ? "lg:w-[72px]" : "lg:w-60"} w-64`}
      >
        {/* Brand */}
        <div className={`flex h-14 items-center border-b border-slate-100 ${collapsed ? "lg:justify-center lg:px-0" : ""} justify-between px-5`}>
          <Link href="/dashboard" onClick={onClose}>
            <span className="lg:hidden"><Logo /></span>
            <span className="hidden lg:block"><Logo collapsed={collapsed} /></span>
          </Link>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="absolute -right-3 top-[44px] hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.title}>
              <p
                className={`mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map(({ href, label, icon: Icon, disabled }) => {
                  const active = isActive(pathname, href);
                  if (disabled) {
                    return (
                      <li key={href}>
                        <div
                          title={`${label} (coming soon)`}
                          aria-disabled="true"
                          className={`flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 ${
                            collapsed ? "lg:justify-center lg:px-0" : ""
                          }`}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0 text-slate-300" />
                          <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
                          <span
                            className={`ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${
                              collapsed ? "lg:hidden" : ""
                            }`}
                          >
                            Soon
                          </span>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        title={collapsed ? label : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                          collapsed ? "lg:justify-center lg:px-0" : ""
                        } ${
                          active
                            ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                        )}
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                            active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        />
                        <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 p-3">
          <div
            className={`flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 ${collapsed ? "lg:justify-center lg:bg-transparent lg:p-0" : ""}`}
          >
            <Link href="/dashboard/profile" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3" title="Admin profile">
              <Avatar name={user?.name} size="sm" />
              <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </Link>
            <button
              onClick={onLogout}
              className={`rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 ${collapsed ? "lg:hidden" : ""}`}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
