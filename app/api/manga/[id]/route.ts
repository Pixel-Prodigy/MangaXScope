import { NextRequest, NextResponse } from "next/server";

const MANGA_DEX_API = "https://api.mangadex.org";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const mangaDexUrl = new URL(`${MANGA_DEX_API}/manga/${id}`);
    searchParams.forEach((value, key) => {
      mangaDexUrl.searchParams.append(key, value);
    });

    const response = await fetch(mangaDexUrl.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MangaDex API Error:", response.status, response.statusText, errorText);
      return NextResponse.json(
        { error: `Failed to fetch manga: ${response.statusText}` },
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Error fetching manga:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

