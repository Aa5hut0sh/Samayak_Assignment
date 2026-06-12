import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "@repo/db/client";
import { FileParserService } from "../services/file-parser.service";
import fs from "fs";

const createDepartmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(10).toUpperCase(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(10).toUpperCase().optional(),
});

const createBranchSchema = z.object({
  name: z.string().min(1),
});

const importRowSchema = z.object({
  department_name: z.string().min(1),
  department_code: z.string().min(1).max(10),
  branch_name: z.string().optional(),
});

export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(100, parseInt(req.query.limit as string) || 20);
    const search  = (req.query.search as string)?.trim() || "";

    const where = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          branches: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              branches: true,
              rooms:    true,
              users:    true,
              faulties: true,
            },
          },
        },
      }),
      prisma.department.count({ where }),
    ]);

    res.json({
      success: true,
      data: departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};


export const getDepartmentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const department = await prisma.department.findUnique({
      where: { id, deletedAt: null },
      include: {
        branches: { where: { deletedAt: null }, orderBy: { name: "asc" } },
        _count: {
          select: { rooms: true, users: true, faulties: true },
        },
      },
    });

    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    res.json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = createDepartmentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const { name, code } = parse.data;

    const existing = await prisma.department.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Department code "${code}" already exists` });
    }

    const department = await prisma.department.create({ data: { name, code } });

    res.status(201).json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
};

export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parse = updateDepartmentSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const existing = await prisma.department.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    if (parse.data.code && parse.data.code !== existing.code) {
      const codeConflict = await prisma.department.findUnique({
        where: { code: parse.data.code },
      });
      if (codeConflict) {
        return res.status(409).json({ success: false, message: `Code "${parse.data.code}" already in use` });
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: parse.data,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const checkDepartmentDependencies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const [branches, rooms, users, faculty] = await Promise.all([
      prisma.branch.count({ where:   { departmentId: id, deletedAt: null } }),
      prisma.room.count({ where:     { departmentId: id, deletedAt: null } }),
      prisma.user.count({ where:     { departmentId: id, deletedAt: null } }),
      prisma.faculty.count({ where:  { departmentId: id, deletedAt: null } }),
    ]);

    const hasDependencies = branches + rooms + users + faculty > 0;

    res.json({
      success: true,
      hasDependencies,
      counts: { branches, rooms, users, faculty },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { force } = req.query;

    const department = await prisma.department.findUnique({
      where: { id, deletedAt: null },
    });
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const [branches, rooms, users, faculty] = await Promise.all([
      prisma.branch.count({ where:  { departmentId: id, deletedAt: null } }),
      prisma.room.count({ where:    { departmentId: id, deletedAt: null } }),
      prisma.user.count({ where:    { departmentId: id, deletedAt: null } }),
      prisma.faculty.count({ where: { departmentId: id, deletedAt: null } }),
    ]);

    const hasDependencies = branches + rooms + users + faculty > 0;

    if (hasDependencies && force !== "true") {
      return res.status(409).json({
        success: false,
        message: "Department has dependent records. Pass ?force=true to confirm deletion.",
        counts: { branches, rooms, users, faculty },
      });
    }

    await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    next(err);
  }
};


export const importDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const rows = await FileParserService.parseSpreadsheet(req.file.path);

    const passed: any[] = [];
    const failed: { row: number; data: any; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; 
      const parse  = importRowSchema.safeParse(rows[i]);

      if (!parse.success) {
        failed.push({
          row: rowNum,
          data: rows[i],
          reason: parse.error.issues.map((e) => e.message).join("; "),
        });
        continue;
      }

      const { department_name, department_code, branch_name } = parse.data;
      const code = department_code.toUpperCase().trim();

      try {
        const department = await prisma.department.upsert({
          where: { code },
          update: { name: department_name, deletedAt: null },
          create: { name: department_name, code },
        });

        if (branch_name?.trim()) {
          await prisma.branch.upsert({
            where: {
              name_departmentId: {
                name: branch_name.trim(),
                departmentId: department.id,
              },
            },
            update: { deletedAt: null },
            create: { name: branch_name.trim(), departmentId: department.id },
          });
        }

        passed.push({ row: rowNum, department_name, code, branch_name });
      } catch (dbErr: any) {
        failed.push({ row: rowNum, data: rows[i], reason: dbErr.message });
      }
    }

    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      summary: {
        total:  rows.length,
        passed: passed.length,
        failed: failed.length,
      },
      passed,
      failed,
    });
  } catch (err) {
    next(err);
  }
};

//branch

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departmentId = req.params.departmentId as string;
    const parse = createBranchSchema.safeParse(req.body);
    
    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId, deletedAt: null },
    });
    
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const existing = await prisma.branch.findUnique({
      where: {
        name_departmentId: {
          name: parse.data.name,
          departmentId: departmentId,
        },
      },
    });
    
    if (existing && !existing.deletedAt) {
      return res.status(409).json({ success: false, message: "Branch already exists in this department" });
    }

    const branch = await prisma.branch.upsert({
      where: {
        name_departmentId: {
          name: parse.data.name,
          departmentId: departmentId,
        },
      },
      update: { deletedAt: null }, 
      create: { name: parse.data.name, departmentId: departmentId },
    });

    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

export const getBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departmentId = req.params.departmentId as string;

    const branches = await prisma.branch.findMany({
      where: { departmentId: departmentId, deletedAt: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { sections: true, courses: true } } },
    });

    res.json({ success: true, data: branches });
  } catch (err) {
    next(err);
  }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.params.branchId as string;
    const parse = createBranchSchema.safeParse(req.body);
    
    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId, deletedAt: null },
    });
    
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data:  { name: parse.data.name },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.params.branchId as string;
    const { force } = req.query;

    const branch = await prisma.branch.findUnique({
      where: { id: branchId, deletedAt: null },
    });
    
    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    const [sections, courses] = await Promise.all([
      prisma.section.count({ where: { branchId: branchId, deletedAt: null } }),
      prisma.course.count({  where: { branchId: branchId, deletedAt: null } }),
    ]);

    if ((sections + courses) > 0 && force !== "true") {
      return res.status(409).json({
        success: false,
        message: "Branch has dependent records. Pass ?force=true to confirm.",
        counts: { sections, courses },
      });
    }

    await prisma.branch.update({
      where: { id: branchId },
      data:  { deletedAt: new Date() },
    });

    res.json({ success: true, message: "Branch deleted successfully" });
  } catch (err) {
    next(err);
  }
};