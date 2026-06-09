import api from "@/lib/api";
import type { PaginatedResponse, ApiResponse } from "@/types/api.type";
import type {
  Course,
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseImportResult,
} from "@/types/course.type";

export const courseService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: string;
    semester?: number;
  }): Promise<PaginatedResponse<Course>> => {
    const res = await api.get<PaginatedResponse<Course>>("/courses", { params });
    return res.data;
  },

  create: async (data: CreateCourseRequest): Promise<ApiResponse<Course>> => {
    const res = await api.post<ApiResponse<Course>>("/courses", data);
    return res.data;
  },

  update: async (id: string, data: UpdateCourseRequest): Promise<ApiResponse<Course>> => {
    const res = await api.patch<ApiResponse<Course>>(`/courses/${id}`, data);
    return res.data;
  },

  delete: async (id: string, force = false): Promise<ApiResponse> => {
    const res = await api.delete<ApiResponse>(`/courses/${id}`, {
      params: force ? { force: "true" } : {},
    });
    return res.data;
  },

  import: async (file: File): Promise<CourseImportResult> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<CourseImportResult>("/courses/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};