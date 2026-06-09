import { Router } from "express";
import {
  createRoom,
  getRooms,
  updateRoom,
  deleteRoom,
  importRooms,
  getRoomById,
} from "../controllers/room.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { Role } from "@repo/db/client";

const router = Router();

// Apply auth middlewares
router.use(authenticate, authorize([Role.ADMIN, Role.HOD, Role.COORDINATOR]));

router.get("/", getRooms);
router.post("/", createRoom);
router.get("/:id", getRoomById);
router.patch("/:id", updateRoom);
router.delete("/:id", deleteRoom);

// Bulk import endpoint
router.post("/import", upload.single("file"), importRooms);

export default router;