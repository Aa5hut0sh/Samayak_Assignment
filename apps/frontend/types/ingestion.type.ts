export enum ImportStatus {
  QUEUED = "QUEUED",
  PARSING = "PARSING",
  INTEGRATING = "INTEGRATING",
  DONE = "DONE",
  FAILED = "FAILED",
}

export interface ImportJob {
  id: string;
  filename: string;
  status: ImportStatus;
  bullJobId: string | null;
  departmentId: string | null;
  created: number | null;
  matched: number | null;
  failed: number | null;
  errorLog: { entity: string; reason: string }[] | null;
  createdAt: string;
  updatedAt: string;
}