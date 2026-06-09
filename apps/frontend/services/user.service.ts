import api from "@/lib/api";
import type { PaginatedResponse, ApiResponse } from "@/types/api.type";
import type {
  AppUser,
  CreateUserRequest,
  UpdateUserRequest,
  UserImportPreviewResponse,
  CommitDecision,
  UserImportCommitResponse,
} from "@/types/user.type";
import type { Role } from "@/types/auth.type";

export const userService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: Role;
  }): Promise<PaginatedResponse<AppUser>> => {
    const res = await api.get<PaginatedResponse<AppUser>>("/users", { params });
    return res.data;
  },

  create: async (data: CreateUserRequest): Promise<ApiResponse<AppUser>> => {
    const res = await api.post<ApiResponse<AppUser>>("/users", data);
    return res.data;
  },

  update: async (id: string, data: UpdateUserRequest): Promise<ApiResponse<AppUser>> => {
    const res = await api.patch<ApiResponse<AppUser>>(`/users/${id}`, data);
    return res.data;
  },

  // Soft delete
  delete: async (id: string): Promise<ApiResponse> => {
    const res = await api.delete<ApiResponse>(`/users/${id}`);
    return res.data;
  },

  restore: async (id: string): Promise<ApiResponse> => {
    const res = await api.post<ApiResponse>(`/users/${id}/restore`);
    return res.data;
  },

  // Two-step import
  previewImport: async (file: File): Promise<UserImportPreviewResponse> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<UserImportPreviewResponse>("/users/import/preview", form);
  return res.data;
},

  commitImport: async (decisions: CommitDecision[]): Promise<UserImportCommitResponse> => {
    const res = await api.post<UserImportCommitResponse>("/users/import/commit", { decisions });
    return res.data;
  },

  listFaculties: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    departmentId?: string 
  }): Promise<PaginatedResponse<AppUser>> => {
    const res = await api.get<PaginatedResponse<AppUser>>("/users/faculties", { params });
    return res.data;
  },
};