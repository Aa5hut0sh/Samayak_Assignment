import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma, Role } from "@repo/db/client";
import { FileParserService } from "../services/file-parser.service";
import bcrypt from "bcrypt";
import fs from "fs";

const DEFAULT_PASSWORD = "SamayakUser@2026";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  role: z.nativeEnum(Role),
  departmentId: z.string().uuid().optional().nullable(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
  departmentId: z.string().uuid().optional().nullable(),
});

const importPreviewRowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z
    .enum(["ADMIN", "COORDINATOR", "PROFESSOR", "HOD", "DEAN"])
    .default("PROFESSOR"),
  department_code: z.string().optional(),
});

const commitDecisionSchema = z.object({
  decisions: z.array(
    z.object({
      email: z.string().email(),
      name: z.string(),
      role: z.nativeEnum(Role),
      departmentId: z.string().optional().nullable(),
      action: z.enum(["CREATE", "MERGE", "SKIP"]),
    }),
  ),
});


const syncFacultyRecord = async (
  name: string,
  email: string,
  departmentId: string | null | undefined,
  role: Role,
) => {
  const academicRoles: Role[] = [Role.PROFESSOR, Role.HOD, Role.DEAN];

  if (departmentId && academicRoles.includes(role)) {
    if (email) {

      const existing = await prisma.faculty.findFirst({
        where: { email, deletedAt: null },
      });

      if (existing) {
        await prisma.faculty.update({
          where: { id: existing.id },
          data: { name, departmentId, deletedAt: null },
        });
      } else {
        await prisma.faculty.create({
          data: { name, email, departmentId },
        });
      }
    } else {
      await prisma.faculty.create({
        data: { name, departmentId },
      });
    }
  }
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const search = (req.query.search as string)?.trim() || "";
    const role = req.query.role as Role | undefined;

    const where: any = {
      deletedAt: null,
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          departmentId: true,
          department: { select: { code: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = createUserSchema.safeParse(req.body);
    if (!parse.success)
      return res.status(400).json({ success: false, errors: parse.error.issues });

    const { name, email, role, departmentId } = parse.data;

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing && !existing.deletedAt) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    if (existing && existing.deletedAt) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { name, role, departmentId, deletedAt: null, passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 10) },
      });
      await syncFacultyRecord(name, email, departmentId, role);
      return res.status(200).json({ success: true, data: user });
    }

   
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const user = await prisma.user.create({
      data: { name, email, role, departmentId: departmentId || null, passwordHash },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });

    await syncFacultyRecord(name, email, departmentId, role);
    return res.status(201).json({ success: true, data: user });

  } catch (err) { next(err); }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const parse = updateUserSchema.safeParse(req.body);
    if (!parse.success)
      return res
        .status(400)
        .json({ success: false, errors: parse.error.issues });

    const existing = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const updated = await prisma.user.update({
      where: { id },
      data: parse.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
      },
    });

    await syncFacultyRecord(
      updated.name,
      updated.email,
      updated.departmentId,
      updated.role,
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (user.email) {
      await prisma.faculty.updateMany({
        where: { email: user.email, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }

    res.json({ success: true, message: "User deleted (recoverable)" });
  } catch (err) {
    next(err);
  }
};


export const restoreUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.deletedAt) {
      return res
        .status(400)
        .json({ success: false, message: "User is not deleted" });
    }

    await prisma.user.update({ where: { id }, data: { deletedAt: null } });

    if (user.email) {
      await prisma.faculty.updateMany({
        where: { email: user.email },
        data: { deletedAt: null },
      });
    }

    res.json({ success: true, message: "User restored successfully" });
  } catch (err) {
    next(err);
  }
};


export const previewUserImport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const rows = await FileParserService.parseSpreadsheet(req.file.path);

    const preview: any[] = [];
    const errors: any[] = [];


    const departments = await prisma.department.findMany({
      where: { deletedAt: null },
    });
    const deptMap = new Map(
      departments.map((d) => [d.code.toUpperCase(), d.id]),
    );


    const existingUsers = await prisma.user.findMany({
      select: { email: true, name: true, role: true },
    });
    const userMap = new Map(
      existingUsers.map((u) => [u.email.toLowerCase(), u]),
    );

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const parse = importPreviewRowSchema.safeParse(rows[i]);

      if (!parse.success) {
        errors.push({
          row: rowNum,
          data: rows[i],
          reason: parse.error.issues.map((e) => e.message).join("; "),
        });
        continue;
      }

      const { name, email, role, department_code } = parse.data;
      let departmentId = null;

      if (department_code) {
        departmentId = deptMap.get(department_code.toUpperCase().trim());
        if (!departmentId && role !== "ADMIN") {
          errors.push({
            row: rowNum,
            data: rows[i],
            reason: `Department '${department_code}' not found`,
          });
          continue;
        }
      }

      const existingUser = userMap.get(email.toLowerCase());

      preview.push({
        row: rowNum,
        name,
        email: email.toLowerCase(),
        role,
        departmentId,
        department_code,
        status: existingUser ? "DUPLICATE" : "NEW",
        existingData: existingUser || null,
      });
    }

    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      summary: {
        total: rows.length,
        validNew: preview.filter((p) => p.status === "NEW").length,
        duplicates: preview.filter((p) => p.status === "DUPLICATE").length,
        errors: errors.length,
      },
      preview,
      errors,
    });
  } catch (err) {
    next(err);
  }
};


export const commitUserImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = commitDecisionSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ success: false, errors: parse.error.issues });

    const { decisions } = parse.data;
    let created = 0, merged = 0, skipped = 0;
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const decision of decisions) {
      if (decision.action === "SKIP") { skipped++; continue; }


      const { action, ...userData } = decision;

      if (decision.action === "CREATE") {
        await prisma.user.create({
          data: { 
            ...userData, 
            passwordHash,
            departmentId: userData.departmentId || null 
          }
        });
        await syncFacultyRecord(userData.name, userData.email, userData.departmentId, userData.role);
        created++;
      } else if (decision.action === "MERGE") {
        await prisma.user.update({
          where: { email: userData.email },
          data: { 
            name: userData.name, 
            role: userData.role, 
            departmentId: userData.departmentId || null, 
            deletedAt: null 
          }
        });
        await syncFacultyRecord(userData.name, userData.email, userData.departmentId, userData.role);
        merged++;
      }
    }

    res.json({ success: true, message: "Import committed", summary: { created, merged, skipped } });
  } catch (err) { next(err); }
};