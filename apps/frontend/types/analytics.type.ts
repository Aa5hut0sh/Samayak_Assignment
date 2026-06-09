// src/types/analytics.types.ts  — replace the whole file

export interface RoomUtilisation {
  roomNumber: string;
  occupied: number;
  total: number;
  percentage: number;
}

export interface UnderRunningCourse {
  id: string;
  code: string;
  name: string;
  type?: string;
  scheduled: number;
  required: number;
  gap: number;
}

export interface DashboardMetrics {
  roomUtilisation: {
    overallPercentage: number;       
    perRoom: RoomUtilisation[];
  };
  recoveryProbability: {              
    periods: Record<number, number>;
  };
  underRunningCourses: {             
    count: number;
    courses: UnderRunningCourse[];
  };
  avgEmptyRoomHoursPerDay: number;
}