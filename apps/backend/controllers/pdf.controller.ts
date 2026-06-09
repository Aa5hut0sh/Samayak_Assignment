import type { Request, Response, NextFunction } from "express";
import { prisma, ImportStatus } from "@repo/db/client";
import { addPdfIngestionJob } from "../queues/pdf.queue";

export const uploadPdfTimetable = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No PDF file uploaded" });
    }

    const importJob = await prisma.importJob.create({
      data: {
        filename: req.file.originalname,
        status: ImportStatus.QUEUED,
      },
    });

    const job = await addPdfIngestionJob(importJob.id, req.file.path);

    await prisma.importJob.update({
      where: { id: importJob.id },
      data: { bullJobId: job?.id },
    });

    res.status(202).json({
      success: true,
      message:
        "PDF Queued for ingestion. Poll the status using the importJobId.",
      data: { importJobId: importJob.id },
    });
  } catch (err) {
    next(err);
  }
};

export const getImportStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const jobId = req.params.id as string;

    if (!jobId) {
      return res
        .status(400)
        .json({ success: false, message: "Job ID is required" });
    }

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res
        .status(404)
        .json({ success: false, message: "Import job not found" });
    }

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};
