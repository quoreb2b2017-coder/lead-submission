import { Router } from "express";
import { exportMonthSheet, getMonthSheet, getYearSummary } from "../controllers/records.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);
router.get("/summary", getYearSummary);
router.get("/month", getMonthSheet);
router.get("/export", exportMonthSheet);

export default router;
