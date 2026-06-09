export enum RoomType {
  CLASSROOM = "CLASSROOM",
  LAB = "LAB",
  OTHER = "OTHER",
}

export interface Room {
  id: string;
  number: string;
  capacity: number | null;
  type: RoomType;
  departmentId: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  department?: {
    name: string;
    code: string;
  };
}

export interface CreateRoomRequest {
  number: string;
  capacity: number;
  type: RoomType;
  departmentId: string;
}

export interface UpdateRoomRequest {
  number?: string;
  capacity?: number;
  type?: RoomType;
}

export interface RoomImportResult {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    flagged: number;
    failed: number;
  };
  passed: { row: number; room_number: string }[];
  flagged: { row: number; room_number: string; reason: string }[];
  failed: { row: number; data: any; reason: string }[];
}