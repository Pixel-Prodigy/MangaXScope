import { NextRequest, NextResponse } from "next/server";

const MANGA_DEX_API = "https://api.mangadex.org";
const MANGA_DEX_COVERS_BASE = "https://uploads.mangadex.org/covers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mangaId: string; coverId: string }> }
) {
  try {
    const { mangaId, coverId } = await params;

    // First, get the cover metadata to get the filename
    const coverResponse = await fetch(`${MANGA_DEX_API}/cover/${coverId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "force-cache",
    });

    if (!coverResponse.ok) {
      return NextResponse.json(
        { error: "Cover art not found" },
        { status: coverResponse.status }
      );
    }

    const coverData = await coverResponse.json();
    const fileName = coverData.data?.attributes?.fileName;

    if (!fileName) {
      return NextResponse.json(
        { error: "Cover filename not found" },
        { status: 404 }
      );
    }

    // Construct the image URL
    const imageUrl = `${MANGA_DEX_COVERS_BASE}/${mangaId}/${fileName}.512.jpg`;

    // Fetch the actual image from MangaDex
    const imageResponse = await fetch(imageUrl, {
      cache: "force-cache",
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: imageResponse.status }
      );
    }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error proxying cover image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
