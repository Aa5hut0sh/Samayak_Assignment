export interface Department {
  id: string;
  code: string;
  name: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    branches: number;
    rooms: number;
    users: number;
    faulties: number;
  };
}

export interface Branch {
  id: string;
  name: string;
  departmentId: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sections: number;
    courses: number;
  };
}

export interface DepartmentWithBranches extends Department {
  branches: Branch[];
}

export interface DependencyCheck {
  hasDependencies: boolean;
  counts: {
    branches: number;
    rooms: number;
    users: number;
    faculty: number;
  };
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
}

export interface CreateBranchRequest {
  name: string;
}

export interface ImportSummary {
  total: number;
  passed: number;
  failed: number;
}

export interface ImportResult {
  success: boolean;
  summary: ImportSummary;
  passed: { row: number; department_name: string; code: string; branch_name?: string }[];
  failed: { row: number; data: any; reason: string }[];
}