import { Router } from "express";
import { getTargets, setTarget } from "../controllers/target.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);
router.get("/", getTargets);
router.put("/:campaign", setTarget);

export default router;
