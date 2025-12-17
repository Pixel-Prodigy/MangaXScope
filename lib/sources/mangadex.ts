/**
 * MangaDex source implementation.
 *
 * This wraps the existing MangaDex API calls into the unified source interface.
 * The actual API calls still go through /api/reader routes which handle
 * the MangaDex API communication.
 *
 * NOTE: This is a client-side wrapper that calls our API routes.
 * The actual MangaDex API communication happens in the API routes.
 *
 * IMPORTANT: The API now fetches ALL languages by default and does NOT
 * filter by translatedLanguage at the API level. This matches MangaDex
 * website behavior. Language filtering should happen client-side.
 */

import type { MangaSource, SourceChapter, SourceChapterPages } from "./types";

// Response type from our chapters API (updated to match new format)
interface MangaDexChapterResponse {
  chapters: Array<{
    id: string;
    chapter: string | null;
    volume: string | null;
    title: string | null;
    language: string;
    pages: number;
    publishedAt: string;
    externalUrl: string | null;
    scanlationGroup?: string;
  }>;
  total: number;
  totalExternal: number;
  totalByLanguage: Record<string, number>;
  limit: number;
  offset: number;
  debug?: {
    requestUrl: string;
    queryParams: Record<string, string | string[]>;
    rawTotal: number;
    fetchedCount: number;
    filteredOutCount: number;
    languageBreakdown: Record<string, number>;
  };
}

// Response type from our chapter images API
interface MangaDexImagesResponse {
  baseUrl: string;
  hash: string;
  images: string[];
  dataSaverImages: string[];
  chapterId: string;
  mangaId: string;
  metadata: {
    chapter: string | null;
    volume: string | null;
    title: string | null;
    translatedLanguage: string;
    pages: number;
  };
}

/**
 * Fetch all chapters from MangaDex for a manga.
 * Handles pagination automatically to fetch ALL chapters.
 *
 * IMPORTANT: This now fetches ALL languages by default (matching website behavior).
 * Use the `language` option to filter client-side after fetching.
 *
 * @param mangaId - The MangaDex manga ID
 * @param options.limit - Maximum chapters to return (default: no limit)
 * @param options.language - Filter to specific language CLIENT-SIDE (optional)
 */
export async function getMangaDexChapters(
  mangaId: string,
  options: { limit?: number; language?: string } = {}
): Promise<SourceChapter[]> {
  const { limit, language } = options;
  const allChapters: SourceChapter[] = [];
  let offset = 0;
  const batchSize = 500; // MangaDex /feed endpoint max

  // Pagination loop - fetch ALL chapters (no arbitrary limit)
  while (true) {
    const response = await fetch(
      `/api/reader/${mangaId}/chapters?limit=${batchSize}&offset=${offset}`
    );

    if (!response.ok) {
      if (offset === 0) {
        throw new Error(
          `Failed to fetch MangaDex chapters: ${response.status}`
        );
      }
      // If subsequent request fails, return what we have
      break;
    }

    const data: MangaDexChapterResponse = await response.json();

    // Transform to unified format
    const chapters: SourceChapter[] = data.chapters.map((ch) => ({
      id: ch.id,
      chapter: ch.chapter,
      volume: ch.volume,
      title: ch.title,
      language: ch.language,
      pages: ch.pages,
      publishedAt: ch.publishedAt,
      externalUrl: ch.externalUrl,
    }));

    allChapters.push(...chapters);

    // Check if we've fetched all available chapters
    if (data.chapters.length < batchSize) {
      break;
    }

    offset += batchSize;

    // Safety limit
    if (offset > 10000) {
      console.warn(`[MangaDex] Safety limit reached at offset ${offset}`);
      break;
    }
  }

  // Apply client-side filters
  let result = allChapters;

  // Filter by language if specified
  if (language) {
    result = result.filter((ch) => ch.language === language);
  }

  // Apply limit if specified
  if (limit && result.length > limit) {
    result = result.slice(0, limit);
  }

  return result;
}

/**
 * Fetch chapter pages/images from MangaDex.
 */
export async function getMangaDexChapterPages(
  mangaId: string,
  chapterId: string,
  options: { dataSaver?: boolean } = {}
): Promise<SourceChapterPages> {
  const { dataSaver = true } = options;

  const response = await fetch(
    `/api/reader/${mangaId}/${chapterId}?dataSaver=${dataSaver}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch MangaDex chapter pages: ${response.status}`
    );
  }

  const data: MangaDexImagesResponse = await response.json();

  return {
    chapterId: data.chapterId,
    pages: data.images.map((url, index) => ({
      index,
      imageUrl: url,
    })),
    // MangaDex images through our proxy don't need special referer
  };
}

/**
 * MangaDex source implementation.
 *
 * Note: This requires mangaId context for chapter pages since MangaDex
 * at-home API needs both manga and chapter IDs. The getChapterPages
 * method here assumes the chapterId includes the mangaId context.
 */
export const mangadexSource: MangaSource = {
  name: "MangaDex",

  async getChapters(mangaId: string): Promise<SourceChapter[]> {
    // Fetch ALL chapters (all languages) - matches website behavior
    return getMangaDexChapters(mangaId);
  },

  async getChapterPages(chapterId: string): Promise<SourceChapterPages> {
    // For MangaDex, we need the mangaId which should be passed in the chapterId
    // Format: "mangaId:chapterId"
    const [mangaId, actualChapterId] = chapterId.includes(":")
      ? chapterId.split(":")
      : ["", chapterId];

    if (!mangaId) {
      throw new Error(
        "MangaDex chapter pages require mangaId:chapterId format"
      );
    }

    return getMangaDexChapterPages(mangaId, actualChapterId);
  },
};

/**
 * Check if a manga has readable chapters on MangaDex.
 * Returns the count of readable (non-external) chapters.
 */
export async function getMangaDexChapterCount(
  mangaId: string
): Promise<number> {
  try {
    const response = await fetch(
      `/api/reader/${mangaId}/chapters?limit=1&offset=0`
    );

    if (!response.ok) {
      return 0;
    }

    const data: MangaDexChapterResponse = await response.json();
    // total already excludes external chapters in our API response
    return data.total - data.totalExternal;
  } catch {
    return 0;
  }
}

/**
 * Get chapter count breakdown by language.
 * Useful for showing available languages for a manga.
 */
export async function getMangaDexLanguageBreakdown(
  mangaId: string
): Promise<Record<string, number>> {
  try {
    const response = await fetch(
      `/api/reader/${mangaId}/chapters?limit=1&offset=0`
    );

    if (!response.ok) {
      return {};
    }

    const data: MangaDexChapterResponse = await response.json();
    return data.totalByLanguage || {};
  } catch {
    return {};
  }
}
