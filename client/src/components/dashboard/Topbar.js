"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, ChevronDown, ChevronRight, LogOut, UserCog, Bell, Home, Send, BellOff } from "lucide-react";
import { pageItems, isActive } from "./Sidebar";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/leads";

const SEEN_KEY = "notifications-seen-at";

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onClose]);
}

export default function Topbar({ user, onMenuClick, onLogout }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [recent, setRecent] = useState([]);
  const [seenAt, setSeenAt] = useState(() =>
    typeof window === "undefined" ? 0 : Number(localStorage.getItem(SEEN_KEY) || 0)
  );
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  useOutsideClose(menuRef, () => setMenuOpen(false));
  useOutsideClose(notifRef, () => setNotifOpen(false));

  // Most specific match wins (e.g. /dashboard/submit/hris over /dashboard/submit)
  const current =
    pageItems.filter((i) => isActive(pathname, i.href)).sort((x, y) => y.href.length - x.href.length)[0] || pageItems[0];
  const unread = recent.filter((l) => new Date(l.createdAt).getTime() > seenAt).length;

  useEffect(() => {
    apiFetch("/leads?limit=6")
      .then((d) => setRecent(d.leads))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleNotifications = () => {
    setNotifOpen((open) => !open);
    setMenuOpen(false);
  };

  const markAllRead = () => {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, String(now));
    setSeenAt(now);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/dashboard/leads?q=${encodeURIComponent(q)}` : "/dashboard/leads");
    searchRef.current?.blur();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-5 xl:px-7">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden min-w-0 shrink-0 items-center gap-1.5 text-sm md:flex">
          <Link
            href="/dashboard"
            className="flex items-center rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="max-w-[16rem] truncate font-semibold text-slate-900">{current.label}</span>
        </nav>

        {/* Search */}
        <form onSubmit={submitSearch} className="ml-auto w-full max-w-[18rem] md:ml-6 xl:max-w-sm">
          <div className="group relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm xl:pr-14 text-slate-900 transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400 xl:block">
              Ctrl K
            </kbd>
          </div>
        </form>

        <div className="flex items-center gap-1.5 md:ml-auto">
          {/* Quick link */}
          <Link
            href="/dashboard/submit"
            className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:shadow-lg hover:shadow-indigo-600/30 xl:inline-flex"
          >
            <Send className="h-4 w-4" /> Submit lead
          </Link>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={toggleNotifications}
              className={`relative rounded-xl p-2 transition ${notifOpen ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              aria-haspopup="dialog"
              aria-expanded={notifOpen}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 [animation-duration:200ms]">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                    <p className="text-xs text-slate-500">{unread ? `${unread} new since your last check` : "You're all caught up"}</p>
                  </div>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
                      Mark all read
                    </button>
                  )}
                </div>

                {recent.length ? (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {recent.map((lead) => {
                      const isNew = new Date(lead.createdAt).getTime() > seenAt;
                      return (
                        <li key={lead._id}>
                          <Link
                            href={`/dashboard/leads?q=${encodeURIComponent(lead.email)}`}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50"
                          >
                            <Avatar name={lead.name} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">{lead.name}</span> submitted a new lead
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <StatusBadge status={lead.status} />
                                <span className="text-xs text-slate-400">{timeAgo(lead.createdAt)}</span>
                              </div>
                            </div>
                            {isNew && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-label="Unread" />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center px-4 py-10 text-center">
                    <BellOff className="h-6 w-6 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">No notifications yet</p>
                  </div>
                )}

                <Link
                  href="/dashboard/leads"
                  onClick={() => setNotifOpen(false)}
                  className="block border-t border-slate-100 py-2.5 text-center text-sm font-medium text-indigo-600 hover:bg-slate-50"
                >
                  View all leads
                </Link>
              </div>
            )}
          </div>

          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

          {/* Profile menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setMenuOpen((o) => !o);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2.5 rounded-xl p-1 pr-2 transition hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <div className="relative">
                <Avatar name={user?.name} size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="hidden text-left lg:block">
                <p className="max-w-32 truncate text-sm font-semibold leading-tight text-slate-900">{user?.name}</p>
                <p className="text-xs capitalize leading-tight text-slate-500">{user?.role}</p>
              </div>
              <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 [animation-duration:200ms]"
              >
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 px-3 py-3">
                  <Avatar name={user?.name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <div className="my-1.5 h-px bg-slate-100" />
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  role="menuitem"
                >
                  <UserCog className="h-4 w-4 text-slate-400" /> Admin profile
                </Link>
                <Link
                  href="/dashboard/submit"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  role="menuitem"
                >
                  <Send className="h-4 w-4 text-slate-400" /> Submit lead
                </Link>
                <div className="my-1.5 h-px bg-slate-100" />
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
