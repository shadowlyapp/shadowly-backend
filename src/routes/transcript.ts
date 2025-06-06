import { Router, Request, Response } from "express";
import axios from "axios";
import { parseCaptionXml } from "../utils/captionUtils";

const router = Router();

router.get("/scrape", async (req: Request, res: Response): Promise<void> => {
  const videoId = req.query.id as string;
  const lang = req.query.lang as string | undefined;

  if (!videoId) {
    res.status(400).json({ error: "Missing video ID" });
    return;
  }

  try {
    // Load HTML from YouTube video page
    const html = (await axios.get<string>(`https://www.youtube.com/watch?v=${videoId}`)).data;

    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s);
    if (!match) {
      res.status(500).json({ error: "ytInitialPlayerResponse not found" });
      return;
    }

    const playerResponse = JSON.parse(match[1]);
    const captionTracks: any[] =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    if (captionTracks.length === 0) {
      res.status(404).json({ error: "No captions available" });
      return;
    }

    const preferAutogen = req.query.autogen === "1";

const selectedTrack =
  captionTracks.find((t) =>
    lang
      ? t.languageCode === lang && (preferAutogen ? t.kind === "asr" : true)
      : true
  ) || captionTracks[0];

    if (!selectedTrack?.baseUrl) {
      res.status(500).json({
        error: "Caption track URL missing",
        tracks: captionTracks,
      });
      return;
    }

    console.log("🎯 Using caption track:", {
      language: selectedTrack.languageCode,
      kind: selectedTrack.kind,
      autoGenerated: selectedTrack.kind === "asr",
    });

    const headers =
      selectedTrack.kind === "asr"
        ? { headers: { "User-Agent": "Mozilla/5.0" } }
        : {};

    const captionXml = (await axios.get<string>(selectedTrack.baseUrl, headers)).data;

    const transcript = parseCaptionXml(captionXml);

    const availableCaptions = captionTracks.map((t: any) => ({
      languageCode: t.languageCode,
      name: t.name?.simpleText || t.languageCode,
      isAutoGenerated: t.kind === "asr",
    }));

    const isAutoGenerated = selectedTrack.kind === "asr";

    res.status(200).json({
      transcript,
      captions: availableCaptions,
      isAutoGenerated,
    });
  } catch (err: any) {
    console.error("❌ Transcript fetch error:", err.message);
    res.status(500).json({
      error: "Failed to fetch transcript",
      details: err.message,
    });
  }
});

export default router;