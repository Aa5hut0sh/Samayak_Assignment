import { Router } from "express";
import { redis } from "../config/redis";

const router = Router();


const subscriber = redis.duplicate();
subscriber.subscribe("dashboard-updates");

router.get("/dashboard-stream", (req, res) => {

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");


  res.write("data: {\"type\": \"connected\"}\n\n");


  const listener = (channel: string, message: string) => {
    if (channel === "dashboard-updates") {
      res.write(`data: ${message}\n\n`);
    }
  };

  subscriber.on("message", listener);

  req.on("close", () => {
    subscriber.off("message", listener);
  });
});

export default router;