import type { Role } from "./auth.type";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  department?: { code: string };
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: Role;
  departmentId?: string | null;
}

export interface UpdateUserRequest {
  name?: string;
  role?: Role;
  departmentId?: string | null;
}

// Preview step
export interface UserPreviewRow {
  row: number;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  department_code?: string;
  status: "NEW" | "DUPLICATE";
  existingData: { email: string; name: string; role: Role } | null;
}

export interface UserImportPreviewResponse {
  success: boolean;
  summary: {
    total: number;
    validNew: number;
    duplicates: number;
    errors: number;
  };
  preview: UserPreviewRow[];
  errors: { row: number; data: any; reason: string }[];
}

// Commit step
export interface CommitDecision {
  email: string;
  name: string;
  role: Role;
  departmentId?: string | null;
  action: "CREATE" | "MERGE" | "SKIP";
}

export interface UserImportCommitResponse {
  success: boolean;
  message: string;
  summary: {
    created: number;
    merged: number;
    skipped: number;
  };
}