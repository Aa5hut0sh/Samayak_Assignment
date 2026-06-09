import { Router } from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  previewUserImport,
  commitUserImport
} from "../controllers/user.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { Role } from "@repo/db/client";
import { getFaculties } from '../controllers/faculty.controller';

const router = Router();

// Protect routes - only Admins can manage users
router.use(authenticate, authorize([Role.ADMIN]));

router.get('/faculties', getFaculties);
router.get("/", getUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);

// Soft delete and recover
router.delete("/:id", deleteUser);
router.post("/:id/restore", restoreUser);

// Two-Step Bulk Import endpoints
router.post("/import/preview", upload.single("file"), previewUserImport);
router.post("/import/commit", commitUserImport);

export default router;