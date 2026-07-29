export interface Keyword {
  term: string;
  aliases: string[];
  shortDefinition: string;
  paperContext: string;
  whyItMatters: string;
  color: string;
}

export interface ReadingGuideItem {
  label: string;
  detail: string;
}

export interface PaperAnalysis {
  title: string;
  oneSentence: string;
  summary: string;
  readingGuide: ReadingGuideItem[];
  keywords: Keyword[];
}

export interface CachedPaper {
  cacheKey: string;
  url: string;
  markdown: string;
  analysis: PaperAnalysis;
  analyzedWith: string;
  createdAt: number;
  schemaVersion: number;
}

export interface ExtensionSettings {
  apiKey: string;
  defaultModel: string;
  analysisModel: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: "",
  defaultModel: "groq/compound",
  analysisModel: "groq/compound-mini",
};

export type BackgroundRequest =
  | { type: "GET_CACHE"; cacheKey: string }
  | {
      type: "ANALYZE_PAGE";
      cacheKey: string;
      url: string;
      title: string;
      markdown: string;
    }
  | { type: "DELETE_CACHE"; cacheKey: string }
  | { type: "OPEN_POPUP" };

export type BackgroundResponse =
  | { ok: true; cached?: CachedPaper; analysis?: PaperAnalysis }
  | {
      ok: false;
      code: string;
      error: string;
      retryAfterSeconds?: number;
    };
