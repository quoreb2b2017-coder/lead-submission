import { Router } from "express";
import { getLeads, getLeadStats, updateLead, deleteLead } from "../controllers/lead.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);
router.get("/", getLeads);
router.get("/stats", getLeadStats);
router.patch("/:id", updateLead);
router.delete("/:id", deleteLead);

export default router;
