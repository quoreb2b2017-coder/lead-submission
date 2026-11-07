// Default "/api" goes through the Next.js rewrite proxy (see next.config.mjs), so the browser only
// talks to its own origin and the auth cookie stays first-party. Set NEXT_PUBLIC_API_URL only to
// call a backend directly (e.g. local dev without BACKEND_URL).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.message || `Request failed: ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

/** Downloads a file from an authenticated endpoint (cookie auth) and saves it with the server's filename. */
export async function apiDownload(path, fallbackName = "download") {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || `Download failed: ${res.status}`);
  }
  const disposition = res.headers.get("Content-Disposition") || "";
  const name = disposition.match(/filename="?([^"]+)"?/)?.[1] || fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}
