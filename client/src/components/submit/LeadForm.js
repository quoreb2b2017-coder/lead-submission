"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  Lock,
  Mail,
  MapPin,
  RotateCcw,
  Send,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { COUNTRIES, EMPTY_FORM, FUNCTIONS, INDUSTRIES, TEST_EMAILS, testLead } from "@/lib/submissionOptions";
import Spinner from "@/components/Spinner";
import { ComboField, SelectField } from "@/components/submit/Dropdowns";
import { useToast } from "@/components/ui/Toast";

/* ───────────────────────── Config ───────────────────────── */

const SECTIONS = [
  { id: "contact", title: "Contact", subtitle: "Who is requesting the report", icon: UserRound, fields: ["email", "firstName", "lastName", "phone", "position"] },
  { id: "company", title: "Company", subtitle: "Organization and role details", icon: Building2, fields: ["company", "function", "industry", "subIndustry", "companySize"] },
  { id: "address", title: "Address", subtitle: "Where the company is located", icon: MapPin, fields: ["address", "address2", "city", "state", "zip", "country"] },
  { id: "qualification", title: "Qualification", subtitle: "Buying timeline", icon: ClipboardList, fields: ["timeframe"] },
];

const EMAIL_RX = /^\S+@\S+\.\S+$/;
const PHONE_RX = /^[+\d][\d\s().-]{5,}$/;

function validateField(key, value, required, label = "This field") {
  const v = String(value || "").trim();
  if (required && !v) return key === "timeframe" || key === "companySize" ? "Please select an option" : `${label} is required`;
  if (!v) return "";
  if (key === "email" && !EMAIL_RX.test(v)) return "Enter a valid email address";
  if (key === "phone" && !PHONE_RX.test(v)) return "Enter a valid phone number";
  return "";
}

/* ───────────────────────── Building blocks ───────────────────────── */

function Section({ id, title, subtitle, children }) {
  return (
    <section id={`section-${id}`} data-section={id} className="scroll-mt-3 border-b border-slate-100 px-5 py-5 last:border-0 sm:px-6">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="hidden text-xs text-slate-400 sm:block">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">{children}</div>
    </section>
  );
}

const SPAN = { 1: "sm:col-span-2", 2: "sm:col-span-4", 3: "sm:col-span-6", 4: "sm:col-span-8", 6: "sm:col-span-12" };
const SPAN12 = { 2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4", 5: "sm:col-span-5", 7: "sm:col-span-7", 8: "sm:col-span-8" };

const floatLabel = (floated, error) =>
  `pointer-events-none absolute left-3 origin-left truncate transition-all duration-150 ${
    floated ? "top-1.5 text-[11px] font-medium" : "top-1/2 -translate-y-1/2 text-sm"
  } ${error ? "text-red-600" : floated ? "text-slate-500 peer-focus:text-indigo-600" : "text-slate-500"} max-w-[calc(100%-2.5rem)]`;

const boxCls = (error) =>
  `peer h-12 w-full rounded-lg border bg-white px-3 pb-1.5 pt-5 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-150 ${
    error
      ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
      : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
  }`;

function ValidMark({ show, className = "right-3" }) {
  return (
    <span
      className={`pointer-events-none absolute top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white transition-all duration-200 ${className} ${
        show ? "scale-100 opacity-100" : "scale-50 opacity-0"
      }`}
      aria-hidden="true"
    >
      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
    </span>
  );
}

function FieldMessage({ error, hint }) {
  if (!error && !hint) return null;
  return error ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
    </p>
  ) : (
    <p className="mt-1 text-xs text-slate-400">{hint}</p>
  );
}

// Full width on phones unless the field is marked `half`; desktop uses the 6-column span
const SPAN_OF = (span, half, span12) => `min-w-0 ${half ? "col-span-1" : "col-span-2"} ${(span12 && SPAN12[span12]) || SPAN[span] || SPAN[3]}`;

function FInput({ label, required, code, span = 3, span12, half, hint, error, valid, placeholder, ...props }) {
  const [focused, setFocused] = useState(false);
  const floated = focused || Boolean(props.value);
  return (
    <div className={SPAN_OF(span, half, span12)}>
      <div className="relative">
        <input
          {...props}
          placeholder={focused ? placeholder : ""}
          aria-invalid={Boolean(error)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className={`${boxCls(error)} pr-9 placeholder:text-slate-300`}
        />
        <label htmlFor={props.id} title={code ? `Field code: ${code}` : undefined} className={floatLabel(floated, error)}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <ValidMark show={valid && !error} />
      </div>
      <FieldMessage error={error} hint={focused ? hint : ""} />
    </div>
  );
}

/* ───────────────────────── Stepper ───────────────────────── */

function Stepper({ sections, active, doneMap, onJump }) {
  return (
    <nav aria-label="Form steps" className="shrink-0 border-b border-slate-200 bg-white px-3 sm:px-5">
      <ol className="-mb-px flex gap-1 overflow-x-auto">
        {sections.map((s, i) => {
          const done = doneMap[s.id];
          const isActive = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onJump(s.id)}
                aria-current={isActive ? "step" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-2.5 py-2.5 text-sm transition-colors ${
                  isActive ? "border-indigo-600 font-medium text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                    done ? "bg-emerald-600 text-white" : isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                {s.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ───────────────────────── Form ───────────────────────── */

export default function LeadForm({ config, campaign, live, onDone, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testMenu, setTestMenu] = useState(false);
  const [activeSection, setActiveSection] = useState("contact");
  const formRef = useRef(null);
  const scrollRef = useRef(null);
  const bannerRef = useRef(null);
  const testMenuRef = useRef(null);

  const fieldMeta = useMemo(() => {
    const m = Object.fromEntries(config.fields.map((f) => [f.key, f]));
    m[config.customQuestion.key] = { ...config.customQuestion, required: true };
    return m;
  }, [config]);

  const errorFor = (key) => serverErrors[key] || validateField(key, form[key], fieldMeta[key]?.required, fieldMeta[key]?.label);
  const shownError = (key) => (touched[key] ? errorFor(key) : "") || serverErrors[key] || "";
  const isValid = (key) => Boolean(String(form[key] || "").trim()) && !errorFor(key);

  const requiredKeys = Object.values(fieldMeta).filter((f) => f.required).map((f) => f.key);
  const filledRequired = requiredKeys.filter((k) => isValid(k)).length;
  const progress = Math.round((filledRequired / requiredKeys.length) * 100);

  const doneMap = Object.fromEntries(
    SECTIONS.map((s) => {
      const req = s.fields.filter((k) => fieldMeta[k]?.required);
      const hasErrors = s.fields.some((k) => String(form[k] || "").trim() && errorFor(k));
      return [s.id, req.every(isValid) && !hasErrors && (req.length > 0 || s.fields.some((k) => form[k]))];
    })
  );

  // Active step = the last section whose top has passed just below the sticky stepper
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = scrollRef.current;
      const nodes = [...(formRef.current?.querySelectorAll("[data-section]") || [])];
      if (!nodes.length || !root) return;
      const line = root.getBoundingClientRect().top + 72;
      const atBottom = root.scrollHeight > root.clientHeight + 4 && root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      let current = nodes[0].dataset.section;
      for (const n of nodes) if (n.getBoundingClientRect().top <= line) current = n.dataset.section;
      if (atBottom) current = nodes.at(-1).dataset.section;
      setActiveSection(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const root = scrollRef.current;
    update();
    root?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      root?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (banner && (banner.type === "duplicate" || banner.scroll)) {
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [banner]);

  useEffect(() => {
    if (!testMenu) return;
    const close = (e) => testMenuRef.current && !testMenuRef.current.contains(e.target) && setTestMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [testMenu]);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (serverErrors[name]) setServerErrors((e) => ({ ...e, [name]: undefined }));
    if (banner?.type !== "duplicate") setBanner(null);
  };

  const bind = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: (e) => set(name, e.target.value),
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    error: shownError(name),
    valid: touched[name] && isValid(name),
  });

  const jumpTo = (id) => {
    const el = document.getElementById(`section-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => el?.querySelector("input, button[role=combobox]")?.focus({ preventScroll: true }), 450);
  };

  const focusField = (key) => {
    const el = formRef.current?.querySelector(`[name="${key}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el?.focus({ preventScroll: true }), 350);
  };

  // Enter moves to the next input instead of submitting by accident
  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    const inputs = [...formRef.current.querySelectorAll("input:not([type=hidden])")];
    const next = inputs[inputs.indexOf(e.target) + 1];
    next ? next.focus() : formRef.current.querySelector("button[type=submit]")?.focus();
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setTouched({});
    setServerErrors({});
    setBanner(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (allowDuplicate = false) => {
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await apiFetch(`/submissions/${campaign.key}`, {
        method: "POST",
        body: JSON.stringify({ ...form, allowDuplicate }),
      });
      onDone({ ok: true, message: res.message, lead: res.lead });
      const who = `${res.lead.name} · ${res.lead.relay?.payload?.email || res.lead.email}`;
      if (res.lead.relay?.status === "sent") toast(who, "success", { title: "Lead submitted to the client" });
      else toast(`${who} (dry run, not sent)`, "info", { title: "Lead saved" });
    } catch (err) {
      if (err.status === 400 && err.data?.errors) {
        setServerErrors(err.data.errors);
        setBanner({ type: "error", text: err.message });
        focusField(Object.keys(err.data.errors)[0]);
      } else if (err.status === 409) {
        setBanner({ type: "duplicate", text: err.message });
      } else if (err.status === 502 && err.data?.lead) {
        onDone({ ok: false, message: err.message, lead: err.data.lead });
        toast("The lead is saved. Open it to retry.", "error", { title: "Client relay rejected the lead" });
      } else {
        setBanner({ type: "error", scroll: true, text: err.message || "Something went wrong. Please try again." });
      }
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(Object.keys(fieldMeta).map((k) => [k, true]));
    setTouched(allTouched);
    const invalid = Object.keys(fieldMeta).filter((k) => errorFor(k));
    if (invalid.length) {
      setBanner({ type: "error", text: `Please complete ${invalid.length} field${invalid.length > 1 ? "s" : ""} before submitting.` });
      focusField(invalid[0]);
      return;
    }
    if (live) setConfirmOpen(true);
    else submit();
  };

  const fillTest = (email) => {
    setForm(testLead(email));
    setTouched(Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, true])));
    setServerErrors({});
    setBanner(null);
    setTestMenu(false);
    toast(email, "info", { title: "Test lead filled" });
  };

  const code = (k) => fieldMeta[k]?.code;
  const req = (k) => Boolean(fieldMeta[k]?.required);

  return (
    <div className="group/form flex h-full min-h-0 flex-col bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">{campaign.shortName} · New lead</p>
          <h3 className="truncate text-base font-semibold text-slate-900">{campaign.name}</h3>
          <div className="mt-1.5 flex items-center gap-2.5">
            <div className="h-1 w-28 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-emerald-500" : "bg-indigo-600"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs tabular-nums text-slate-500">
              {progress === 100 ? "Ready to submit" : `${filledRequired} of ${requiredKeys.length} required`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
        <div className="relative" ref={testMenuRef}>
          <button
            type="button"
            onClick={() => setTestMenu((o) => !o)}
            aria-expanded={testMenu}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FlaskConical className="h-4 w-4 text-amber-500" /> <span className="hidden sm:inline">Fill test lead</span><span className="sm:hidden">Test</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${testMenu ? "rotate-180" : ""}`} />
          </button>
          {testMenu && (
            <div className="absolute right-0 z-30 mt-2 w-64 animate-fade-up overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl [animation-duration:150ms]">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">SelectHub test emails</p>
              {TEST_EMAILS.map((email) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => fillTest(email)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-xs text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {email}
                </button>
              ))}
            </div>
          )}
        </div>
          {onClose && (
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close form">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <Stepper sections={SECTIONS} active={activeSection} doneMap={doneMap} onJump={jumpTo} />

      <form ref={formRef} onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-48">

        <div className={`grid transition-all duration-300 ${banner ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div ref={bannerRef} className="scroll-mt-3 px-5 pt-5 sm:px-6">
              {banner?.type === "duplicate" ? (
                <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">Possible duplicate</p>
                    <p className="text-sm text-amber-800">{banner.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (live ? setConfirmOpen("duplicate") : submit(true))}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                  >
                    Submit anyway
                  </button>
                </div>
              ) : banner ? (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {banner.text}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* 1. Contact */}
        <Section {...SECTIONS[0]}>
          <FInput {...bind("firstName")} half label="First name" required={req("firstName")} code={code("firstName")} span={2} placeholder="Jane" autoComplete="off" />
          <FInput {...bind("lastName")} half label="Last name" required={req("lastName")} code={code("lastName")} span={2} placeholder="Doe" autoComplete="off" />
          <FInput {...bind("position")} label="Position" required={req("position")} code={code("position")} span={2} placeholder="HR Director" autoComplete="off" />
          <FInput {...bind("email")} label="Work email" required={req("email")} code={code("email")} span={3} type="email" placeholder="name@company.com" autoComplete="off" />
          <FInput {...bind("phone")} label="Phone" required={req("phone")} code={code("phone")} span={3} type="tel" placeholder="+1 555 010 0100" hint="Include the country code" autoComplete="off" />
        </Section>

        {/* 2. Company */}
        <Section {...SECTIONS[1]}>
          <FInput {...bind("company")} label="Company" required={req("company")} code={code("company")} span={3} placeholder="Acme Inc." autoComplete="off" />
          <SelectField
            {...bind("companySize")}
            onChange={(e) => {
              set("companySize", e.target.value);
              setTouched((t) => ({ ...t, companySize: true }));
            }}
            label="Company size (employees)"
            required={req("companySize")}
            code={code("companySize")}
            span={3}
            options={config.companySizes}
          />
          <ComboField {...bind("industry")} half label="Industry" required={req("industry")} code={code("industry")} span={2} options={INDUSTRIES} placeholder="Technology" />
          <FInput {...bind("subIndustry")} half label="Sub industry" required={req("subIndustry")} code={code("subIndustry")} span={2} placeholder="Software" autoComplete="off" />
          <ComboField {...bind("function")} label="Function" required={req("function")} code={code("function")} span={2} options={FUNCTIONS} placeholder="Human Resources" />
        </Section>

        {/* 3. Address */}
        <Section {...SECTIONS[2]}>
          <FInput {...bind("address")} label="Street address" required={req("address")} code={code("address")} span12={8} placeholder="123 Market Street" autoComplete="off" />
          <FInput {...bind("address2")} label="Apt, suite, floor" required={req("address2")} code={code("address2")} span12={4} placeholder="Suite, floor" autoComplete="off" />
          <FInput {...bind("city")} half label="City" required={req("city")} code={code("city")} span12={4} placeholder="Denver" autoComplete="off" />
          <FInput {...bind("state")} half label="State / Province" required={req("state")} code={code("state")} span12={3} placeholder="CO" autoComplete="off" />
          <FInput {...bind("zip")} half label="Zip code" required={req("zip")} code={code("zip")} span12={2} placeholder="80202" autoComplete="off" />
          <ComboField {...bind("country")} half label="Country" required={req("country")} code={code("country")} span12={3} options={COUNTRIES} placeholder="United States" />
        </Section>

        {/* 4. Qualification */}
        <Section {...SECTIONS[3]} subtitle={config.customQuestion.label}>
          <SelectField
            {...bind("timeframe")}
            onChange={(e) => {
              set("timeframe", e.target.value);
              setTouched((t) => ({ ...t, timeframe: true }));
            }}
            label="When is the company planning to implement new software?"
            required
            code={config.customQuestion.code}
            span={6}
            options={config.customQuestion.options}
          />
        </Section>

        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <p className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
              <Lock className="h-3.5 w-3.5 shrink-0" /> <span className="whitespace-nowrap">+{Object.keys(campaign.hidden).length} hidden fields</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60"
            >
              <RotateCcw className="h-4 w-4" /> Clear
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                live ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {submitting ? (
                <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : live ? (
                <Send className="h-4 w-4" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
              {submitting ? "Submitting..." : live ? "Submit lead" : "Run dry-run submission"}
            </button>
          </div>
        </div>
      </form>

      {confirmOpen && (
        <ConfirmModal
          form={form}
          campaign={campaign}
          submitting={submitting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => submit(confirmOpen === "duplicate")}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Confirm modal ───────────────────────── */

function ConfirmModal({ form, campaign, submitting, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (!submitting) onCancel();
    };
    // capture phase so it runs before the drawer's Escape handler
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel, submitting]);

  const rows = [
    ["Name", `${form.firstName} ${form.lastName}`],
    ["Email", form.email],
    ["Company", `${form.company} · ${form.companySize}`],
    ["Timeframe", form.timeframe],
  ];
  // Portal: the drawer is transformed (slide-in), which would trap position:fixed
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={() => !submitting && onCancel()} />
      <div className="relative w-full max-w-md animate-fade-up overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 id="confirm-title" className="mt-4 text-lg font-bold text-slate-900">Send this lead to the client?</h3>
          <p className="mt-1 text-sm text-slate-500">
            This posts a real lead to the production relay for the <span className="font-semibold text-slate-700">{campaign.shortName}</span>{" "}
            campaign. It can&apos;t be undone.
          </p>
          <dl className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-3 px-4 py-2.5 text-sm">
                <dt className="w-20 shrink-0 text-slate-500">{k}</dt>
                <dd className="min-w-0 break-words font-medium text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button onClick={onCancel} disabled={submitting} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
          >
            {submitting ? <Spinner className="h-4 w-4 border-2 border-white/30 border-t-white" /> : <Send className="h-4 w-4" />}
            {submitting ? "Sending..." : "Yes, send lead"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
