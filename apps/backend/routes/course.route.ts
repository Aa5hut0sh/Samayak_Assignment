import { Router } from "express";
import {
  createCourse,
  getCourses,
  updateCourse,
  deleteCourse,
  importCourses,
} from "../controllers/course.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { Role } from "@repo/db/client";

const router = Router();

// Protect routes
router.use(authenticate, authorize([Role.ADMIN, Role.HOD, Role.COORDINATOR]));

router.get("/", getCourses);
router.post("/", createCourse);
router.patch("/:id", updateCourse);
router.delete("/:id", deleteCourse);

// Bulk import endpoint
router.post("/import", upload.single("file"), importCourses);

export default router;