import api from "@/lib/api";
import type { ApiResponse } from "@/types/api.type";
import type { DashboardMetrics } from "@/types/analytics.type";

export const analyticsService = {
  getDashboard: async (departmentId?: string): Promise<ApiResponse<DashboardMetrics>> => {
    const res = await api.get<ApiResponse<DashboardMetrics>>("/analytics", {
      params: departmentId ? { departmentId } : {},
    });
    return res.data;
  },
};