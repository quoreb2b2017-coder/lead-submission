import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import leadRoutes from "./lead.routes.js";
import submissionRoutes from "./submission.routes.js";
import targetRoutes from "./target.routes.js";
import recordsRoutes from "./records.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/leads", leadRoutes);
router.use("/submissions", submissionRoutes);
router.use("/targets", targetRoutes);
router.use("/records", recordsRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
