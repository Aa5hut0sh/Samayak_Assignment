import { Router } from "express";
import { redis } from "../config/redis";

const router = Router();

// Create a secondary Redis client specifically for subscribing (Redis requires a dedicated client for this)
const subscriber = redis.duplicate();
subscriber.subscribe("dashboard-updates");

router.get("/dashboard-stream", (req, res) => {
  // 1. Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send an initial heartbeat to establish connection
  res.write("data: {\"type\": \"connected\"}\n\n");

  // 2. Listen for messages from Redis and push them to the browser
  const listener = (channel: string, message: string) => {
    if (channel === "dashboard-updates") {
      res.write(`data: ${message}\n\n`);
    }
  };

  subscriber.on("message", listener);

  // 3. Cleanup on client disconnect
  req.on("close", () => {
    subscriber.off("message", listener);
  });
});

export default router;