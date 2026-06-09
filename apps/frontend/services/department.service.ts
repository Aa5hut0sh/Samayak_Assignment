import api from "@/lib/api";
import type { PaginatedResponse, ApiResponse } from "@/types/api.type";
import type {
  Department,
  DepartmentWithBranches,
  Branch,
  DependencyCheck,
  CreateDepartmentRequest,
  CreateBranchRequest,
  ImportResult,
} from "@/types/department.type";

export const departmentService = {
  // ── Departments ──────────────────────────────────────────────────────────

  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Department>> => {
    const res = await api.get<PaginatedResponse<Department>>("/departments", { params });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<DepartmentWithBranches>> => {
    const res = await api.get<ApiResponse<DepartmentWithBranches>>(`/departments/${id}`);
    return res.data;
  },

  create: async (data: CreateDepartmentRequest): Promise<ApiResponse<Department>> => {
    const res = await api.post<ApiResponse<Department>>("/departments", data);
    return res.data;
  },

  update: async (id: string, data: Partial<CreateDepartmentRequest>): Promise<ApiResponse<Department>> => {
    const res = await api.patch<ApiResponse<Department>>(`/departments/${id}`, data);
    return res.data;
  },

  checkDependencies: async (id: string): Promise<ApiResponse<DependencyCheck>> => {
    const res = await api.get<ApiResponse<DependencyCheck>>(`/departments/${id}/dependencies`);
    return res.data;
  },

  // Pass force=true after user confirms the warning dialog
  delete: async (id: string, force = false): Promise<ApiResponse> => {
    const res = await api.delete<ApiResponse>(`/departments/${id}`, {
      params: force ? { force: "true" } : {},
    });
    return res.data;
  },

  import: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<ImportResult>("/departments/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // ── Branches ─────────────────────────────────────────────────────────────

  getBranches: async (departmentId: string): Promise<ApiResponse<Branch[]>> => {
    const res = await api.get<ApiResponse<Branch[]>>(`/departments/${departmentId}/branches`);
    return res.data;
  },

  createBranch: async (departmentId: string, data: CreateBranchRequest): Promise<ApiResponse<Branch>> => {
    const res = await api.post<ApiResponse<Branch>>(`/departments/${departmentId}/branches`, data);
    return res.data;
  },

  updateBranch: async (departmentId: string, branchId: string, data: CreateBranchRequest): Promise<ApiResponse<Branch>> => {
    const res = await api.patch<ApiResponse<Branch>>(`/departments/${departmentId}/branches/${branchId}`, data);
    return res.data;
  },

  deleteBranch: async (departmentId: string, branchId: string, force = false): Promise<ApiResponse> => {
    const res = await api.delete<ApiResponse>(`/departments/${departmentId}/branches/${branchId}`, {
      params: force ? { force: "true" } : {},
    });
    return res.data;
  },
};