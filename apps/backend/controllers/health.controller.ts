import type { Request, Response } from "express";
import { prisma } from "@repo/db/client";
import { redis } from "../config/redis";
import { pdfQueue } from "../queues/pdf.queue";

export const checkHealth = async (req: Request, res: Response) => {
  const healthStatus = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      api: "UP",
      database: "DOWN",
      redis: "DOWN",
      queue: "DOWN",
    },
  };

  let isHealthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.services.database = "UP";
  } catch (error) {
    healthStatus.services.database = "DOWN";
    isHealthy = false;
    console.error("HealthCheck: Database down", error);
  }

 
  try {
    const pingResponse = await redis.ping();
    if (pingResponse === "PONG") {
      healthStatus.services.redis = "UP";
    } else {
      throw new Error("Redis did not respond with PONG");
    }
  } catch (error) {
    healthStatus.services.redis = "DOWN";
    isHealthy = false;
    console.error("HealthCheck: Redis down", error);
  }


  try {

    const queueClient = await pdfQueue.client;
    if (queueClient.status === "ready") {
        healthStatus.services.queue = "UP";
    }
  } catch (error) {
    healthStatus.services.queue = "DOWN";
    isHealthy = false;
    console.error("HealthCheck: BullMQ down", error);
  }


  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json(healthStatus);
};