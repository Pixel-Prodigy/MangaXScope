import { NextRequest, NextResponse } from "next/server";

const MANGADEX_API = "https://api.mangadex.org";

/**
 * DEBUG ENDPOINT: /api/debug/chapters/[mangaId]
 *
 * This endpoint is for verifying parity between our implementation
 * and the MangaDex website. It fetches ALL chapters and provides
 * detailed breakdown for comparison.
 *
 * TEMPORARY - Remove after verification is complete.
 *
 * Usage:
 *   GET /api/debug/chapters/{mangaId}
 *   GET /api/debug/chapters/{mangaId}?compare=true (includes raw MangaDex response)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mangaId: string }> }
) {
  const { mangaId } = await params;
  const compare = request.nextUrl.searchParams.get("compare") === "true";

  try {
    // Build the same request as MangaDex website
    const apiParams = new URLSearchParams();
    apiParams.set("limit", "500");
    apiParams.set("offset", "0");

    // All content ratings (matches website incognito)
    apiParams.append("contentRating[]", "safe");
    apiParams.append("contentRating[]", "suggestive");
    apiParams.append("contentRating[]", "erotica");
    apiParams.append("contentRating[]", "pornographic");

    // Sorting to match website
    apiParams.set("order[volume]", "asc");
    apiParams.set("order[chapter]", "asc");

    // Include scanlation group for context
    apiParams.append("includes[]", "scanlation_group");

    const requestUrl = `${MANGADEX_API}/manga/${mangaId}/feed?${apiParams.toString()}`;

    console.log("[Debug] Fetching from:", requestUrl);

    // Fetch ALL chapters with pagination
    interface MangaDexChapter {
      id: string;
      attributes: {
        volume: string | null;
        chapter: string | null;
        title: string | null;
        translatedLanguage: string;
        externalUrl: string | null;
        publishAt: string;
        pages: number;
      };
    }

    const allChapters: MangaDexChapter[] = [];
    let offset = 0;
    let totalFromApi = 0;

    while (true) {
      apiParams.set("offset", offset.toString());

      const response = await fetch(
        `${MANGADEX_API}/manga/${mangaId}/feed?${apiParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "MangaXscope/1.0 Debug",
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          {
            error: "MangaDex API error",
            status: response.status,
            details: await response.text(),
          },
          { status: response.status }
        );
      }

      const data = await response.json();

      if (offset === 0) {
        totalFromApi = data.total;
      }

      allChapters.push(...data.data);

      if (data.data.length < 500 || allChapters.length >= totalFromApi) {
        break;
      }

      offset += 500;

      // Safety limit
      if (offset > 10000) {
        break;
      }
    }

    // Analyze the results
    const languageBreakdown: Record<string, number> = {};
    const externalChapters: MangaDexChapter[] = [];
    const readableChapters: MangaDexChapter[] = [];
    const chaptersWithNullChapter: MangaDexChapter[] = [];
    const volumeOnlyChapters: MangaDexChapter[] = [];

    allChapters.forEach((ch) => {
      const lang = ch.attributes.translatedLanguage;
      languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;

      if (ch.attributes.externalUrl) {
        externalChapters.push(ch);
      } else {
        readableChapters.push(ch);
      }

      if (ch.attributes.chapter === null) {
        chaptersWithNullChapter.push(ch);
        if (ch.attributes.volume !== null) {
          volumeOnlyChapters.push(ch);
        }
      }
    });

    // Sort languages by count
    const sortedLanguages = Object.entries(languageBreakdown)
      .sort(([, a], [, b]) => b - a)
      .reduce((acc, [lang, count]) => {
        acc[lang] = count;
        return acc;
      }, {} as Record<string, number>);

    const result = {
      mangaId,
      timestamp: new Date().toISOString(),
      requestUrl: `${MANGADEX_API}/manga/${mangaId}/feed?limit=500&offset=0&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic&order[volume]=asc&order[chapter]=asc`,

      summary: {
        totalFromApi,
        totalFetched: allChapters.length,
        totalReadable: readableChapters.length,
        totalExternal: externalChapters.length,
        chaptersWithNullChapterNumber: chaptersWithNullChapter.length,
        volumeOnlyChapters: volumeOnlyChapters.length,
        languageCount: Object.keys(languageBreakdown).length,
      },

      languageBreakdown: sortedLanguages,

      // First few chapters of each type for verification
      samples: {
        firstReadable: readableChapters.slice(0, 3).map((ch) => ({
          id: ch.id,
          chapter: ch.attributes.chapter,
          volume: ch.attributes.volume,
          title: ch.attributes.title,
          language: ch.attributes.translatedLanguage,
        })),

        firstExternal: externalChapters.slice(0, 3).map((ch) => ({
          id: ch.id,
          chapter: ch.attributes.chapter,
          volume: ch.attributes.volume,
          title: ch.attributes.title,
          language: ch.attributes.translatedLanguage,
          externalUrl: ch.attributes.externalUrl,
        })),

        nullChapterSamples: chaptersWithNullChapter.slice(0, 5).map((ch) => ({
          id: ch.id,
          chapter: ch.attributes.chapter,
          volume: ch.attributes.volume,
          title: ch.attributes.title,
          language: ch.attributes.translatedLanguage,
        })),
      },

      verification: {
        message: "Compare these numbers with MangaDex website DevTools",
        steps: [
          "1. Open MangaDex in incognito mode",
          `2. Go to: https://mangadex.org/title/${mangaId}`,
          "3. Open DevTools (F12) → Network tab",
          "4. Filter by 'feed'",
          "5. Compare 'total' in response with our totalFromApi",
          "6. Check language counts match",
        ],
        expectedMatch: {
          totalFromApi_should_match: "response.total in MangaDex DevTools",
          languageBreakdown_should_match:
            "counts when filtering by language on website",
        },
      },
    };

    // Include raw data if requested
    if (compare) {
      return NextResponse.json({
        ...result,
        rawChapters: allChapters.map((ch) => ({
          id: ch.id,
          chapter: ch.attributes.chapter,
          volume: ch.attributes.volume,
          title: ch.attributes.title,
          language: ch.attributes.translatedLanguage,
          pages: ch.attributes.pages,
          external: !!ch.attributes.externalUrl,
        })),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Debug] Error:", error);
    return NextResponse.json(
      { error: "Internal error", details: String(error) },
      { status: 500 }
    );
  }
}
