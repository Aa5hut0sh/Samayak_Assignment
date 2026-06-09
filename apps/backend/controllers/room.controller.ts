import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma, RoomType } from "@repo/db/client";
import { FileParserService } from "../services/file-parser.service";
import { broadcastDashboardUpdate  } from "../services/event.service";
import { invalidateAnalyticsCache } from "../services/analytics.service";
import fs from "fs";

const createRoomSchema = z.object({
  number: z.string().min(1, "Room number is required"),
  capacity: z.number().int().positive("Capacity must be a positive number"),
  type: z.nativeEnum(RoomType),
  departmentId: z.string().uuid("Valid Department ID is required"),
});

const updateRoomSchema = z.object({
  number: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  type: z.nativeEnum(RoomType).optional(),
});


const importRowSchema = z.object({
  room_number: z.string().min(1),
  department_code: z.string().min(1),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("")), 
  type: z.enum(["CLASSROOM", "LAB", "OTHER"]).default("CLASSROOM"),
});

export const getRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const search = (req.query.search as string)?.trim() || "";
    const departmentId = req.query.departmentId as string | undefined;

    const where: any = {
      deletedAt: null,
      ...(departmentId && { departmentId }),
      ...(search && { number: { contains: search, mode: "insensitive" } }),
    };

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { number: "asc" },
        include: { department: { select: { name: true, code: true } } },
      }),
      prisma.room.count({ where }),
    ]);

    res.json({
      success: true,
      data: rooms,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = createRoomSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const { number, capacity, type, departmentId } = parse.data;

    const existing = await prisma.room.findUnique({
      where: { number_departmentId: { number, departmentId } },
    });

    if (existing && !existing.deletedAt) {
      return res.status(409).json({ success: false, message: "Room number already exists in this department" });
    }

    const room = await prisma.room.upsert({
      where: { number_departmentId: { number, departmentId } },
      update: { capacity, type, deletedAt: null },
      create: { number, capacity, type, departmentId },
    });

    
    await broadcastDashboardUpdate("Room created or updated", departmentId);
    invalidateAnalyticsCache();

    res.status(201).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
};

export const getRoomById = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const id = req.params.id as string;

        const room = await prisma.room.findUnique({
            where: { id, deletedAt: null },
            include: { department: { select: { name: true, code: true } } },
        });

        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        res.status(200).json({ success: true, data: room });
    }catch (err) {
        next(err);
    }
}

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parse = updateRoomSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const existing = await prisma.room.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

  
    if (parse.data.number && parse.data.number !== existing.number) {
      const conflict = await prisma.room.findUnique({
        where: { number_departmentId: { number: parse.data.number, departmentId: existing.departmentId } },
      });
      if (conflict) {
        return res.status(409).json({ success: false, message: "Room number already exists" });
      }
    }

    const updated = await prisma.room.update({
      where: { id },
      data: parse.data,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { force } = req.query;

    const room = await prisma.room.findUnique({
      where: { id, deletedAt: null },
      include: { _count: { select: { slots: true } } },
    });

    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    if (room._count.slots > 0 && force !== "true") {
      return res.status(409).json({
        success: false,
        message: "Room is currently assigned to timetable slots. Pass ?force=true to confirm.",
        slotsCount: room._count.slots,
      });
    }

    await prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await broadcastDashboardUpdate("Room deleted", room.departmentId);
    invalidateAnalyticsCache();

    res.json({ success: true, message: "Room deleted successfully" });
  } catch (err) {
    next(err);
  }
};



export const importRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const rows = await FileParserService.parseSpreadsheet(req.file.path);
    
    const passed: any[] = [];
    const flagged: any[] = []; 
    const failed: { row: number; data: any; reason: string }[] = [];


    const departments = await prisma.department.findMany({ where: { deletedAt: null } });
    const deptMap = new Map(departments.map(d => [d.code, d.id]));

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const parse = importRowSchema.safeParse(rows[i]);

      if (!parse.success) {
        failed.push({ row: rowNum, data: rows[i], reason: parse.error.issues.map(e => e.message).join("; ") });
        continue;
      }

      const { room_number, department_code, capacity, type } = parse.data;
      const deptId = deptMap.get(department_code.toUpperCase().trim());

      if (!deptId) {
        failed.push({ row: rowNum, data: rows[i], reason: `Department code '${department_code}' not found` });
        continue;
      }

      const parsedCapacity = typeof capacity === 'number' ? capacity : null;

      try {
        await prisma.room.upsert({
          where: { number_departmentId: { number: room_number.toString(), departmentId: deptId } },
          update: { capacity: parsedCapacity, type, deletedAt: null },
          create: { number: room_number.toString(), capacity: parsedCapacity, type, departmentId: deptId },
        });


        if (parsedCapacity === null) {
          flagged.push({ row: rowNum, room_number, reason: "Missing capacity" });
        } else {
          passed.push({ row: rowNum, room_number });
        }

      } catch (dbErr: any) {
        failed.push({ row: rowNum, data: rows[i], reason: dbErr.message });
      }
    }

    fs.unlink(req.file.path, () => {});
    
    invalidateAnalyticsCache();
    await broadcastDashboardUpdate("Rooms imported", departments[0]?.id);

    res.json({
      success: true,
      summary: {
        total: rows.length,
        passed: passed.length,
        flagged: flagged.length,
        failed: failed.length,
      },
      passed,
      flagged,
      failed,
    });
  } catch (err) {
    next(err);
  }
};