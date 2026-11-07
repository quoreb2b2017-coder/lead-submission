import { Router } from "express";
import { login, loginWith2FA, logout, me, updateProfile, changePassword, getSessions, saveExactLocation } from "../controllers/auth.controller.js";
import {
  disableTwoFactor,
  enableTwoFactor,
  getTwoFactorStatus,
  regenerateRecoveryCodes,
  setupTwoFactor,
} from "../controllers/twofa.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", login);
router.post("/login/2fa", loginWith2FA); // shares the /login rate limit (see app.js)
router.post("/logout", logout);
router.get("/me", protect, me);
router.patch("/me", protect, updateProfile);
router.patch("/password", protect, changePassword);
router.get("/sessions", protect, getSessions);
router.patch("/sessions/current/location", protect, saveExactLocation);

router.get("/2fa", protect, getTwoFactorStatus);
router.post("/2fa/setup", protect, setupTwoFactor);
router.post("/2fa/enable", protect, enableTwoFactor);
router.post("/2fa/disable", protect, disableTwoFactor);
router.post("/2fa/recovery-codes", protect, regenerateRecoveryCodes);

export default router;
