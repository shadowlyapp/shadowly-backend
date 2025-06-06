// apps/shadowly-backend/src/routes/youtube.ts

import express, { Router, Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router: Router = express.Router();

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

router.get("/playlist", (req, res) => {
    (async () => {
      const playlistId = req.query.id;
  
      if (!playlistId || typeof playlistId !== "string") {
        res.status(400).json({ error: "Missing or invalid playlist ID" });
        return;
      }
  
      try {
        const response = await axios.get<{ items: any[] }>(
          "https://www.googleapis.com/youtube/v3/playlistItems",
          {
            params: {
              part: "snippet",
              maxResults: 10,
              playlistId,
              key: YT_API_KEY,
            },
          }
        );
  
        const videos = response.data.items.map((item: any) => ({
          videoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.high?.url,
        }));
  
        res.json({ videos });
      } catch (err: any) {
        console.error("YouTube API error:", err?.response?.data || err.message);
        res.status(500).json({
          error: "Failed to fetch playlist",
          detail: err?.response?.data || err.message,
        });
      }
    })();
  });

export default router;