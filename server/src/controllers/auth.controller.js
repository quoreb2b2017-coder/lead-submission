import jwt from "jsonwebtoken";
import User from "../models/User.js";
import LoginEvent from "../models/LoginEvent.js";
import { cleanIp, describeDevice, locateIp } from "../utils/geo.js";
import { consumeRecoveryCode, verifyTotp } from "../utils/twofa.js";
import { env } from "../config/env.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const signToken = (id, sid) => jwt.sign({ id, sid }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

export const login = async (req, res) => {
  const { email, password, remember = true } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  // 2FA on: password alone is not enough. Hand back a short-lived challenge instead of a session.
  if (user.twoFactor?.enabled) {
    const challenge = jwt.sign({ id: user._id, purpose: "2fa", remember: Boolean(remember) }, env.JWT_SECRET, { expiresIn: "5m" });
    return res.json({ success: true, requires2FA: true, challenge });
  }

  await startSession(req, res, user, remember);
};

/** Creates the signed-in session: login record, cookie and response. */
async function startSession(req, res, user, remember) {
  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });

  // Record this sign-in: device, IP and approximate (IP-based) area
  const ip = cleanIp(req.ip);
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 400);
  const event = await LoginEvent.create({ user: user._id, ip, userAgent, device: describeDevice(userAgent), location: locateIp(ip) });

  // "Remember me" off -> session cookie (cleared when the browser closes)
  const options = remember ? cookieOptions : { ...cookieOptions, maxAge: undefined };
  res.cookie(env.COOKIE_NAME, signToken(user._id, event._id), options);
  res.json({ success: true, user: await User.findById(user._id) });
}

/** POST /api/auth/login/2fa { challenge, code }: second step with an authenticator or recovery code. */
export const loginWith2FA = async (req, res) => {
  const { challenge, code } = req.body || {};
  let payload;
  try {
    payload = jwt.verify(String(challenge || ""), env.JWT_SECRET);
    if (payload.purpose !== "2fa") throw new Error("wrong purpose");
  } catch {
    return res.status(401).json({ success: false, code: "CHALLENGE_EXPIRED", message: "Your sign-in attempt expired. Please enter your password again." });
  }

  const user = await User.findById(payload.id).select("+twoFactor.secret +twoFactor.recoveryCodes +twoFactor.lastStep");
  if (!user?.twoFactor?.enabled) {
    return res.status(401).json({ success: false, code: "CHALLENGE_EXPIRED", message: "Please sign in again." });
  }

  const totp = verifyTotp(user.twoFactor.secret, code, user.twoFactor.lastStep);
  if (totp.valid) {
    user.twoFactor.lastStep = totp.timeStep;
  } else {
    const remaining = consumeRecoveryCode(user.twoFactor.recoveryCodes, code);
    if (!remaining) return res.status(401).json({ success: false, message: "That code isn't valid. Check your authenticator app and try again." });
    user.twoFactor.recoveryCodes = remaining;
  }
  await startSession(req, res, user, payload.remember);
};

export const logout = async (req, res) => {
  // Mark this sign-in as ended (best effort: the token may already be expired)
  try {
    const { sid } = jwt.verify(req.cookies?.[env.COOKIE_NAME] || "", env.JWT_SECRET);
    if (sid) await LoginEvent.updateOne({ _id: sid, endedAt: null }, { endedAt: new Date() });
  } catch {
    /* no valid session to close */
  }
  res.clearCookie(env.COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ success: true, message: "Logged out" });
};

export const me = (req, res) => {
  res.json({ success: true, user: req.user });
};

const EMAIL_RX = /^\S+@\S+\.\S+$/;

export const updateProfile = async (req, res) => {
  const { name, email } = req.body || {};
  const updates = {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      return res.status(400).json({ success: false, message: "Name must be between 2 and 60 characters" });
    }
    updates.name = trimmed;
  }

  if (email !== undefined) {
    const normalized = String(email).toLowerCase().trim();
    if (!EMAIL_RX.test(normalized)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }
    const taken = await User.exists({ email: normalized, _id: { $ne: req.user._id } });
    if (taken) return res.status(409).json({ success: false, message: "That email is already in use" });
    updates.email = normalized;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ success: false, message: "Nothing to update" });
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, user });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Current and new password are required" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ success: false, message: "Current password is incorrect" });
  }
  if (await user.comparePassword(newPassword)) {
    return res.status(400).json({ success: false, message: "New password must be different from the current one" });
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();
  res.json({ success: true, message: "Password updated successfully", user });
};

/** GET /api/auth/sessions: this sign-in + the last 10 sign-ins of the current admin. */
export const getSessions = async (req, res) => {
  const events = await LoginEvent.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10).lean();
  const shape = (e) => ({ ...e, current: String(e._id) === String(req.sessionId) });
  const current = req.sessionId ? await LoginEvent.findOne({ _id: req.sessionId, user: req.user._id }).lean() : null;
  res.json({ success: true, current: current ? shape(current) : null, recent: events.map(shape) });
};

/** PATCH /api/auth/sessions/current/location: store the browser's exact location, shared by the admin. */
export const saveExactLocation = async (req, res) => {
  if (!req.sessionId) {
    return res.status(409).json({ success: false, message: "Please sign out and sign in again to enable session details." });
  }
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const accuracyM = Number(req.body?.accuracy);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, message: "Invalid coordinates" });
  }
  const exactLocation = {
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    accuracyM: Number.isFinite(accuracyM) && accuracyM >= 0 ? Math.round(accuracyM) : undefined,
    label: String(req.body?.label || "").slice(0, 200) || undefined,
    capturedAt: new Date(),
  };
  const event = await LoginEvent.findOneAndUpdate({ _id: req.sessionId, user: req.user._id }, { exactLocation }, { new: true }).lean();
  if (!event) return res.status(404).json({ success: false, message: "Session not found" });
  res.json({ success: true, session: { ...event, current: true } });
};
