import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma, CourseType } from "@repo/db/client";
import { FileParserService } from "../services/file-parser.service";
import { broadcastDashboardUpdate } from "../services/event.service";
import fs from "fs";
import { invalidateAnalyticsCache } from "../services/analytics.service";


const calculateContactHours = (credits: number, type: CourseType): number => {
  if (type === CourseType.LAB) {
    return credits * 2; // e.g., 1.5 credits = 3 lab hours
  }
  return credits; // e.g., 3 credits = 3 lecture hours
};

const createCourseSchema = z.object({
  code: z.string().min(1, "Course code is required").toUpperCase(),
  name: z.string().min(1, "Course name is required"),
  credits: z.number().min(0, "Credits cannot be negative"),
  type: z.nativeEnum(CourseType),
  branchId: z.string().uuid("Valid Branch ID is required"),
  semester: z.number().int().positive("Semester must be a positive integer"),
});

const updateCourseSchema = z.object({
  code: z.string().min(1).toUpperCase().optional(),
  name: z.string().min(1).optional(),
  credits: z.number().min(0).optional(),
  type: z.nativeEnum(CourseType).optional(),
  semester: z.number().int().positive().optional(),
});

const importRowSchema = z.object({
  course_code: z.string().min(1),
  course_name: z.string().min(1),
  credits: z.coerce.number().min(0),
  type: z.enum(["LECTURE", "LAB", "TUTORIAL"]).default("LECTURE"),
  department_code: z.string().min(1),
  branch_name: z.string().min(1),
  semester: z.coerce.number().int().positive(),
});

export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const search = (req.query.search as string)?.trim() || "";
    

    const branchId = req.query.branchId as string | undefined;
    const semester = req.query.semester ? parseInt(req.query.semester as string) : undefined;

    const where: any = {
      deletedAt: null,
      ...(branchId && { branchId }),
      ...(semester && { semester }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ semester: "asc" }, { code: "asc" }],
        include: { 
          branch: { 
            select: { name: true, department: { select: { code: true } } } 
          } 
        },
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      success: true,
      data: courses,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = createCourseSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const { code, name, credits, type, branchId, semester } = parse.data;


    const existing = await prisma.course.findUnique({
      where: { code_branchId_semester: { code, branchId, semester } },
    });

    if (existing && !existing.deletedAt) {
      return res.status(409).json({ success: false, message: "Course code already exists for this branch and semester" });
    }

    const isZeroCredit = credits === 0;
    const requiredContactHours = calculateContactHours(credits, type);

    const course = await prisma.course.upsert({
      where: { code_branchId_semester: { code, branchId, semester } },
      update: { name, credits, isZeroCredit, type, requiredContactHours, deletedAt: null },
      create: { 
        code, name, credits, isZeroCredit, type, branchId, semester, requiredContactHours 
      },
    });

    res.status(201).json({ success: true, data: course, flagged: isZeroCredit ? "Zero-credit subject" : null });
  } catch (err) {
    next(err);
  }
};

export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parse = updateCourseSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const existing = await prisma.course.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }


    const updatedCredits = parse.data.credits ?? existing.credits;
    const updatedType = parse.data.type ?? existing.type;
    const isZeroCredit = updatedCredits === 0;
    const requiredContactHours = calculateContactHours(updatedCredits, updatedType);


    if ((parse.data.code && parse.data.code !== existing.code) || 
        (parse.data.semester && parse.data.semester !== existing.semester)) {
      
      const newCode = parse.data.code || existing.code;
      const newSemester = parse.data.semester || existing.semester;

      const conflict = await prisma.course.findUnique({
        where: { code_branchId_semester: { code: newCode, branchId: existing.branchId, semester: newSemester } },
      });

      if (conflict) {
        return res.status(409).json({ success: false, message: "Course code already exists in this semester" });
      }
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...parse.data,
        isZeroCredit,
        requiredContactHours,
      },
    });

    invalidateAnalyticsCache();
    await broadcastDashboardUpdate("Course updated", existing.branchId);
    

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { force } = req.query;

    const course = await prisma.course.findUnique({
      where: { id, deletedAt: null },
      include: { _count: { select: { slots: true } } },
    });

    if (!course) return res.status(404).json({ success: false, message: "Course not found" });


    if (course._count.slots > 0 && force !== "true") {
      return res.status(409).json({
        success: false,
        message: "Course is currently assigned to timetable slots. Pass ?force=true to confirm.",
        slotsCount: course._count.slots,
      });
    }

    await prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    invalidateAnalyticsCache();
    await broadcastDashboardUpdate("Course deleted", course.branchId);
    

    res.json({ success: true, message: "Course deleted successfully" });
  } catch (err) {
    next(err);
  }
};



export const importCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const rows = await FileParserService.parseSpreadsheet(req.file.path);
    
    const passed: any[] = [];
    const flagged: any[] = []; // Zero-credit courses
    const failed: { row: number; data: any; reason: string }[] = [];


    const branches = await prisma.branch.findMany({ 
      where: { deletedAt: null },
      include: { department: true } 
    });
    
    const branchMap = new Map();
    branches.forEach(b => {

      const key = `${b.department.code.toUpperCase()}-${b.name.toUpperCase()}`;
      branchMap.set(key, b.id);
    });

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const parse = importRowSchema.safeParse(rows[i]);

      if (!parse.success) {
        failed.push({ row: rowNum, data: rows[i], reason: parse.error.issues.map(e => e.message).join("; ") });
        continue;
      }

      const { course_code, course_name, credits, type, department_code, branch_name, semester } = parse.data;
      const code = course_code.toUpperCase().trim();
      const branchKey = `${department_code.toUpperCase().trim()}-${branch_name.toUpperCase().trim()}`;
      const branchId = branchMap.get(branchKey);

      if (!branchId) {
        failed.push({ row: rowNum, data: rows[i], reason: `Branch '${branch_name}' under Department '${department_code}' not found` });
        continue;
      }

      const isZeroCredit = credits === 0;
      const requiredContactHours = calculateContactHours(credits, type as CourseType);

      try {
        await prisma.course.upsert({
          where: { code_branchId_semester: { code, branchId, semester } },
          update: { name: course_name, credits, isZeroCredit, type: type as CourseType, requiredContactHours, deletedAt: null },
          create: { 
            code, name: course_name, credits, isZeroCredit, type: type as CourseType, branchId, semester, requiredContactHours 
          },
        });

       
        if (isZeroCredit) {
          flagged.push({ row: rowNum, course_code: code, reason: "Zero-credit subject" });
        } else {
          passed.push({ row: rowNum, course_code: code });
        }

      } catch (dbErr: any) {
        failed.push({ row: rowNum, data: rows[i], reason: dbErr.message });
      }
    }

    fs.unlink(req.file.path, () => {});

    invalidateAnalyticsCache();
    await broadcastDashboardUpdate("Courses imported", branches[0]?.departmentId);

    res.json({
      success: true,
      summary: { total: rows.length, passed: passed.length, flagged: flagged.length, failed: failed.length },
      passed,
      flagged,
      failed,
    });
  } catch (err) {
    next(err);
  }
};