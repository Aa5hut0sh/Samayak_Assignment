import {Router} from "express";
import authRoutes from "./auth.routes";
import departmentRoutes from "./department.route";
import roomRoutes from "./room.route";
import courseRoutes from "./course.route";
import userRoutes from "./user.route";
import analyticsRoutes from "./analytics.route";
import pdfRoutes from "./pdf.route";
import eventRoutes from "./events.route";
const router = Router();


router.use("/auth",authRoutes);
router.use("/departments",departmentRoutes);
router.use("/rooms", roomRoutes);
router.use("/courses", courseRoutes);
router.use("/users", userRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/timetable", pdfRoutes);
router.use("/events",eventRoutes);

export default router;