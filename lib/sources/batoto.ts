/**
 * Batoto (mto.to) source implementation.
 * 
 * This module provides scraping logic for Batoto as a fallback source
 * when MangaDex has no chapters available.
 * 
 * IMPORTANT: This module is SERVER-ONLY. It should only be imported
 * in API routes, never in client components.
 * 
 * SELECTOR DOCUMENTATION:
 * The selectors below are based on Batoto's current HTML structure.
 * If scraping breaks, these are the areas to check and update.
 */

import * as cheerio from "cheerio";
import type { 
  MangaSource, 
  SourceChapter, 
  SourceChapterPages,
  SourcePage 
} from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const BATOTO_BASE_URL = "https://mto.to";
const REQUEST_TIMEOUT = 10000; // 10 seconds
const REQUEST_DELAY = 500; // 500ms between requests
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// =============================================================================
// SELECTORS - UPDATE THESE IF BATOTO CHANGES STRUCTURE
// =============================================================================

/**
 * CSS selectors for Batoto HTML parsing.
 * These are documented here for easy maintenance.
 * 
 * CHAPTER LIST PAGE (series page):
 * URL format: https://mto.to/series/{seriesId}
 * 
 * CHAPTER PAGE (reader):
 * URL format: https://mto.to/chapter/{chapterId}
 */
const SELECTORS = {
  // Chapter list selectors (on series page)
  chapterList: {
    // Container holding all chapters
    container: ".episode-list, .chapter-list, [class*='chapter']",
    // Individual chapter item
    item: ".episode-item, .chapter-item, a[href*='/chapter/']",
    // Chapter link (may be the item itself or a child)
    link: "a[href*='/chapter/']",
    // Chapter number text
    number: ".episode-title, .chapter-number, .name",
    // Chapter title (if separate from number)
    title: ".episode-subtitle, .chapter-title",
    // Upload/publish date
    date: ".episode-date, .chapter-date, time, .date",
  },
  
  // Chapter page selectors (reader page)
  chapterPage: {
    // Container for all page images
    imageContainer: ".page-container, .reader-container, #viewer",
    // Individual page images
    images: "img.page-image, img[class*='page'], .reader-container img",
    // Alternative: images in data attributes
    imageData: "[data-src], [data-lazy-src]",
  },
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Delay execution for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout and custom headers
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": BATOTO_BASE_URL,
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract chapter ID from Batoto URL
 * URLs like: https://mto.to/chapter/12345 -> "12345"
 */
export function extractBatotoChapterId(url: string): string | null {
  const match = url.match(/\/chapter\/([^/?#]+)/);
  return match ? match[1] : null;
}

/**
 * Extract series ID from Batoto URL
 * URLs like: https://mto.to/series/12345 -> "12345"
 */
export function extractBatotoSeriesId(url: string): string | null {
  const match = url.match(/\/series\/([^/?#]+)/);
  return match ? match[1] : null;
}

/**
 * Parse chapter number from text
 * Handles formats like "Chapter 1", "Ch. 10.5", "Episode 5", etc.
 */
function parseChapterNumber(text: string): string | null {
  const cleaned = text.trim();
  // Try to extract number from common patterns
  const patterns = [
    /(?:chapter|ch\.?|episode|ep\.?)\s*(\d+(?:\.\d+)?)/i,
    /^(\d+(?:\.\d+)?)/,
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Parse date from various formats
 */
function parseDate(text: string): string {
  const cleaned = text.trim();
  
  // Try to parse as date
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  
  // Handle relative dates like "2 days ago"
  const relativeMatch = cleaned.match(/(\d+)\s*(day|hour|minute|week|month)s?\s*ago/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const now = new Date();
    
    switch (unit) {
      case "minute":
        now.setMinutes(now.getMinutes() - amount);
        break;
      case "hour":
        now.setHours(now.getHours() - amount);
        break;
      case "day":
        now.setDate(now.getDate() - amount);
        break;
      case "week":
        now.setDate(now.getDate() - amount * 7);
        break;
      case "month":
        now.setMonth(now.getMonth() - amount);
        break;
    }
    
    return now.toISOString();
  }
  
  // Fallback to current date
  return new Date().toISOString();
}

// =============================================================================
// SCRAPING FUNCTIONS
// =============================================================================

/**
 * Fetch and parse chapters from a Batoto series page.
 * 
 * @param seriesId - The Batoto series ID (from URL: /series/{seriesId})
 * @returns Array of chapters in unified format
 */
export async function scrapeBatotoChapters(
  seriesId: string
): Promise<SourceChapter[]> {
  const url = `${BATOTO_BASE_URL}/series/${seriesId}`;
  
  const response = await fetchWithTimeout(url);
  
  if (!response.ok) {
    throw new Error(`Batoto returned ${response.status} for series ${seriesId}`);
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const chapters: SourceChapter[] = [];
  const { chapterList } = SELECTORS;
  
  // Try to find chapter items
  // First, look for direct links to chapters
  const chapterLinks = $(chapterList.link);
  
  if (chapterLinks.length === 0) {
    // If no chapters found, the selectors may need updating
    console.warn(`[Batoto] No chapters found for series ${seriesId}. Selectors may need updating.`);
    return [];
  }
  
  chapterLinks.each((index, element) => {
    const $el = $(element);
    const href = $el.attr("href") || "";
    const chapterId = extractBatotoChapterId(href);
    
    if (!chapterId) return;
    
    // Try to get chapter info from the element or its parent
    const $item = $el.closest(chapterList.item).length 
      ? $el.closest(chapterList.item) 
      : $el;
    
    // Extract chapter number
    const numberText = $item.find(chapterList.number).text() || $el.text();
    const chapterNumber = parseChapterNumber(numberText);
    
    // Extract title (may be same as number text)
    const titleText = $item.find(chapterList.title).text().trim() || null;
    
    // Extract date
    const dateText = $item.find(chapterList.date).text() || 
                     $item.find("time").attr("datetime") || "";
    const publishedAt = parseDate(dateText);
    
    chapters.push({
      id: chapterId,
      chapter: chapterNumber,
      volume: null, // Batoto doesn't typically show volume
      title: titleText !== chapterNumber ? titleText : null,
      language: "en", // Batoto primarily serves English
      pages: 0, // Unknown until chapter is loaded
      publishedAt,
      externalUrl: `${BATOTO_BASE_URL}/chapter/${chapterId}`,
    });
  });
  
  // Sort by chapter number (ascending)
  chapters.sort((a, b) => {
    const numA = a.chapter ? parseFloat(a.chapter) : 0;
    const numB = b.chapter ? parseFloat(b.chapter) : 0;
    return numA - numB;
  });
  
  return chapters;
}

/**
 * Fetch and parse page images from a Batoto chapter.
 * 
 * @param chapterId - The Batoto chapter ID
 * @returns Chapter pages with image URLs
 */
export async function scrapeBatotoChapterPages(
  chapterId: string
): Promise<SourceChapterPages> {
  const url = `${BATOTO_BASE_URL}/chapter/${chapterId}`;
  
  const response = await fetchWithTimeout(url);
  
  if (!response.ok) {
    throw new Error(`Batoto returned ${response.status} for chapter ${chapterId}`);
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const pages: SourcePage[] = [];
  const { chapterPage } = SELECTORS;
  
  // Try multiple strategies to find images
  
  // Strategy 1: Direct img tags with src
  $(chapterPage.images).each((index, element) => {
    const $img = $(element);
    const src = $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy-src");
    
    if (src && !src.includes("placeholder") && !src.includes("loading")) {
      pages.push({
        index: pages.length,
        imageUrl: src.startsWith("http") ? src : `${BATOTO_BASE_URL}${src}`,
        width: parseInt($img.attr("width") || "0", 10) || undefined,
        height: parseInt($img.attr("height") || "0", 10) || undefined,
      });
    }
  });
  
  // Strategy 2: Look for data attributes if no images found
  if (pages.length === 0) {
    $(chapterPage.imageData).each((index, element) => {
      const $el = $(element);
      const src = $el.attr("data-src") || $el.attr("data-lazy-src");
      
      if (src) {
        pages.push({
          index: pages.length,
          imageUrl: src.startsWith("http") ? src : `${BATOTO_BASE_URL}${src}`,
        });
      }
    });
  }
  
  // Strategy 3: Look for images in scripts (some sites embed URLs in JS)
  if (pages.length === 0) {
    const scriptContent = $("script").text();
    // Look for common patterns like ["url1", "url2"] or {src: "url"}
    const urlMatches = scriptContent.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)/gi);
    
    if (urlMatches) {
      // Deduplicate and filter
      const uniqueUrls = [...new Set(urlMatches)].filter(
        (url) => !url.includes("avatar") && !url.includes("logo") && !url.includes("icon")
      );
      
      uniqueUrls.forEach((url) => {
        pages.push({
          index: pages.length,
          imageUrl: url,
        });
      });
    }
  }
  
  if (pages.length === 0) {
    console.warn(`[Batoto] No pages found for chapter ${chapterId}. Selectors may need updating.`);
  }
  
  return {
    chapterId,
    pages,
    referer: BATOTO_BASE_URL, // Batoto may require referer header for images
  };
}

// =============================================================================
// SOURCE IMPLEMENTATION
// =============================================================================

/**
 * Batoto source implementation.
 * 
 * Use this for the unified source interface.
 * For direct API calls, use the scrape functions above.
 */
export const batotoSource: MangaSource = {
  name: "Batoto",
  
  async getChapters(seriesId: string): Promise<SourceChapter[]> {
    return scrapeBatotoChapters(seriesId);
  },
  
  async getChapterPages(chapterId: string): Promise<SourceChapterPages> {
    // Add delay before request to be respectful
    await delay(REQUEST_DELAY);
    return scrapeBatotoChapterPages(chapterId);
  },
};

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate a Batoto series URL and extract the ID.
 * 
 * @param input - URL or series ID
 * @returns Normalized series ID or null if invalid
 */
export function validateBatotoSeriesInput(input: string): string | null {
  const trimmed = input.trim();
  
  // If it looks like a URL, extract the ID
  if (trimmed.includes("mto.to") || trimmed.includes("batoto")) {
    return extractBatotoSeriesId(trimmed);
  }
  
  // If it's just an ID (alphanumeric with possible dashes)
  if (/^[\w-]+$/.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * Test if we can reach Batoto and scrape a series.
 * Useful for validation before saving external source.
 * 
 * @param seriesId - The series ID to test
 * @returns Object with success status and chapter count
 */
export async function testBatotoConnection(
  seriesId: string
): Promise<{ success: boolean; chapterCount: number; error?: string }> {
  try {
    const chapters = await scrapeBatotoChapters(seriesId);
    return {
      success: true,
      chapterCount: chapters.length,
    };
  } catch (error) {
    return {
      success: false,
      chapterCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

