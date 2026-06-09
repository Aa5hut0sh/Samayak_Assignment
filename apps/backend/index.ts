import dotenv from "dotenv";
dotenv.config();
import express from "express";
import type { Request, Response,NextFunction } from "express";
import cors from "cors";
import { correlationIdMiddleware } from "./middlewares/correlation.middleware";
import { checkHealth } from "./controllers/health.controller";
import indexRoutes from "./routes/index.route";
import "./workers/pdf.worker"

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: "*", 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(correlationIdMiddleware);



app.get("/api/health", checkHealth);

app.use("/api" , indexRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
    correlationId: req.correlationId
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

