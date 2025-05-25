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