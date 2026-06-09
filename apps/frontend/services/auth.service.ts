import api from "@/lib/api";
import type { ApiResponse } from "@/types/api.type";
import type {
  LoginRequest,
  LoginResponse,
  RegisterAdminRequest,
  User,
} from "@/types/auth.type";

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>("/auth/login", data);
    if (res.data.token) {
      document.cookie = `token=${res.data.token}; path=/; max-age=604800; SameSite=Lax`;
    }
    return res.data;
  },

  registerAdmin: async (data: RegisterAdminRequest): Promise<ApiResponse<{ token: string }>> => {
    const res = await api.post<ApiResponse<{ token: string }>>("/auth/register/admin", data);
    if (res.data.data?.token) {
      document.cookie = `token=${res.data.data.token}; path=/; max-age=604800; SameSite=Lax`;
    }
    return res.data;
  },

  logout: async (): Promise<ApiResponse> => {
    const res = await api.post<ApiResponse>("/auth/logout");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    return res.data;
  },

  me: async (): Promise<ApiResponse<User>> => {
    const res = await api.get<ApiResponse<User>>("/auth/me");
    return res.data;
  },
};