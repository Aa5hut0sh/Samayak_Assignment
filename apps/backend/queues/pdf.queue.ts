
import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const pdfQueue = new Queue("pdf-ingestion", {
  connection: redis as any,
});

export const addPdfIngestionJob = async (importJobId: string, filePath: string) => {
  return await pdfQueue.add(
    "process-pdf",
    { importJobId, filePath },
    {
      jobId: importJobId,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
};