import { Router } from "express";
import {
  registerAdmin,
  login,
  logout,
  getCurrentUser,
} from "../controllers/auth.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { Role } from "@repo/db/client";

const router = Router();

router.post("/register/admin", registerAdmin);
router.post("/login", login);

router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getCurrentUser);

export default router;
