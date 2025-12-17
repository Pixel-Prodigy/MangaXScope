import { NextRequest, NextResponse } from "next/server";
import { scrapeBatotoChapters, validateBatotoSeriesInput } from "@/lib/sources/batoto";

/**
 * GET /api/sources/batoto/chapters
 * 
 * Fetches chapter list from Batoto for a given series.
 * This is server-only - scraping happens here, not on client.
 * 
 * Query params:
 * - seriesId: Batoto series ID or full URL
 * 
 * Response: { chapters: SourceChapter[], total: number }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const seriesIdInput = searchParams.get("seriesId");
    
    if (!seriesIdInput) {
      return NextResponse.json(
        { error: "seriesId is required" },
        { status: 400 }
      );
    }
    
    // Validate and normalize the series ID
    const seriesId = validateBatotoSeriesInput(seriesIdInput);
    
    if (!seriesId) {
      return NextResponse.json(
        { error: "Invalid Batoto series ID or URL" },
        { status: 400 }
      );
    }
    
    // Fetch chapters from Batoto
    const chapters = await scrapeBatotoChapters(seriesId);
    
    return NextResponse.json({
      chapters,
      total: chapters.length,
      source: "batoto",
      seriesId,
    });
  } catch (error) {
    console.error("[Batoto API] Error fetching chapters:", error);
    
    // Provide helpful error messages
    const message = error instanceof Error ? error.message : "Unknown error";
    
    if (message.includes("404")) {
      return NextResponse.json(
        { error: "Series not found on Batoto", details: message },
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
      { error: "Failed to fetch chapters from Batoto", details: message },
      { status: 500 }
    );
  }
}

