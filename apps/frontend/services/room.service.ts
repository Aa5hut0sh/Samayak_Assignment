import api from "@/lib/api";
import type { PaginatedResponse, ApiResponse } from "@/types/api.type";
import type {
  Room,
  CreateRoomRequest,
  UpdateRoomRequest,
  RoomImportResult,
} from "@/types/room.type";

export const roomService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
  }): Promise<PaginatedResponse<Room>> => {
    const res = await api.get<PaginatedResponse<Room>>("/rooms", { params });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<Room>> => {
    const res = await api.get<ApiResponse<Room>>(`/rooms/${id}`);
    return res.data;
  },

  create: async (data: CreateRoomRequest): Promise<ApiResponse<Room>> => {
    const res = await api.post<ApiResponse<Room>>("/rooms", data);
    return res.data;
  },

  update: async (id: string, data: UpdateRoomRequest): Promise<ApiResponse<Room>> => {
    const res = await api.patch<ApiResponse<Room>>(`/rooms/${id}`, data);
    return res.data;
  },

  delete: async (id: string, force = false): Promise<ApiResponse> => {
    const res = await api.delete<ApiResponse>(`/rooms/${id}`, {
      params: force ? { force: "true" } : {},
    });
    return res.data;
  },

  import: async (file: File): Promise<RoomImportResult> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<RoomImportResult>("/rooms/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};