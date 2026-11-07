import geoip from "geoip-lite";

// geoip-lite ships its own offline database: IP addresses are never sent to a third party.

const IN_STATES = {
  AN: "Andaman and Nicobar Islands", AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar",
  CH: "Chandigarh", CT: "Chhattisgarh", DL: "Delhi", GA: "Goa", GJ: "Gujarat", HR: "Haryana", HP: "Himachal Pradesh",
  JK: "Jammu and Kashmir", JH: "Jharkhand", KA: "Karnataka", KL: "Kerala", LA: "Ladakh", MP: "Madhya Pradesh",
  MH: "Maharashtra", MN: "Manipur", ML: "Meghalaya", MZ: "Mizoram", NL: "Nagaland", OR: "Odisha", PB: "Punjab",
  PY: "Puducherry", RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu", TG: "Telangana", TR: "Tripura",
  UP: "Uttar Pradesh", UT: "Uttarakhand", WB: "West Bengal",
};

const countryName = (code) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
};

const isPrivate = (ip) =>
  !ip ||
  ip === "::1" ||
  /^127\./.test(ip) ||
  /^10\./.test(ip) ||
  /^192\.168\./.test(ip) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
  /^(fc|fd|fe80)/i.test(ip);

export const cleanIp = (ip = "") => String(ip).replace(/^::ffff:/, "").trim();

/** Approximate location for an IP: city / region / country (IP-based, city-level at best). */
export function locateIp(rawIp) {
  const ip = cleanIp(rawIp);
  if (isPrivate(ip)) return { label: "Local network", private: true };
  const g = geoip.lookup(ip);
  if (!g) return { label: "Unknown location" };
  const region = g.country === "IN" ? IN_STATES[g.region] || g.region : g.region;
  const country = countryName(g.country);
  const parts = [g.city, region, country].filter(Boolean);
  return {
    label: parts.join(", ") || country,
    city: g.city || undefined,
    region: region || undefined,
    country,
    countryCode: g.country,
    timezone: g.timezone || undefined,
    lat: g.ll?.[0],
    lng: g.ll?.[1],
    radiusKm: g.area || undefined,
  };
}

/** Very small user-agent summary, e.g. "Chrome on Windows". */
export function describeDevice(ua = "") {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const mobile = /Mobile|Android|iPhone|iPad/.test(ua);
  return { browser, os, mobile, label: os ? `${browser} on ${os}` : browser };
}
