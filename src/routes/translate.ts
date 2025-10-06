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
  { code: "ru", name: "Russian" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "zh", name: "Chinese" },
  { code: "uk", name: "Ukrainian" },
];

const normalizeLangCode = (code: string | undefined, { fallback }: { fallback: string }) => {
  if (!code) return fallback;
  if (code.toLowerCase() === "auto") return "auto";
  return code.toUpperCase();
};

const mapForDeepL = (code: string) => {
  const lowered = code.toLowerCase();
  const overrides: Record<string, string> = {
    "pt-br": "PT-BR",
    "pt": "PT-PT",
    "zh": "ZH",
  };
  if (overrides[lowered]) return overrides[lowered];
  return code.toUpperCase();
};

const mapForFallback = (code: string) => {
  const lowered = code.toLowerCase();
  const overrides: Record<string, string> = {
    "pt-br": "pt",
    "en-us": "en",
    "en-gb": "en",
    "zh": "zh",
    "uk": "uk",
  };
  if (overrides[lowered]) return overrides[lowered];
  return lowered.split("-")[0];
};

const translateWithFallback = async (
  text: string,
  source: string,
  target: string
): Promise<string> => {
  const response = await axios.post(
    "https://libretranslate.de/translate",
    {
      q: text,
      source: source === "auto" ? "auto" : mapForFallback(source),
      target: mapForFallback(target),
      format: "text",
    },
    {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      timeout: 10000,
      validateStatus: () => true,
    }
  );

  if (response.status >= 400) {
    throw new Error(`Fallback provider responded with status ${response.status}`);
  }

  const data = response.data as { translatedText?: string };
  return data?.translatedText || "";
};

router.post("/", async (req: Request, res: Response): Promise<any> => {
  const { word, source = "auto", target = "es" } = req.body;
  const apiKey = process.env.DEEPL_API_KEY;

  if (typeof word !== "string" || !word.trim()) {
    return res.status(400).json({ error: "Missing or invalid 'word'" });
  }

  const normalizedTarget = normalizeLangCode(target, { fallback: "ES" });
  const normalizedSource = normalizeLangCode(source, { fallback: "AUTO" });

  try {
    let translatedText = "";

    if (apiKey) {
      try {
        const deeplSource = mapForDeepL(normalizedSource);
        const deeplTarget = mapForDeepL(normalizedTarget);

        const params = new URLSearchParams();
        params.append("auth_key", apiKey);
        params.append("text", word);
        params.append("target_lang", deeplTarget);
        if (deeplSource !== "AUTO") {
          params.append("source_lang", deeplSource);
        }

        const response = await axios.post<DeepLResponse>(
          "https://api-free.deepl.com/v2/translate",
          params,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 10000,
            validateStatus: () => true,
          }
        );

        if (response.status < 400) {
          translatedText = response.data.translations?.[0]?.text || "";
        } else {
          throw new Error(
            (response.data as any)?.message || `DeepL responded with status ${response.status}`
          );
        }
      } catch (err) {
        console.warn("⚠️ DeepL primary translation failed, attempting fallback", err);
        translatedText = await translateWithFallback(word, normalizedSource, normalizedTarget);
      }
    } else {
      translatedText = await translateWithFallback(word, normalizedSource, normalizedTarget);
    }

    res.json({ translatedText });
  } catch (err: any) {
    console.error("🛑 Translation error:", {
      word,
      source,
      target,
      error: err.response?.data || err.message,
    });
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
