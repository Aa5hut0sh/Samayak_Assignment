import { redis } from "../config/redis";

export const broadcastDashboardUpdate = async (message: string, departmentId?: string | null) => {
  try {

    await redis.publish("dashboard-updates", JSON.stringify({
      type: "DATA_CHANGED",
      message,
      departmentId
    }));
  } catch (error) {
    console.error("Failed to broadcast update:", error);
  }
};