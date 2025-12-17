/**
 * Source abstraction types for manga chapter providers.
 * This allows multiple sources (MangaDex, Batoto, etc.) to be used interchangeably.
 */

// Supported external source providers
export type ExternalSourceProvider = "batoto";

// Structure stored in database for external sources
export interface ExternalSourceData {
  provider: ExternalSourceProvider;
  externalId: string; // The ID/slug used by the external source
}

// Unified chapter format used across all sources
export interface SourceChapter {
  id: string; // Unique identifier (source-specific)
  chapter: string | null; // Chapter number (e.g., "1", "10.5")
  volume: string | null; // Volume number if available
  title: string | null; // Chapter title if available
  language: string; // Language code (e.g., "en")
  pages: number; // Number of pages (may be 0 if unknown before fetching)
  publishedAt: string; // ISO date string
  externalUrl: string | null; // Direct URL to chapter on source (for attribution)
}

// Page data for reading
export interface SourcePage {
  index: number; // 0-based page index
  imageUrl: string; // Direct URL to image
  width?: number; // Image width if known
  height?: number; // Image height if known
}

// Chapter pages response
export interface SourceChapterPages {
  chapterId: string;
  pages: SourcePage[];
  // Some sources need referer headers for images
  referer?: string;
}

// Result of fetching chapters from any source
export interface ChapterListResult {
  source: "mangadex" | ExternalSourceProvider;
  chapters: SourceChapter[];
  total: number;
  // For external sources, this may indicate if scraping succeeded
  error?: string;
}

// Result of fetching chapter pages
export interface ChapterPagesResult {
  source: "mangadex" | ExternalSourceProvider;
  chapterId: string;
  pages: SourcePage[];
  referer?: string;
  error?: string;
}

// Source interface - each source implements this
export interface MangaSource {
  name: string;
  
  /**
   * Get list of chapters for a manga/series
   * @param id - MangaDex ID or external source ID depending on context
   */
  getChapters(id: string): Promise<SourceChapter[]>;
  
  /**
   * Get pages/images for a specific chapter
   * @param chapterId - Chapter ID from the source
   */
  getChapterPages(chapterId: string): Promise<SourceChapterPages>;
}

// Type guard to check if external source data is valid
export function isValidExternalSource(data: unknown): data is ExternalSourceData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.provider === "string" &&
    obj.provider === "batoto" &&
    typeof obj.externalId === "string" &&
    obj.externalId.length > 0
  );
}

// Helper to create external source data
export function createExternalSource(
  provider: ExternalSourceProvider,
  externalId: string
): ExternalSourceData {
  return { provider, externalId };
}

