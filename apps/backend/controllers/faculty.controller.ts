
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/db/client';

export const getFaculties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit      = Math.min(100, parseInt(req.query.limit as string) || 20);
    const search     = (req.query.search as string)?.trim() || '';
    const deptId     = req.query.departmentId as string | undefined;

    const where: any = {
      deletedAt: null,
      ...(deptId && { departmentId: deptId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [faculty, total] = await Promise.all([
      prisma.faculty.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          department: { select: { name: true, code: true } },
          _count: { select: { slotAssignments: true } },
        },
      }),
      prisma.faculty.count({ where }),
    ]);

    res.json({
      success: true,
      data: faculty,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};