declare module "youtube-transcript" {
  export interface TranscriptSegment {
    text: string;
    duration?: number;
    offset?: number;
  }

  export const YoutubeTranscript: {
    fetchTranscript: (
      videoId: string,
      opts?: Record<string, unknown>
    ) => Promise<TranscriptSegment[]>;
  };
}
