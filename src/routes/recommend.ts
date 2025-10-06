// apps/shadowly-backend/src/routes/recommend.ts

import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import playlistConfig from "../config/playlistConfig";

dotenv.config();

const router = express.Router();
const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const YT_WEB_API_KEY =
  process.env.YT_WEB_PLAYER_API_KEY || "AIzaSyA-CPZ5r_L6O7m1qfqCBKOnYwH5crcRc9g";
const YT_WEB_CLIENT_VERSION =
  process.env.YT_WEB_CLIENT_VERSION || "2.20240111.08.00";
const YT_WEB_CLIENT_NAME = process.env.YT_WEB_CLIENT_NAME || "WEB";

const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
};

async function videoSupportsCaptions(videoId: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `https://www.youtube.com/youtubei/v1/player?key=${YT_WEB_API_KEY}`,
      {
        context: {
          client: {
            clientName: YT_WEB_CLIENT_NAME,
            clientVersion: YT_WEB_CLIENT_VERSION,
            hl: "en",
            gl: "US",
          },
        },
        videoId,
      },
      {
        headers: {
          ...DEFAULT_HEADERS,
          referer: "https://www.youtube.com/",
          "content-type": "application/json",
        },
        timeout: 10000,
        validateStatus: () => true,
      }
    );

    if (response.status >= 400) return false;

    const data: any = response.data ?? {};
    const captionTracks =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    return Array.isArray(captionTracks) && captionTracks.length > 0;
  } catch (err) {
    console.warn(`⚠️ caption availability check failed for ${videoId}:`, err);
    return false;
  }
}

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
          const shuffled = [...items];

          for (let attempt = 0; attempt < Math.min(shuffled.length, 5); attempt += 1) {
            const index = Math.floor(Math.random() * shuffled.length);
            const [candidate] = shuffled.splice(index, 1);
            if (!candidate) break;

            const videoId = candidate.snippet.resourceId.videoId;
            if (await videoSupportsCaptions(videoId)) {
              return {
                id: videoId,
                title: candidate.snippet.title,
                thumbnail: candidate.snippet.thumbnails?.high?.url || "",
                language: entry.language,
                level: entry.level,
              };
            }
          }

          return null;
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
