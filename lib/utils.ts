import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if the user is on an Android device
 */
export function isAndroid(): boolean {
  if (typeof window === "undefined") return false
  return /Android/i.test(navigator.userAgent)
}

/**
 * Generate an Android intent URL to open a MangaDex manga in AniYomi or Tachiyomi forks.
 * 
 * This function creates an intent URL that attempts to open the manga in AniYomi/Tachiyomi
 * if installed, otherwise falls back to opening the MangaDex website.
 * 
 * @param mangaId - The MangaDex manga ID (e.g., "abc123-def456")
 * @returns An Android intent URL string
 * 
 * @example
 * ```typescript
 * const intentUrl = generateAniyomiIntent("abc123-def456");
 * window.location.href = intentUrl;
 * ```
 * 
 * @remarks
 * - Intent URLs require user interaction (button click) to work due to browser security
 * - The intent URL uses HTTPS scheme which Tachiyomi/AniYomi forks typically handle
 * - If the app isn't installed, the browser will open the MangaDex URL instead
 * - Behavior may vary across browsers (Chrome works best, Firefox may have issues)
 * - PWAs behave similarly to their host browser
 */
export function generateAniyomiIntent(mangaId: string): string {
  const mangadexUrl = `https://mangadex.org/title/${mangaId}`;
  const encodedFallbackUrl = encodeURIComponent(mangadexUrl);
  
  // Primary package: AniYomi (xyz.jmir.tachiyomi.mi)
  // Fallback packages are handled by Android's intent resolution
  // Using HTTPS scheme as Tachiyomi/AniYomi forks typically register for MangaDex HTTPS URLs
  const packageName = "xyz.jmir.tachiyomi.mi";
  
  // Intent URL format:
  // intent://HOST/PATH#Intent;scheme=SCHEME;package=PACKAGE;S.browser_fallback_url=FALLBACK;end
  return `intent://mangadex.org/title/${mangaId}#Intent;scheme=https;package=${packageName};S.browser_fallback_url=${encodedFallbackUrl};end`;
}
