import crypto from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { env } from "../config/env.js";

const ISSUER = "LeadHub";

/* ── Secret encryption at rest (AES-256-GCM) ──────────────────────────────
 * Key comes from TWOFA_ENCRYPTION_KEY, falling back to a key derived from JWT_SECRET.
 * Set TWOFA_ENCRYPTION_KEY in production so rotating JWT_SECRET never breaks 2FA. */
const KEY = crypto
  .createHash("sha256")
  .update(process.env.TWOFA_ENCRYPTION_KEY || `${env.JWT_SECRET}:leadhub-2fa`)
  .digest();

export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload) {
  const [iv, tag, data] = String(payload).split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/* ── TOTP ───────────────────────────────────────────────────────────────── */

export async function newSetup(email) {
  const secret = generateSecret(); // 20 random bytes, Base32
  const otpauthUrl = generateURI({ issuer: ISSUER, label: email, secret });
  const qr = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220, errorCorrectionLevel: "M" });
  return { secret, otpauthUrl, qr };
}

/**
 * Verify a 6-digit code. Allows ±30s clock drift and rejects a code that was already used
 * (any time step <= lastStep), so a captured code can't be replayed.
 */
export function verifyTotp(encryptedSecret, token, lastStep) {
  const code = String(token || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return { valid: false };
  const r = verifySync({
    secret: decrypt(encryptedSecret),
    token: code,
    epochTolerance: 30,
    ...(Number.isFinite(lastStep) ? { afterTimeStep: lastStep } : {}),
  });
  return r.valid ? { valid: true, timeStep: r.timeStep } : { valid: false };
}

/* ── Recovery codes ─────────────────────────────────────────────────────── */

const hash = (code) => crypto.createHash("sha256").update(normalize(code)).digest("hex");
const normalize = (code) => String(code || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** 10 single-use codes like "k7d2-9xqm" (shown once); only their hashes are stored. */
export function newRecoveryCodes(count = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alike characters
  const codes = Array.from({ length: count }, () => {
    const bytes = crypto.randomBytes(8);
    const s = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
  return { codes, hashes: codes.map(hash) };
}

/** Returns the remaining hashes if the code matched (it is consumed), otherwise null. */
export function consumeRecoveryCode(hashes = [], code) {
  if (normalize(code).length !== 8) return null;
  const h = hash(code);
  const idx = hashes.findIndex((x) => crypto.timingSafeEqual(Buffer.from(x, "hex"), Buffer.from(h, "hex")));
  return idx === -1 ? null : hashes.filter((_, i) => i !== idx);
}
