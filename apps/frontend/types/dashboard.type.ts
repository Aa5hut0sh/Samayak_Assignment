export interface DashboardMetrics {
  roomUtilisation: { overallPercentage: number };
  avgEmptyRoomHoursPerDay: number;
  underRunningCourses: number;
  totalSlots: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}