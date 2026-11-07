"use client";

import { useEffect, useRef, useState } from "react";

// BuyerZone Scout widget loader (same loader the Compare Bazaar quote pages use).
const SCRIPT_SRC = "https://d1bhoz8vz21659.cloudfront.net/scout-widget.js";

let scriptPromise = null;
function loadScout() {
  if (window.scoutWidget) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      let s = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (!s) {
        s = document.createElement("script");
        s.src = SCRIPT_SRC;
        s.type = "module";
        s.crossOrigin = "anonymous";
        document.head.appendChild(s);
      }
      s.addEventListener("load", () => resolve(), { once: true });
      s.addEventListener(
        "error",
        () => {
          scriptPromise = null;
          reject(new Error("The Scout form could not be loaded. Check the internet connection or any ad blocker."));
        },
        { once: true }
      );
    });
  }
  return scriptPromise;
}

const newRef = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Name of a form control inside the Scout form (it renders in an open shadow root). */
const fieldName = (el) => el.name || el.id || el.getAttribute("aria-label") || el.placeholder || "";

/**
 * Renders the client's BuyerZone Scout form for one Embed ID. Re-mounting gives a fresh, empty form.
 *
 * Scout only hands lead details to its own partner sources, so for our source the onConversion
 * callback carries no data. We therefore keep the values typed into the form (input events cross
 * the shadow root) and, when Scout confirms the submission, pass them to `onConversion` as
 * { ref, upsell, fields } so LeadHub can save its copy.
 */
export default function ScoutWidget({ embedId, sourceId, onConversion }) {
  const hostRef = useRef(null);
  const handlerRef = useRef(onConversion);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handlerRef.current = onConversion;
  }, [onConversion]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const mount = document.createElement("div");
    mount.className = "w-full";
    host.replaceChildren(mount);
    let cancelled = false;
    setError("");
    setLoading(true);

    // Values typed into the form, by field name
    const values = {};
    const capture = (e) => {
      const el = e.composedPath?.()[0];
      if (!el || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      const name = fieldName(el);
      if (!name || el.type === "password" || el.type === "hidden") return;
      if (el.type === "checkbox") {
        const list = new Set(String(values[name] || "").split(", ").filter(Boolean));
        el.checked ? list.add(el.value || "yes") : list.delete(el.value || "yes");
        values[name] = [...list].join(", ");
      } else if (el.type === "radio") {
        if (el.checked) values[name] = el.value;
      } else {
        values[name] = el.value;
      }
    };
    host.addEventListener("input", capture, true);
    host.addEventListener("focusout", capture, true);

    const session = newRef();
    let conversions = 0;
    const onScoutConversion = () => {
      const n = conversions++;
      handlerRef.current?.({ ref: `${session}-${n}`, upsell: n > 0, fields: { ...values } });
    };

    loadScout()
      .then(() => {
        if (cancelled) return;
        if (!window.scoutWidget) throw new Error("The Scout form did not start. Reload and try again.");
        window.scoutWidget.Initialize(mount, { id: embedId, sourceId, isTest: false, test: false, onConversion: onScoutConversion });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      host.removeEventListener("input", capture, true);
      host.removeEventListener("focusout", capture, true);
      if (mount.getAttribute("data-initialized") === "true") window.scoutWidget?.Destroy(mount);
      mount.remove();
    };
  }, [embedId, sourceId]);

  return (
    <div className="w-full">
      {loading && <div className="h-[480px] w-full animate-pulse rounded-xl bg-slate-100" aria-label="Loading form" />}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div ref={hostRef} className="scout-widget-mount w-full" />
    </div>
  );
}
