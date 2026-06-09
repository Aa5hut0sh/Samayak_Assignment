export enum Role {
  ADMIN = "ADMIN",
  COORDINATOR = "COORDINATOR",
  PROFESSOR = "PROFESSOR",
  HOD = "HOD",
  DEAN = "DEAN",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface RegisterAdminRequest {
  email: string;
  password: string;
  name: string;
  adminSecret: string;
}