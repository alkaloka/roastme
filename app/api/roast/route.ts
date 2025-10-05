export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { fetchLatestCasts } from "@/lib/farcaster";
import { generateRoast } from "@/lib/roast";

export async function POST(request: Request) {
  try {
    const { username, intensity = 1 } = await request.json();
    const cleanUsername = typeof username === "string" ? username.replace(/^@/, "") : "";

    if (!cleanUsername) {
      return NextResponse.json({ error: "Username Farcaster wajib diisi" }, { status: 400 });
    }

    const safeIntensity = Number(intensity) || 1;

    const casts = await fetchLatestCasts(cleanUsername);
    const roast = await generateRoast({ username: cleanUsername, casts, intensity: safeIntensity });

    return NextResponse.json({ roast, castsFetched: casts.length });
  } catch (error) {
    console.error("/api/roast error", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan saat membuat roast";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}




