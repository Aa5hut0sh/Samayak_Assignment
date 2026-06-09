import { Router } from "express";
import { getDashboardAnalytics } from "../controllers/analytics.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { Role } from "@repo/db/client";

const router = Router();

// Only system administrators, HODs, and Deans should likely see the macro-level analytics
router.use(authenticate, authorize([Role.ADMIN, Role.HOD, Role.DEAN, Role.COORDINATOR]));

router.get("/", getDashboardAnalytics);

export default router;