import api from "@/lib/api";
import type { ApiResponse } from "@/types/api.type";
import type { ImportJob } from "@/types/ingestion.type";

export const timetableService = {
  uploadPdf: async (file: File): Promise<ApiResponse<{ importJobId: string }>> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<ApiResponse<{ importJobId: string }>>("/timetable/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getStatus: async (jobId: string): Promise<ApiResponse<ImportJob>> => {
    const res = await api.get<ApiResponse<ImportJob>>(`/timetable/status/${jobId}`);
    return res.data;
  },
};