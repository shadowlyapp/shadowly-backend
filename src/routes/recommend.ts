// apps/shadowly-backend/src/routes/recommend.ts

import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import playlistConfig from "../config/playlistConfig";

dotenv.config();

const router = express.Router();
const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

// 🔁 GET /api/recommend/random — one video per playlist
router.get("/random", async (_req: Request, res: Response) => {
  try {
    const videos = await Promise.all(
      playlistConfig.map(async (entry) => {
        try {
          const response = await axios.get<{ items: any[] }>(`${BASE_URL}/playlistItems`, {
            params: {
              part: "snippet",
              maxResults: 10,
              playlistId: entry.playlistId,
              key: YT_API_KEY,
            },
          });

          const items = response.data.items;
          const random = items[Math.floor(Math.random() * items.length)];

          return {
            id: random.snippet.resourceId.videoId,
            title: random.snippet.title,
            thumbnail: random.snippet.thumbnails?.high?.url || "",
            language: entry.language,
            level: entry.level,
          };
        } catch (err) {
          console.warn(`❌ Failed to fetch for playlist ${entry.playlistId}:`, err);
          return null;
        }
      })
    );

    const filtered = videos.filter(Boolean);
    res.json({ videos: filtered });
  } catch (err) {
    console.error("❌ Error in /api/recommend/random:", err);
    res.status(500).json({ error: "Failed to fetch recommended videos" });
  }
});

// 📄 GET /api/recommend/playlists — returns config
router.get("/playlists", (_req: Request, res: Response) => {
  try {
    res.json(playlistConfig);
  } catch (err) {
    console.error("Error returning playlist config:", err);
    res.status(500).json({ error: "Failed to load playlists" });
  }
});

export default router;