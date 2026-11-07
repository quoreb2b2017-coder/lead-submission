"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, Search } from "lucide-react";

/* Shared look with the floating-label text inputs in LeadForm */
const SPAN = { 1: "sm:col-span-2", 2: "sm:col-span-4", 3: "sm:col-span-6", 4: "sm:col-span-8", 6: "sm:col-span-12" };
const SPAN12 = { 2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4", 5: "sm:col-span-5", 7: "sm:col-span-7", 8: "sm:col-span-8" };
const spanCls = (span, half, span12) => `min-w-0 ${half ? "col-span-1" : "col-span-2"} ${(span12 && SPAN12[span12]) || SPAN[span] || SPAN[3]}`;

const labelCls = (floated, error, open) =>
  `pointer-events-none absolute left-3 max-w-[calc(100%-3rem)] truncate transition-all duration-150 ${
    floated ? "top-1.5 text-[11px] font-medium" : "top-1/2 -translate-y-1/2 text-sm"
  } ${error ? "text-red-600" : open ? "text-indigo-600" : "text-slate-500"}`;

const boxCls = (error, open) =>
  `flex h-12 w-full items-center rounded-lg border bg-white px-3 pb-1.5 pt-5 text-left text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-150 ${
    error
      ? "border-red-300 bg-red-50/30"
      : open
        ? "border-indigo-500 ring-4 ring-indigo-500/10"
        : "border-slate-200 hover:border-slate-300 focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10"
  }`;

function Message({ error }) {
  if (!error) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
    </p>
  );
}

function ValidDot({ show }) {
  return (
    <span
      className={`pointer-events-none absolute right-9 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white transition-all duration-200 ${
        show ? "scale-100 opacity-100" : "scale-50 opacity-0"
      }`}
      aria-hidden="true"
    >
      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
    </span>
  );
}

function useOutside(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, open, onClose]);
}

/**
 * Always opens below the field (consistent for every dropdown). If the list would be cut
 * off, the nearest scroll area (the form drawer) scrolls just enough to reveal it.
 */
function Popover({ children, id }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }), 20);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      ref={ref}
      id={id}
      className="absolute left-0 right-0 top-full z-40 mt-1.5 origin-top scroll-mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-900/10 animate-[pop_120ms_ease-out]"
    >
      {children}
    </div>
  );
}

function OptionRow({ active, selected, children, onPick, onHover, id }) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      onMouseEnter={onHover}
      className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${
        active ? "bg-indigo-50 text-indigo-900" : "text-slate-700"
      } ${selected ? "font-medium" : ""}`}
    >
      <span className="truncate">{children}</span>
      {selected && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
    </li>
  );
}

/**
 * Listbox select (fixed options). Same name/value/onChange/onBlur contract as a native
 * select: onChange receives { target: { name, value } }.
 */
export function SelectField({ id, name, label, required, code, span = 3, span12, half, error, valid, options, value, onChange, onBlur }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const listId = useId();

  const close = () => {
    setOpen(false);
    onBlur?.({ target: { name } });
  };
  useOutside(wrapRef, open, close);

  const pick = (v) => {
    onChange?.({ target: { name, value: v } });
    setOpen(false);
    btnRef.current?.focus();
  };

  const openList = () => {
    setActive(Math.max(0, options.indexOf(value)));
    setOpen(true);
  };

  const onKeyDown = (e) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active] != null) pick(options[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") {
        e.preventDefault(); // tells the drawer this Escape was handled
        e.stopPropagation();
      }
      close();
    }
  };

  return (
    <div className={spanCls(span, half, span12)} ref={wrapRef}>
      <div className="relative">
        <button
          ref={btnRef}
          id={id}
          name={name}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={Boolean(error)}
          onClick={() => (open ? close() : openList())}
          onKeyDown={onKeyDown}
          className={`${boxCls(error, open)} pr-14`}
        >
          <span className={`truncate ${value ? "" : "invisible"}`}>{value || "Select"}</span>
        </button>
        <span title={code ? `Field code: ${code}` : undefined} className={labelCls(open || Boolean(value), error, open)}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
        <ValidDot show={valid && !error && !open} />
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${open ? "rotate-180 text-indigo-600" : ""}`} />
        {open && (
          <Popover id={listId}>
            <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
              {options.map((o, i) => (
                <OptionRow key={o} active={i === active} selected={o === value} onPick={() => pick(o)} onHover={() => setActive(i)}>
                  {o}
                </OptionRow>
              ))}
            </ul>
          </Popover>
        )}
      </div>
      <Message error={error} />
    </div>
  );
}

/** Text input with a filtered suggestion list. Free text is always allowed. */
export function ComboField({ id, name, label, required, code, span = 3, span12, half, error, valid, options, value, onChange, onBlur, placeholder }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = String(value || "").trim().toLowerCase();
    const list = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    return list.slice(0, 8);
  }, [options, value]);

  useOutside(wrapRef, open, () => setOpen(false));

  const emit = (v) => onChange?.({ target: { name, value: v } });
  const pick = (v) => {
    emit(v);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      e.stopPropagation();
      pick(matches[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  const floated = focused || Boolean(value);
  const exact = matches.length === 1 && matches[0].toLowerCase() === String(value).trim().toLowerCase();

  return (
    <div className={spanCls(span, half, span12)} ref={wrapRef}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          value={value}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          placeholder={focused ? placeholder : ""}
          onChange={(e) => {
            emit(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
            setActive(-1);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onKeyDown={onKeyDown}
          className={`${boxCls(error, open && matches.length > 0 && !exact)} pr-14 placeholder:text-slate-300`}
        />
        <label htmlFor={id} title={code ? `Field code: ${code}` : undefined} className={labelCls(floated, error, focused)}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <ValidDot show={valid && !error && !open} />
        <ChevronDown
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
        {open && matches.length > 0 && !exact && (
          <Popover id={listId}>
            <p className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
              <Search className="h-3 w-3" /> {value ? "Suggestions" : "Common values"}
            </p>
            <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
              {matches.map((o, i) => (
                <OptionRow key={o} active={i === active} selected={o === value} onPick={() => pick(o)} onHover={() => setActive(i)}>
                  {o}
                </OptionRow>
              ))}
            </ul>
          </Popover>
        )}
      </div>
      <Message error={error} />
    </div>
  );
}
