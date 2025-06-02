// apps/shadowly-backend/src/index.ts

import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import translateRoutes from "./routes/translate";
import transcriptRoutes from "./routes/transcript";
import youtubeRoutes from "./routes/youtube";
import recommendRoutes from "./routes/recommend";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Primary API Routes
app.use("/api/translate", translateRoutes);
app.use("/api/transcript", transcriptRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/recommend", recommendRoutes);         // handles /api/recommend/random

// Health check route
app.get("/", (_req: Request, res: Response) => {
  res.send("✅ Shadowly Backend is live");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});