import * as cheerio from "cheerio";

export interface TranscriptLine {
  start: number;
  duration: number;
  text: string;
}

export function parseCaptionXml(xml: string): TranscriptLine[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const lines: TranscriptLine[] = [];

  $("text").each((_, el) => {
    const start = parseFloat($(el).attr("start") || "0");
    const duration = parseFloat($(el).attr("dur") || "1.5");
    const text = $(el).text().replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    if (text) {
      lines.push({ start, duration, text });
    }
  });

  return lines;
}

// New: robust parser for YouTube fmt=json3 events
export function parseCaptionJson3(json: any): TranscriptLine[] {
  const out: TranscriptLine[] = [];
  if (!json || !Array.isArray(json.events)) return out;

  for (const ev of json.events) {
    if (!ev || !Array.isArray(ev.segs)) continue;
    const text = ev.segs.map((s: any) => s?.utf8 ?? "").join("").trim();
    if (!text) continue;

    const start = (ev.tStartMs ?? 0) / 1000;
    const duration = (ev.dDurationMs ?? 0) / 1000 || 1.5;
    out.push({ start, duration, text });
  }

  return out;
}
