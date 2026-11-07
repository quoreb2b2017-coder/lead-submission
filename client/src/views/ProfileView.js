"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Check,
  Clock,
  Copy,
  Download,
  Lock,
  RefreshCw,
  ShieldOff,
  Smartphone as PhoneIcon,
  Crosshair,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
  Smartphone,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/leads";
import { CAMPAIGN_NAV } from "@/lib/campaignNav";
import { Skeleton } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/ui/Toast";
import OtpInput from "@/components/ui/OtpInput";

const PANEL = "rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const TABS = [
  { key: "profile", label: "Personal information", icon: UserRound, hint: "Name and sign-in email" },
  { key: "security", label: "Password & security", icon: KeyRound, hint: "Change your password" },
  { key: "2fa", label: "Two-step verification", icon: Lock, hint: "Authenticator app (2FA)" },
  { key: "session", label: "Sessions & location", icon: Laptop, hint: "Device, area, sign-ins" },
  { key: "activity", label: "My activity", icon: Activity, hint: "Leads you submitted" },
];

export default function ProfileView() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    apiFetch("/dashboard?campaign=all&days=30")
      .then((d) => setStats(d.kpis))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4 xl:space-y-5">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Account <span className="mx-1 text-slate-300">/</span> Admin profile
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Admin profile</h2>
        <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">Manage your details, password and session.</p>
      </header>

      <IdentityPanel user={user} stats={stats} />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-5">
        {/* Tabs */}
        <nav aria-label="Profile sections" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <ul className={`${PANEL} flex gap-1 overflow-x-auto p-1.5 lg:flex-col`}>
            {TABS.map(({ key, label, icon: Icon, hint }) => {
              const active = tab === key;
              return (
                <li key={key} className="shrink-0">
                  <button
                    onClick={() => setTab(key)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-sm font-medium">{label}</span>
                      <span className="hidden text-xs text-slate-400 lg:block">{hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {tab === "profile" && <PersonalInfo />}
          {tab === "security" && <Security />}
          {tab === "2fa" && <TwoFactor />}
          {tab === "session" && <Session />}
          {tab === "activity" && <MyActivity />}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Identity ───────────────────────── */

function IdentityPanel({ user, stats }) {
  const [copied, setCopied] = useState(false);
  const copyId = async () => {
    await navigator.clipboard?.writeText(user?._id || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const items = [
    { icon: Users, label: "Submitted", value: stats?.allTime },
    { icon: Send, label: "Sent (30 days)", value: stats?.sent },
    { icon: Target, label: "Month target", value: stats ? `${stats.monthSent} / ${stats.monthTarget ?? "–"}` : undefined },
  ];

  return (
    <section className={`${PANEL} min-w-0 overflow-hidden`}>
      <div className="h-20 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 sm:h-24" />
      <div className="flex flex-col gap-5 px-5 pb-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative -mt-10 w-fit sm:-mt-12">
            <Avatar name={user?.name} size="2xl" className="ring-4 shadow-lg" />
            <span className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-white" title="Signed in" />
          </div>
          <div className="min-w-0 pb-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-semibold text-slate-900">{user?.name}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold capitalize text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
                <BadgeCheck className="h-3.5 w-3.5" /> {user?.role}
              </span>
              {user?.twoFactor?.enabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> 2FA on
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  <ShieldOff className="h-3.5 w-3.5" /> 2FA off
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-500">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" /> {user?.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Member since {fmtDate(user?.createdAt)}</span>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span>Last sign-in {fmtDateTime(user?.lastLoginAt)}</span>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <button onClick={copyId} className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-indigo-600" title="Copy account ID">
                ID {user?._id?.slice(-8)} {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 lg:w-[420px]">
          {items.map(({ icon: Icon, label, value }, i) => (
            <div key={label} className={`px-3 py-2.5 sm:px-4 ${i < 2 ? "border-r border-slate-200" : ""}`}>
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <Icon className="hidden h-3.5 w-3.5 text-slate-400 sm:block" /> <span className="truncate">{label}</span>
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {value ?? <span className="skeleton inline-block h-5 w-10 rounded" />}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────────────────── Shared ───────────────────────── */

function SectionPanel({ title, subtitle, children, footer }) {
  return (
    <section className={`${PANEL} animate-fade-in overflow-hidden`}>
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 sm:px-6">{footer}</div>}
    </section>
  );
}

function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

const inputCls = (error) =>
  `h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    error ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10"
  }`;

const primaryBtn =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

/* ───────────────────────── Personal info ───────────────────────── */

function PersonalInfo() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const initial = useMemo(() => ({ name: user?.name || "", email: user?.email || "" }), [user]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = form.name.trim() !== initial.name || form.email.trim().toLowerCase() !== initial.email;

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError("Name must be at least 2 characters.");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("Please enter a valid email address.");
    setSaving(true);
    try {
      const { user: updated } = await apiFetch("/auth/me", { method: "PATCH", body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() }) });
      updateUser(updated);
      setForm({ name: updated.name, email: updated.email });
      toast("Your name and email are up to date.", "success", { title: "Profile updated" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <SectionPanel
        title="Personal information"
        subtitle="Shown across the admin panel and used to sign in."
        footer={
          <>
            <p className="text-xs text-slate-500">{dirty ? "You have unsaved changes." : "All changes saved."}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={() => {
                  setForm(initial);
                  setError("");
                }}
                className="h-9 rounded-lg px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60 disabled:opacity-40"
              >
                Reset
              </button>
              <button type="submit" disabled={!dirty || saving} className={primaryBtn}>
                {saving && <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" />}
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name">
            <input id="name" name="name" value={form.name} onChange={onChange} autoComplete="name" className={inputCls()} />
          </Field>
          <Field label="Email address" htmlFor="email" hint="You'll use this email to sign in.">
            <input id="email" name="email" type="email" value={form.email} onChange={onChange} autoComplete="email" className={inputCls()} />
          </Field>
          <Field label="Role" htmlFor="role" hint="Roles are managed by the system owner.">
            <input id="role" value={user?.role || ""} disabled className={`${inputCls()} cursor-not-allowed bg-slate-50 capitalize text-slate-500`} />
          </Field>
          <Field label="Member since" htmlFor="since">
            <input id="since" value={fmtDate(user?.createdAt)} disabled className={`${inputCls()} cursor-not-allowed bg-slate-50 text-slate-500`} />
          </Field>
        </div>
        {error && (
          <p className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </SectionPanel>
    </form>
  );
}

/* ───────────────────────── Security ───────────────────────── */

const RULES = [
  { test: (p) => p.length >= 8, label: "At least 8 characters" },
  { test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p), label: "Upper and lowercase letters" },
  { test: (p) => /\d/.test(p), label: "At least one number" },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: "At least one symbol" },
];
const STRENGTH = [
  { label: "Too short", bar: "bg-slate-200", text: "text-slate-500" },
  { label: "Weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Strong", bar: "bg-emerald-600", text: "text-emerald-700" },
];

function Security() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const score = form.newPassword.length < 8 ? 0 : RULES.filter((r) => r.test(form.newPassword)).length;
  const strength = STRENGTH[score];
  const mismatch = form.confirmPassword && form.confirmPassword !== form.newPassword;
  const canSubmit = form.currentPassword && score >= 2 && form.confirmPassword && !mismatch && !saving;

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await apiFetch("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      updateUser(res.user);
      setForm(empty);
      toast("Use your new password the next time you sign in.", "success", { title: "Password updated" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const pw = (id, label, autoComplete, extra) => (
    <Field label={label} htmlFor={id} error={extra}>
      <input id={id} name={id} type={show ? "text" : "password"} value={form[id]} onChange={onChange} autoComplete={autoComplete} className={inputCls(extra)} />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <SectionPanel
        title="Password & security"
        subtitle="Use a strong password you don't use anywhere else."
        footer={
          <>
            <button type="button" onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? "Hide passwords" : "Show passwords"}
            </button>
            <button type="submit" disabled={!canSubmit} className={primaryBtn}>
              {saving && <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" />}
              {saving ? "Updating..." : "Update password"}
            </button>
          </>
        }
      >
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="text-slate-600">
            Password last changed: <span className="font-medium text-slate-900">{user?.passwordChangedAt ? fmtDateTime(user.passwordChangedAt) : "never since the account was created"}</span>
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            {pw("currentPassword", "Current password", "current-password")}
            <div className="grid gap-4 sm:grid-cols-2">
              {pw("newPassword", "New password", "new-password")}
              {pw("confirmPassword", "Confirm new password", "new-password", mismatch ? "Passwords do not match" : "")}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Strength</p>
              <p className={`text-xs font-semibold ${form.newPassword ? strength.text : "text-slate-400"}`}>{form.newPassword ? strength.label : "—"}</p>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1.5 rounded-full transition-colors ${form.newPassword && i <= score ? strength.bar : "bg-slate-100"}`} />
              ))}
            </div>
            <ul className="mt-3 space-y-1.5">
              {RULES.map((r) => {
                const ok = r.test(form.newPassword);
                return (
                  <li key={r.label} className={`flex items-center gap-2 text-xs ${ok ? "text-emerald-700" : "text-slate-500"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? "bg-emerald-100" : "bg-slate-100"}`}>{ok && <Check className="h-3 w-3" />}</span>
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {error && (
          <p className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </SectionPanel>
    </form>
  );
}

/* ───────────────────────── Two-step verification ───────────────────────── */

function RecoveryCodes({ codes, email, onDone, doneLabel = "I've saved my codes" }) {
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const text = `LeadHub recovery codes for ${email}\nEach code works once. Keep them somewhere safe.\n\n${codes.join("\n")}\n`;

  const copy = async () => {
    await navigator.clipboard?.writeText(codes.join("\n"));
    toast("Paste them into your password manager.", "success", { title: "Recovery codes copied" });
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    Object.assign(document.createElement("a"), { href: url, download: "leadhub-recovery-codes.txt" }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">Save these recovery codes now.</span> They are shown only once. If you lose your phone, each code lets you sign in one time.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm sm:grid-cols-5">
        {codes.map((c) => (
          <li key={c} className="rounded-md bg-white px-2 py-1.5 text-center text-slate-800 ring-1 ring-slate-200">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Copy className="h-4 w-4" /> Copy all
        </button>
        <button type="button" onClick={download} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Download className="h-4 w-4" /> Download .txt
        </button>
      </div>
      <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-700">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-indigo-600" />
        I have saved these codes somewhere safe
      </label>
      <button type="button" disabled={!saved} onClick={onDone} className={primaryBtn}>
        <Check className="h-4 w-4" /> {doneLabel}
      </button>
    </div>
  );
}

function TwoFactor() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [step, setStep] = useState("idle"); // idle | setup | codes | regen | disable
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = () =>
    apiFetch("/auth/2fa")
      .then(setStatus)
      .catch(() => setStatus({ enabled: false, recoveryCodesLeft: 0 }));

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setStep("idle");
    setCode("");
    setPassword("");
    setError("");
    setSetup(null);
  };

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () =>
    run(async () => {
      const res = await apiFetch("/auth/2fa/setup", { method: "POST" });
      setSetup(res);
      setStep("setup");
    });

  const enable = (value = code) =>
    run(async () => {
      const res = await apiFetch("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code: value }) });
      setCodes(res.recoveryCodes);
      setStep("codes");
      updateUser({ ...user, twoFactor: { enabled: true, enabledAt: res.enabledAt } });
      toast("Your account now asks for a code from your app at sign-in.", "success", { title: "2-step verification is on" });
    });

  const regenerate = (value = code) =>
    run(async () => {
      const res = await apiFetch("/auth/2fa/recovery-codes", { method: "POST", body: JSON.stringify({ code: value }) });
      setCodes(res.recoveryCodes);
      setCode("");
      setStep("codes");
      toast("Your old recovery codes no longer work.", "success", { title: "New recovery codes created" });
    });

  const disable = () =>
    run(async () => {
      await apiFetch("/auth/2fa/disable", { method: "POST", body: JSON.stringify({ password, code: code.trim() }) });
      updateUser({ ...user, twoFactor: { enabled: false } });
      reset();
      await load();
      toast("Signing in now needs only your password.", "info", { title: "2-step verification turned off" });
    });

  const copyKey = async () => {
    await navigator.clipboard?.writeText(setup.manualKey.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const errorBox = error && (
    <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" /> {error}
    </p>
  );

  if (!status) {
    return (
      <SectionPanel title="Two-step verification" subtitle="Protect your account with an authenticator app.">
        <Skeleton className="h-32 w-full" />
      </SectionPanel>
    );
  }

  // Recovery codes (after enabling or regenerating)
  if (step === "codes") {
    return (
      <SectionPanel title="Your recovery codes" subtitle="Use one of these if you can't get a code from your phone.">
        <RecoveryCodes
          codes={codes}
          email={user?.email}
          onDone={() => {
            reset();
            load();
          }}
        />
      </SectionPanel>
    );
  }

  // Setup flow
  if (step === "setup" && setup) {
    return (
      <SectionPanel title="Set up your authenticator app" subtitle="Two quick steps. Nothing changes until you confirm a code.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] text-white">1</span> Scan this QR code
            </p>
            <p className="mt-1 text-sm text-slate-500">Open Google Authenticator, Microsoft Authenticator or Authy and add a new account.</p>
            <div className="mt-4 flex flex-col items-center gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qr} alt="QR code for your authenticator app" width={176} height={176} className="h-44 w-44 rounded-md bg-white ring-1 ring-slate-200" />
              <div className="min-w-0 text-sm">
                <p className="text-slate-500">Can&apos;t scan? Enter this key manually:</p>
                <p className="mt-1.5 rounded-md bg-slate-50 px-2.5 py-2 font-mono text-[13px] font-semibold leading-relaxed tracking-wider text-slate-800 ring-1 ring-slate-200 [word-spacing:0.25em]">{setup.manualKey}</p>
                <button type="button" onClick={copyKey} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy key"}
                </button>
                <p className="mt-3 text-xs text-slate-400">Account: LeadHub ({user?.email}) · time-based, 6 digits</p>
              </div>
            </div>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] text-white">2</span> Enter the 6-digit code
            </p>
            <p className="mt-1 text-sm text-slate-500">Type the code your app shows for LeadHub to confirm it works.</p>
            <div className="mt-4 max-w-sm space-y-4">
              <OtpInput value={code} onChange={(v) => { setCode(v); setError(""); }} onComplete={(v) => enable(v)} disabled={busy} error={Boolean(error)} />
              {errorBox}
              <div className="flex gap-2">
                <button type="button" onClick={() => enable()} disabled={busy || code.trim().length !== 6} className={primaryBtn}>
                  {busy ? <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" /> : <ShieldCheck className="h-4 w-4" />}
                  Verify and turn on
                </button>
                <button type="button" onClick={reset} disabled={busy} className="h-9 rounded-lg px-3.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionPanel>
    );
  }

  // Off
  if (!status.enabled) {
    return (
      <SectionPanel title="Two-step verification" subtitle="Add a second step to sign-in with an authenticator app.">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ShieldOff className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">2-step verification is off</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              With it on, signing in needs your password <span className="font-medium text-slate-700">and</span> a 6-digit code from an app on your phone, so a leaked password alone can&apos;t open this panel.
            </p>
          </div>
          <button onClick={startSetup} disabled={busy} className={`${primaryBtn} shrink-0`}>
            {busy ? <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" /> : <PhoneIcon className="h-4 w-4" />}
            Set up authenticator
          </button>
        </div>
        {error && <div className="mt-4">{errorBox}</div>}
        <ul className="mt-6 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
          {[
            ["Works offline", "Codes are made on your phone every 30 seconds. No SMS needed."],
            ["Recovery codes", "10 one-time backup codes in case you lose your phone."],
            ["Any authenticator", "Google Authenticator, Microsoft Authenticator, Authy and others."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-800">{t}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{d}</p>
            </li>
          ))}
        </ul>
      </SectionPanel>
    );
  }

  // On
  const lowCodes = status.recoveryCodesLeft <= 3;
  return (
    <div className="space-y-4 xl:space-y-5">
      <SectionPanel title="Two-step verification" subtitle="Your account asks for a code from your authenticator app at sign-in.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              2-step verification is on
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Protected</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">Turned on {fmtDateTime(status.enabledAt)} · Authenticator app</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className={`rounded-lg border p-4 ${lowCodes ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
            <dt className="text-xs font-medium text-slate-500">Recovery codes left</dt>
            <dd className={`mt-1 text-2xl font-semibold tabular-nums ${lowCodes ? "text-amber-700" : "text-slate-900"}`}>{status.recoveryCodesLeft} / 10</dd>
            {lowCodes && <p className="mt-1 text-xs text-amber-800">Running low. Create new codes so you don&apos;t get locked out.</p>}
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <dt className="text-xs font-medium text-slate-500">Sign-in method</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">Password + 6-digit app code</dd>
            <p className="mt-1 text-xs text-slate-500">A recovery code can replace the app code once.</p>
          </div>
        </dl>
      </SectionPanel>

      {/* Regenerate */}
      <SectionPanel title="Recovery codes" subtitle="Create a fresh set of 10 codes. Your current codes stop working.">
        {step === "regen" ? (
          <div className="max-w-sm space-y-4">
            <p className="text-sm text-slate-600">Enter the current code from your authenticator app:</p>
            <OtpInput value={code} onChange={(v) => { setCode(v); setError(""); }} onComplete={(v) => regenerate(v)} disabled={busy} error={Boolean(error)} />
            {errorBox}
            <div className="flex gap-2">
              <button type="button" onClick={() => regenerate()} disabled={busy || code.trim().length !== 6} className={primaryBtn}>
                {busy ? <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" /> : <RefreshCw className="h-4 w-4" />} Create new codes
              </button>
              <button type="button" onClick={reset} className="h-9 rounded-lg px-3.5 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => { reset(); setStep("regen"); }} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Create new recovery codes
          </button>
        )}
      </SectionPanel>

      {/* Disable */}
      <SectionPanel title="Turn off 2-step verification" subtitle="Not recommended. Your account will be protected by your password only.">
        {step === "disable" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              disable();
            }}
            className="grid max-w-xl gap-4 sm:grid-cols-2"
          >
            <Field label="Your password" htmlFor="disable-password">
              <input id="disable-password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} autoComplete="current-password" className={inputCls()} />
            </Field>
            <Field label="App code or recovery code" htmlFor="disable-code">
              <input id="disable-code" value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} placeholder="123456 or abcd-1234" autoComplete="one-time-code" className={`${inputCls()} font-mono`} />
            </Field>
            {error && <div className="sm:col-span-2">{errorBox}</div>}
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={busy || !password || !code.trim()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {busy ? <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" /> : <ShieldOff className="h-4 w-4" />} Turn off
              </button>
              <button type="button" onClick={reset} className="h-9 rounded-lg px-3.5 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => { reset(); setStep("disable"); }} className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 text-sm font-medium text-red-600 hover:bg-red-50">
            <ShieldOff className="h-4 w-4" /> Turn off 2-step verification
          </button>
        )}
      </SectionPanel>
    </div>
  );
}

/* ───────────────────────── Session ───────────────────────── */

const flag = (code) => (code && code.length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : "");

/** Ask the browser for the precise position, then name the area (BigDataCloud, free client-side endpoint). */
async function captureExactLocation() {
  if (!("geolocation" in navigator)) throw new Error("This browser can't share its location.");
  const pos = await new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
  ).catch((err) => {
    throw new Error(
      err.code === 1
        ? "Location permission was denied. Allow it from the address bar (lock icon) and try again."
        : err.code === 3
          ? "Getting your location timed out. Please try again."
          : "Your location is unavailable right now."
    );
  });
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  let label = "";
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (r.ok) {
      const g = await r.json();
      const parts = [g.locality, g.city, g.principalSubdivision, g.postcode, g.countryName].filter(Boolean);
      label = [...new Set(parts)].join(", ");
    }
  } catch {
    /* area name is optional; coordinates are enough */
  }
  return { lat, lng, accuracy, label };
}

function Session() {
  const { logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    apiFetch("/auth/sessions")
      .then(setData)
      .catch(() => setData({ current: null, recent: [] }));
  }, []);

  const shareLocation = async () => {
    setLocating(true);
    setLocError("");
    try {
      const loc = await captureExactLocation();
      const res = await apiFetch("/auth/sessions/current/location", { method: "PATCH", body: JSON.stringify(loc) });
      setData((d) => ({ ...d, current: res.session, recent: d.recent.map((e) => (e.current ? res.session : e)) }));
      toast(res.session.exactLocation.label || "Coordinates saved for this session.", "success", { title: "Exact location captured" });
    } catch (err) {
      setLocError(err.message);
    } finally {
      setLocating(false);
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    await logout();
    router.replace("/login");
  };

  const cur = data?.current;
  const loc = cur?.location;
  const exact = cur?.exactLocation;
  const mapUrl = exact ? `https://www.google.com/maps?q=${exact.lat},${exact.lng}` : null;

  return (
    <div className="space-y-4 xl:space-y-5">
      <SectionPanel
        title="Active session"
        subtitle="The device you are signed in on right now."
        footer={
          <>
            <p className="text-xs text-slate-500">Sessions expire after 7 days, or when the browser closes if “Keep me signed in” was off.</p>
            <button
              onClick={signOut}
              disabled={signingOut}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              {signingOut ? <Spinner className="h-4 w-4 border-2 border-red-200 border-t-red-600" /> : <LogOut className="h-4 w-4" />}
              Sign out
            </button>
          </>
        }
      >
        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : !cur ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Session details start with your next sign-in. Sign out and sign in again to see device, IP and location here.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Device + IP area */}
            <div className="rounded-lg border border-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  {cur.device?.mobile ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{cur.device?.label || "Browser"}</p>
                  <p className="text-xs text-slate-500">Signed in {fmtDateTime(cur.createdAt)}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> This device
                </span>
              </div>
              <dl className="divide-y divide-slate-100 text-sm">
                {[
                  ["Area (from IP)", loc?.label ? `${flag(loc.countryCode)} ${loc.label}`.trim() : "Unknown"],
                  ["IP address", cur.ip || "—"],
                  ["Time zone", loc?.timezone || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="truncate text-right font-medium text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] leading-relaxed text-slate-400">
                {loc?.private
                  ? "You're on a local/private network, so no public area is available. It appears once the app runs on the server."
                  : "Approximate: worked out from the IP address on our server (city level at best)."}
              </p>
            </div>

            {/* Exact location */}
            <div className="flex flex-col rounded-lg border border-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Exact location</p>
                  <p className="text-xs text-slate-500">{exact ? `Captured ${fmtDateTime(exact.capturedAt)}` : "Only with your permission"}</p>
                </div>
              </div>

              {exact ? (
                <div className="flex-1 space-y-3 p-4">
                  <p className="text-sm font-medium leading-snug text-slate-900">{exact.label || "Area name unavailable"}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-slate-700">
                      {exact.lat.toFixed(5)}, {exact.lng.toFixed(5)}
                    </span>
                    {exact.accuracyM != null && (
                      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">± {exact.accuracyM.toLocaleString("en-IN")} m</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
                    </a>
                    <button onClick={shareLocation} disabled={locating} className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60">
                      {locating ? <Spinner className="h-3.5 w-3.5 border-2" /> : <Crosshair className="h-3.5 w-3.5" />} Update
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-start justify-center gap-3 p-4">
                  <p className="text-sm leading-relaxed text-slate-600">
                    Share this device&apos;s precise location (GPS / Wi-Fi) to record the exact area of this session. Your browser will ask for permission first.
                  </p>
                  <button onClick={shareLocation} disabled={locating} className={primaryBtn}>
                    {locating ? <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" /> : <Crosshair className="h-4 w-4" />}
                    {locating ? "Locating..." : "Use exact location"}
                  </button>
                </div>
              )}
              {locError && (
                <p className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {locError}
                </p>
              )}
            </div>
          </div>
        )}
      </SectionPanel>

      {/* Sign-in history */}
      <SectionPanel title="Recent sign-ins" subtitle="Your last 10 sign-ins. If you don't recognise one, change your password.">
        {!data ? (
          <Skeleton className="h-32 w-full" />
        ) : data.recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No sign-ins recorded yet.</p>
        ) : (
          <div className="-m-5 overflow-x-auto sm:-m-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-semibold sm:px-6">When</th>
                  <th className="px-3 py-2.5 font-semibold">Device</th>
                  <th className="px-3 py-2.5 font-semibold">Area</th>
                  <th className="hidden px-3 py-2.5 font-semibold md:table-cell">IP</th>
                  <th className="px-5 py-2.5 text-right font-semibold sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent.map((e) => (
                  <tr key={e._id} className={e.current ? "bg-emerald-50/40" : ""}>
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-700 sm:px-6">
                      {fmtDateTime(e.createdAt)}
                      <span className="block text-xs text-slate-400">{timeAgo(e.createdAt)}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{e.device?.label || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {e.exactLocation?.label || `${flag(e.location?.countryCode)} ${e.location?.label || "Unknown"}`.trim()}
                      {e.exactLocation && <span className="ml-1.5 rounded bg-indigo-50 px-1 py-0.5 text-[10px] font-semibold text-indigo-700">EXACT</span>}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-500 md:table-cell">{e.ip || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-right sm:px-6">
                      {e.current ? (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">This device</span>
                      ) : e.endedAt ? (
                        <span className="text-xs text-slate-500">Signed out</span>
                      ) : (
                        <span className="text-xs text-slate-500">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}

/* ───────────────────────── Activity ───────────────────────── */

const STATUS = {
  sent: { label: "Sent", cls: "bg-emerald-50 text-emerald-700" },
  dry_run: { label: "Dry run", cls: "bg-amber-50 text-amber-700" },
  failed: { label: "Failed", cls: "bg-red-50 text-red-700" },
  not_sent: { label: "Not sent", cls: "bg-slate-100 text-slate-600" },
};

function MyActivity() {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch("/submissions?mine=1&limit=10")
      .then(setData)
      .catch(() => setData({ submissions: [], total: 0 }));
  }, []);

  return (
    <SectionPanel title="My activity" subtitle={data ? `${data.total} lead${data.total === 1 ? "" : "s"} submitted by you in total. Latest 10 below.` : "Leads you submitted."}>
      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.submissions.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Send className="h-6 w-6 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">You haven&apos;t submitted any leads yet.</p>
          <Link href={CAMPAIGN_NAV[0].href} className="mt-3 inline-flex h-9 items-center rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white hover:bg-slate-800">
            Submit a lead
          </Link>
        </div>
      ) : (
        <ul className="-my-2 divide-y divide-slate-100">
          {data.submissions.map((s) => {
            const nav = CAMPAIGN_NAV.find((c) => c.key === s.campaign);
            const st = STATUS[s.relay?.status] || STATUS.not_sent;
            return (
              <li key={s._id} className="flex items-center gap-3 py-2.5">
                <Avatar name={s.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                  <p className="truncate text-xs text-slate-500">{s.relay?.payload?.email || s.email} · {s.company}</p>
                </div>
                <Link href={`${nav?.href || "#"}/records`} className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 sm:inline">
                  {nav?.shortName || s.campaign}
                </Link>
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                <span className="w-16 text-right text-xs text-slate-400">{timeAgo(s.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionPanel>
  );
}
