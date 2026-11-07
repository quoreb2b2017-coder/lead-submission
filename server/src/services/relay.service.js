import { env } from "../config/env.js";

/**
 * Sends a lead payload to the SelectHub production relay.
 *
 * RELAY_MODE=dry_run (default) never contacts the relay: it only returns the payload
 * that *would* be sent, so the form can be tested without creating real client leads.
 * RELAY_MODE=live posts to RELAY_URL.
 */
export async function sendToRelay(payload) {
  const base = { mode: env.RELAY_MODE, url: env.RELAY_URL, payload };

  if (env.RELAY_MODE !== "live") {
    return { ...base, status: "dry_run", response: "Dry run: payload was not sent to the relay." };
  }

  const isJson = env.RELAY_CONTENT_TYPE === "json";
  const started = Date.now();
  try {
    const res = await fetch(env.RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": isJson ? "application/json" : "application/x-www-form-urlencoded" },
      body: isJson ? JSON.stringify(payload) : new URLSearchParams(payload).toString(),
      signal: AbortSignal.timeout(env.RELAY_TIMEOUT_MS),
    });
    const text = (await res.text()).slice(0, 2000);
    return {
      ...base,
      status: res.ok ? "sent" : "failed",
      httpStatus: res.status,
      response: text,
      error: res.ok ? undefined : `Relay responded with HTTP ${res.status}`,
      sentAt: new Date(),
      durationMs: Date.now() - started,
    };
  } catch (err) {
    return {
      ...base,
      status: "failed",
      error: err.name === "TimeoutError" ? "Relay request timed out" : err.message,
      sentAt: new Date(),
      durationMs: Date.now() - started,
    };
  }
}
