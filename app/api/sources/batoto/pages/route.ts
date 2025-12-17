import { NextRequest, NextResponse } from "next/server";
import { scrapeBatotoChapterPages } from "@/lib/sources/batoto";

/**
 * GET /api/sources/batoto/pages
 * 
 * Fetches page images from Batoto for a given chapter.
 * This is server-only - scraping happens here, not on client.
 * 
 * Query params:
 * - chapterId: Batoto chapter ID
 * 
 * Response: { pages: SourcePage[], chapterId: string, referer?: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const chapterId = searchParams.get("chapterId");
    
    if (!chapterId) {
      return NextResponse.json(
        { error: "chapterId is required" },
        { status: 400 }
      );
    }
    
    // Validate chapter ID format (alphanumeric with possible dashes)
    if (!/^[\w-]+$/.test(chapterId)) {
      return NextResponse.json(
        { error: "Invalid chapter ID format" },
        { status: 400 }
      );
    }
    
    // Fetch chapter pages from Batoto
    const result = await scrapeBatotoChapterPages(chapterId);
    
    if (result.pages.length === 0) {
      return NextResponse.json(
        { 
          error: "No pages found for this chapter",
          details: "The chapter may be unavailable or the page structure has changed"
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      ...result,
      source: "batoto",
    });
  } catch (error) {
    console.error("[Batoto API] Error fetching pages:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    if (message.includes("404")) {
      return NextResponse.json(
        { error: "Chapter not found on Batoto", details: message },
        { status: 404 }
      );
    }
    
    if (message.includes("timeout") || message.includes("abort")) {
      return NextResponse.json(
        { error: "Request to Batoto timed out", details: message },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch pages from Batoto", details: message },
      { status: 500 }
    );
  }
}

