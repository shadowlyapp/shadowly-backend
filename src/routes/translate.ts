import express, { Request, Response, Router } from "express";
import axios from "axios";

const router = Router();

interface DeepLResponse {
  translations: { text: string }[];
}

const supportedLanguages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "it", name: "Italian" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "zh", name: "Chinese" },
];

router.post("/", async (req: Request, res: Response): Promise<any> => {
  const { word, source = "en", target = "es" } = req.body;
  const apiKey = process.env.DEEPL_API_KEY;

  if (typeof word !== "string" || !word.trim()) {
    return res.status(400).json({ error: "Missing or invalid 'word'" });
  }
  
  if (!apiKey) {
    return res.status(500).json({ error: "Missing DeepL API key" });
  }

  try {
    const params = new URLSearchParams();
    params.append("auth_key", apiKey);
    params.append("text", word);
    params.append("source_lang", source.toUpperCase());
    params.append("target_lang", target.toUpperCase());

    const response = await axios.post<DeepLResponse>(
      "https://api-free.deepl.com/v2/translate",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const translatedText = response.data.translations?.[0]?.text || "";
    res.json({ translatedText });
  } catch (err: any) {
    console.error("🛑 DeepL error:", { word, source, target, error: err.response?.data || err.message });
    res.status(500).json({
      error: "Translation failed",
      details: err.response?.data?.message || err.message,
    });
  }
});

router.get("/languages", (_req: Request, res: Response) => {
  res.json({ languages: supportedLanguages });
});

export default router;