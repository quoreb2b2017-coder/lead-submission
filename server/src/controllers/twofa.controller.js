import User from "../models/User.js";
import { consumeRecoveryCode, encrypt, newRecoveryCodes, newSetup, verifyTotp } from "../utils/twofa.js";

const SECRET_FIELDS = "+twoFactor.secret +twoFactor.pendingSecret +twoFactor.recoveryCodes +twoFactor.lastStep";

/** GET /api/auth/2fa: status for the profile page. */
export const getTwoFactorStatus = async (req, res) => {
  const user = await User.findById(req.user._id).select("+twoFactor.recoveryCodes");
  res.json({
    success: true,
    enabled: Boolean(user.twoFactor?.enabled),
    enabledAt: user.twoFactor?.enabledAt,
    recoveryCodesLeft: user.twoFactor?.enabled ? user.twoFactor.recoveryCodes?.length || 0 : 0,
  });
};

/** POST /api/auth/2fa/setup: new secret + QR code. Nothing is active until /enable confirms a code. */
export const setupTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select(SECRET_FIELDS);
  if (user.twoFactor?.enabled) return res.status(400).json({ success: false, message: "Two-factor authentication is already on." });

  const { secret, otpauthUrl, qr } = await newSetup(user.email);
  user.twoFactor = { ...(user.twoFactor?.toObject?.() || {}), enabled: false, pendingSecret: encrypt(secret) };
  await user.save({ validateModifiedOnly: true });

  res.json({
    success: true,
    qr,
    otpauthUrl,
    // Shown so the key can be typed in manually if the QR can't be scanned
    manualKey: secret.match(/.{1,4}/g).join(" "),
  });
};

/** POST /api/auth/2fa/enable { code }: confirms the app works, turns 2FA on and returns recovery codes once. */
export const enableTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select(SECRET_FIELDS);
  if (user.twoFactor?.enabled) return res.status(400).json({ success: false, message: "Two-factor authentication is already on." });
  if (!user.twoFactor?.pendingSecret) return res.status(400).json({ success: false, message: "Start the setup again to get a new QR code." });

  const totp = verifyTotp(user.twoFactor.pendingSecret, req.body?.code);
  if (!totp.valid) return res.status(400).json({ success: false, message: "That code didn't match. Use the current 6-digit code from your app." });

  const { codes, hashes } = newRecoveryCodes();
  user.twoFactor.secret = user.twoFactor.pendingSecret;
  user.twoFactor.pendingSecret = undefined;
  user.twoFactor.enabled = true;
  user.twoFactor.enabledAt = new Date();
  user.twoFactor.lastStep = totp.timeStep;
  user.twoFactor.recoveryCodes = hashes;
  await user.save({ validateModifiedOnly: true });

  res.json({ success: true, message: "Two-factor authentication is on", recoveryCodes: codes, enabledAt: user.twoFactor.enabledAt });
};

/** Accepts an authenticator code or a recovery code (consumed). */
function checkSecondFactor(user, code) {
  const totp = verifyTotp(user.twoFactor.secret, code, user.twoFactor.lastStep);
  if (totp.valid) {
    user.twoFactor.lastStep = totp.timeStep;
    return true;
  }
  const remaining = consumeRecoveryCode(user.twoFactor.recoveryCodes, code);
  if (remaining) {
    user.twoFactor.recoveryCodes = remaining;
    return true;
  }
  return false;
}

/** POST /api/auth/2fa/disable { password, code }: needs both, so a stolen session alone can't switch it off. */
export const disableTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select(`+password ${SECRET_FIELDS}`);
  if (!user.twoFactor?.enabled) return res.status(400).json({ success: false, message: "Two-factor authentication is already off." });
  if (!(await user.comparePassword(String(req.body?.password || "")))) {
    return res.status(401).json({ success: false, message: "Your password is incorrect." });
  }
  if (!checkSecondFactor(user, req.body?.code)) {
    return res.status(401).json({ success: false, message: "That code isn't valid." });
  }
  user.twoFactor = { enabled: false };
  await user.save({ validateModifiedOnly: true });
  res.json({ success: true, message: "Two-factor authentication is off" });
};

/** POST /api/auth/2fa/recovery-codes { code }: replaces all recovery codes (old ones stop working). */
export const regenerateRecoveryCodes = async (req, res) => {
  const user = await User.findById(req.user._id).select(SECRET_FIELDS);
  if (!user.twoFactor?.enabled) return res.status(400).json({ success: false, message: "Turn on two-factor authentication first." });
  const totp = verifyTotp(user.twoFactor.secret, req.body?.code, user.twoFactor.lastStep);
  if (!totp.valid) return res.status(401).json({ success: false, message: "Enter the current code from your authenticator app." });

  const { codes, hashes } = newRecoveryCodes();
  user.twoFactor.lastStep = totp.timeStep;
  user.twoFactor.recoveryCodes = hashes;
  await user.save({ validateModifiedOnly: true });
  res.json({ success: true, recoveryCodes: codes });
};
