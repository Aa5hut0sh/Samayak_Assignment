import { Router } from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  checkDepartmentDependencies,
  importDepartments,
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
} from "../controllers/department.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { Role } from "@repo/db/client";

const router = Router();

router.use(authenticate, authorize([Role.ADMIN]));


router.get("/", getDepartments);
router.post("/", createDepartment);
router.get("/:id", getDepartmentById);
router.patch("/:id", updateDepartment);
router.get("/:id/dependencies", checkDepartmentDependencies); // call this before delete
router.delete("/:id", deleteDepartment);
router.post("/import", upload.single("file"), importDepartments);


router.post("/:departmentId/branches", createBranch);
router.get("/:departmentId/branches", getBranches);
router.patch("/:departmentId/branches/:branchId", updateBranch);
router.delete("/:departmentId/branches/:branchId", deleteBranch);

export default router;
