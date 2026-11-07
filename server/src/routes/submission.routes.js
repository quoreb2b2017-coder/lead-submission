import { Router } from "express";
import {
  createSubmission,
  getSubmissionConfig,
  listSubmissions,
  retrySubmission,
  bulkDeleteSubmissions,
} from "../controllers/submission.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);
router.get("/config", getSubmissionConfig);
router.get("/", listSubmissions);
router.post("/bulk-delete", bulkDeleteSubmissions);
router.post("/:campaign", createSubmission);
router.post("/:id/retry", retrySubmission);

export default router;
