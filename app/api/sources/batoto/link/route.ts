import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { 
  validateBatotoSeriesInput, 
  testBatotoConnection 
} from "@/lib/sources/batoto";
import { createExternalSource, isValidExternalSource } from "@/lib/sources/types";

/**
 * POST /api/sources/batoto/link
 * 
 * Links a manga to a Batoto series as an external source.
 * This stores the external source data in the database.
 * 
 * Body:
 * - mangaId: MangaDex manga ID
 * - batotoSeriesId: Batoto series ID or URL
 * 
 * Response: { success: boolean, externalSource: ExternalSourceData }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mangaId, batotoSeriesId } = body;
    
    // Validate required fields
    if (!mangaId || typeof mangaId !== "string") {
      return NextResponse.json(
        { error: "mangaId is required" },
        { status: 400 }
      );
    }
    
    if (!batotoSeriesId || typeof batotoSeriesId !== "string") {
      return NextResponse.json(
        { error: "batotoSeriesId is required" },
        { status: 400 }
      );
    }
    
    // Validate and normalize the Batoto series ID
    const normalizedSeriesId = validateBatotoSeriesInput(batotoSeriesId);
    
    if (!normalizedSeriesId) {
      return NextResponse.json(
        { error: "Invalid Batoto series ID or URL" },
        { status: 400 }
      );
    }
    
    // Verify the manga exists in our database
    const manga = await prisma.manga.findUnique({
      where: { id: mangaId },
      select: { id: true, title: true, externalSource: true },
    });
    
    if (!manga) {
      return NextResponse.json(
        { error: "Manga not found in database" },
        { status: 404 }
      );
    }
    
    // Test connection to Batoto to verify the series exists and has chapters
    const testResult = await testBatotoConnection(normalizedSeriesId);
    
    if (!testResult.success) {
      return NextResponse.json(
        { 
          error: "Could not verify Batoto series",
          details: testResult.error,
        },
        { status: 400 }
      );
    }
    
    if (testResult.chapterCount === 0) {
      return NextResponse.json(
        { 
          error: "No chapters found on Batoto for this series",
          details: "The series exists but has no chapters available",
        },
        { status: 400 }
      );
    }
    
    // Create external source data
    const externalSource = createExternalSource("batoto", normalizedSeriesId);
    
    // Update the manga with the external source
    // Cast to Prisma.InputJsonValue to satisfy type requirements
    await prisma.manga.update({
      where: { id: mangaId },
      data: { 
        externalSource: {
          provider: externalSource.provider,
          externalId: externalSource.externalId,
        } as Prisma.InputJsonValue
      },
    });
    
    return NextResponse.json({
      success: true,
      mangaId,
      externalSource,
      chapterCount: testResult.chapterCount,
      message: `Successfully linked ${manga.title} to Batoto series with ${testResult.chapterCount} chapters`,
    });
  } catch (error) {
    console.error("[Batoto API] Error linking manga:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { error: "Failed to link manga to Batoto", details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sources/batoto/link
 * 
 * Removes the external source link from a manga.
 * 
 * Query params:
 * - mangaId: MangaDex manga ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const mangaId = searchParams.get("mangaId");
    
    if (!mangaId) {
      return NextResponse.json(
        { error: "mangaId is required" },
        { status: 400 }
      );
    }
    
    // Verify the manga exists
    const manga = await prisma.manga.findUnique({
      where: { id: mangaId },
      select: { id: true, externalSource: true },
    });
    
    if (!manga) {
      return NextResponse.json(
        { error: "Manga not found" },
        { status: 404 }
      );
    }
    
    // Remove the external source
    // Use Prisma.JsonNull for null JSON values
    await prisma.manga.update({
      where: { id: mangaId },
      data: { externalSource: Prisma.JsonNull },
    });
    
    return NextResponse.json({
      success: true,
      mangaId,
      message: "External source link removed",
    });
  } catch (error) {
    console.error("[Batoto API] Error unlinking manga:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { error: "Failed to unlink manga", details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sources/batoto/link
 * 
 * Gets the external source data for a manga.
 * 
 * Query params:
 * - mangaId: MangaDex manga ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const mangaId = searchParams.get("mangaId");
    
    if (!mangaId) {
      return NextResponse.json(
        { error: "mangaId is required" },
        { status: 400 }
      );
    }
    
    const manga = await prisma.manga.findUnique({
      where: { id: mangaId },
      select: { id: true, externalSource: true },
    });
    
    if (!manga) {
      return NextResponse.json(
        { error: "Manga not found" },
        { status: 404 }
      );
    }
    
    const hasExternalSource = isValidExternalSource(manga.externalSource);
    
    return NextResponse.json({
      mangaId,
      hasExternalSource,
      externalSource: hasExternalSource ? manga.externalSource : null,
    });
  } catch (error) {
    console.error("[Batoto API] Error getting link:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { error: "Failed to get external source", details: message },
      { status: 500 }
    );
  }
}

