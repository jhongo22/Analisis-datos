import { NextResponse } from "next/server";
import { getFullSyncData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = getFullSyncData();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/sync:", error);
    return NextResponse.json(
      { error: "Failed to read database state" },
      { status: 500 }
    );
  }
}

