import { NextResponse } from "next/server";
import { getFullSyncData, upsertParticipant } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      nickname,
      avatar,
      tabs_open,
      form_behavior,
      shopping_time,
      manager_decision,
      wait_tolerance,
      cart_abandon_reason,
    } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    const participant = upsertParticipant({
      id,
      nickname,
      avatar,
      tabs_open:
        tabs_open !== undefined && tabs_open !== null && tabs_open !== ""
          ? Number(tabs_open)
          : undefined,
      form_behavior,
      shopping_time,
      manager_decision,
      wait_tolerance,
      cart_abandon_reason,
    });

    const syncData = getFullSyncData();
    return NextResponse.json({
      participant,
      ...syncData,
    });
  } catch (error) {
    console.error("Error in POST /api/participate:", error);
    return NextResponse.json(
      { error: "Failed to save participant response" },
      { status: 500 }
    );
  }
}
