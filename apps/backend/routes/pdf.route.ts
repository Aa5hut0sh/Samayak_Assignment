import { Router } from "express";
import { uploadPdfTimetable, getImportStatus } from "../controllers/pdf.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { Role } from "@repo/db/client";

const router = Router();

router.use(authenticate, authorize([Role.ADMIN, Role.HOD, Role.COORDINATOR]));

router.post("/upload", upload.single("file"), uploadPdfTimetable);
router.get("/status/:id", getImportStatus);

export default router;