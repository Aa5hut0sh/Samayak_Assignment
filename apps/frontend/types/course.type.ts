export enum CourseType {
  LECTURE = "LECTURE",
  LAB = "LAB",
  TUTORIAL = "TUTORIAL",
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  isZeroCredit: boolean;
  type: CourseType;
  semester: number;
  branchId: string;
  requiredContactHours: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: {
    name: string;
    department: { code: string };
  };
}

export interface CreateCourseRequest {
  code: string;
  name: string;
  credits: number;
  type: CourseType;
  branchId: string;
  semester: number;
}

export interface UpdateCourseRequest {
  code?: string;
  name?: string;
  credits?: number;
  type?: CourseType;
  semester?: number;
}

export interface CourseImportResult {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    flagged: number;
    failed: number;
  };
  passed: { row: number; course_code: string }[];
  flagged: { row: number; course_code: string; reason: string }[];
  failed: { row: number; data: any; reason: string }[];
}