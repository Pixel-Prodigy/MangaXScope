import { NextRequest, NextResponse } from "next/server";

const MANGA_DEX_API = "https://api.mangadex.org";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(`${MANGA_DEX_API}/cover/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "force-cache",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Cover art not found" },
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Error fetching cover art:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

