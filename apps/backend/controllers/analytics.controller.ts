import type { Request, Response, NextFunction } from "express";
import { getDashboardMetrics } from "../services/analytics.service";

export const getDashboardAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departmentId = req.query.departmentId as string | undefined;

    const metrics = await getDashboardMetrics(departmentId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (err) {
    next(err);
  }
};