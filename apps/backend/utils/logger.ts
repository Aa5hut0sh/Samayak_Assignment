import type { Request } from "express";

export const logger = {
  info: (req: Request, message: string, meta: any = {}) => {
    console.log(`[${req.correlationId}] INFO: ${message}`, meta);
  },
  error: (req: Request, message: string, error: any) => {
    console.error(`[${req.correlationId}] ERROR: ${message}`, error);
  },
  warn: (req: Request, message: string) => {
    console.warn(`[${req.correlationId}] WARN: ${message}`);
  }
};