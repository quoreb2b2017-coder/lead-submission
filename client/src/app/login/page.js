"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Spinner, { FullPageSpinner } from "@/components/Spinner";
import PublicNavbar from "@/components/ui/PublicNavbar";
import Footer from "@/components/dashboard/Footer";
import OtpInput from "@/components/ui/OtpInput";

const highlights = [
  { icon: Zap, title: "Instant capture", text: "Every submission lands in your pipeline in real time." },
  { icon: TrendingUp, title: "Clear insights", text: "Track trends, sources and conversion at a glance." },
  { icon: ShieldCheck, title: "Secure by default", text: "Encrypted sessions with httpOnly cookies." },
];

const previewBars = [38, 52, 44, 68, 59, 81, 74, 92];

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [twoFA, setTwoFA] = useState(null); // { challenge } once the password is accepted and 2FA is on
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please enter both your email and password.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(form.email, form.password, form.remember);
      if (result.requires2FA) {
        setTwoFA({ challenge: result.challenge });
        setSubmitting(false);
        return;
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err.status ? err.message : "Unable to reach the server. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading || user) return <FullPageSpinner />;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white">
      <PublicNavbar />

      <div className="flex flex-1">
      {/* ───────────── Brand panel ───────────── */}
      <div className="relative hidden w-[52%] overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:p-12 xl:p-14">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] animate-blob rounded-full bg-indigo-600/40 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-[30rem] w-[30rem] animate-blob rounded-full bg-violet-600/30 blur-3xl [animation-delay:-6s]" />
        <div className="absolute right-1/3 top-1/3 h-72 w-72 animate-blob rounded-full bg-sky-500/20 blur-3xl [animation-delay:-12s]" />

        <div className="relative max-w-xl">
          <div className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur [animation-delay:80ms]">
            <Sparkles className="h-3.5 w-3.5" /> Lead management, simplified
          </div>
          <h2 className="animate-fade-up text-4xl font-bold leading-[1.1] tracking-tight text-white [animation-delay:120ms] xl:text-5xl">
            Turn every lead into{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
              real growth.
            </span>
          </h2>
          <p className="mt-4 max-w-md animate-fade-up text-base leading-relaxed text-slate-400 [animation-delay:160ms]">
            One workspace to capture, qualify and convert leads, with the numbers that matter always in view.
          </p>

          {/* Product preview card */}
          <div className="relative mt-10 animate-fade-up [animation-delay:220ms]">
            <div className="animate-float rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Pipeline preview</p>
                  <p className="mt-1 text-sm text-slate-300">Weekly lead volume</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                  <TrendingUp className="h-3 w-3" /> Trending up
                </span>
              </div>
              <div className="mt-5 flex h-24 items-end gap-2" aria-hidden="true">
                {previewBars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-[4px] bg-gradient-to-t from-indigo-500/60 to-violet-400/90"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="absolute -bottom-6 -right-4 flex animate-float items-center gap-3 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 shadow-xl backdrop-blur-xl [animation-delay:-3s]">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">New lead captured</p>
                <p className="text-xs text-slate-400">From your website form</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
          {highlights.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="animate-fade-up" style={{ animationDelay: `${300 + i * 60}ms` }}>
              <Icon className="h-5 w-5 text-indigo-300" />
              <p className="mt-2 text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────── Form panel ───────────── */}
      <div className="relative flex w-full flex-col lg:w-[48%]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-50/70 to-transparent lg:hidden" />

        <div className="relative flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-[420px] animate-fade-up">
            {twoFA ? (
              <TwoFactorStep
                challenge={twoFA.challenge}
                email={form.email}
                onBack={(msg) => {
                  setTwoFA(null);
                  setForm((f) => ({ ...f, password: "" }));
                  setError(msg || "");
                }}
                onSuccess={() => router.replace("/dashboard")}
              />
            ) : (
            <>
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <KeyRound className="h-5 w-5 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
              <p className="mt-2 text-[15px] text-slate-500">Sign in to your admin account to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div
                  role="alert"
                  className="flex animate-fade-in items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Field label="Email address" htmlFor="email">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  className="input pl-11"
                />
              </Field>

              <Field label="Password" htmlFor="password">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock"))}
                  placeholder="Enter your password"
                  className="input pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </Field>
              {capsLock && (
                <p className="-mt-3 animate-fade-in text-xs font-medium text-amber-600">Caps Lock is on</p>
              )}

              <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                Keep me signed in for 7 days
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-[15px] font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-80"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {submitting ? (
                  <>
                    <Spinner className="h-5 w-5 border-2 border-white/30 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
            </>
            )}

            <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-xs leading-relaxed text-slate-500">
                Admin access only. Your session is protected with an encrypted, httpOnly cookie.
              </p>
            </div>
          </div>
        </div>

      </div>
      </div>

      <Footer variant="public" />
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="group relative">{children}</div>
    </div>
  );
}

function TwoFactorStep({ challenge, email, onBack, onSuccess }) {
  const { verify2FA } = useAuth();
  const [mode, setMode] = useState("app"); // "app" | "recovery"
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const submit = async (value) => {
    const v = (value ?? (mode === "app" ? code : recovery)).trim();
    if (mode === "app" && !/^\d{6}$/.test(v)) return setError("Enter the 6-digit code from your authenticator app.");
    if (mode === "recovery" && v.replace(/[^a-z0-9]/gi, "").length !== 8) return setError("Recovery codes look like abcd-1234.");
    setVerifying(true);
    setError("");
    try {
      await verify2FA(challenge, v);
      onSuccess();
    } catch (err) {
      if (err.data?.code === "CHALLENGE_EXPIRED") return onBack(err.message);
      setError(err.status ? err.message : "Unable to reach the server. Please try again.");
      setCode("");
      setVerifying(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Two-step verification</h1>
        <p className="mt-2 text-[15px] text-slate-500">
          {mode === "app" ? (
            <>Enter the 6-digit code from your authenticator app for <span className="font-medium text-slate-700">{email}</span>.</>
          ) : (
            "Enter one of the recovery codes you saved when you turned on 2-step verification."
          )}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
        noValidate
      >
        {error && (
          <div role="alert" className="flex animate-fade-in items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === "app" ? (
          <OtpInput value={code} onChange={(v) => { setCode(v); setError(""); }} onComplete={(v) => submit(v)} disabled={verifying} error={Boolean(error)} />
        ) : (
          <input
            autoFocus
            value={recovery}
            onChange={(e) => { setRecovery(e.target.value); setError(""); }}
            placeholder="abcd-1234"
            autoComplete="off"
            spellCheck={false}
            className="input px-4 text-center font-mono text-lg tracking-widest"
          />
        )}

        <button
          type="submit"
          disabled={verifying}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-[15px] font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-80"
        >
          {verifying ? <Spinner className="h-5 w-5 border-2 border-white/30 border-t-white" /> : <ShieldCheck className="h-4 w-4" />}
          {verifying ? "Verifying..." : "Verify and sign in"}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "app" ? "recovery" : "app"));
              setError("");
            }}
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            {mode === "app" ? "Use a recovery code instead" : "Use authenticator app instead"}
          </button>
          <button type="button" onClick={() => onBack("")} className="text-slate-500 hover:text-slate-800">
            Back to sign in
          </button>
        </div>
      </form>
    </div>
  );
}
