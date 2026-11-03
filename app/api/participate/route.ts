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
      trust_signal,
      shipping_choice,
      return_reason,
    } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    let parsedTabs: number | undefined = undefined;
    if (tabs_open !== undefined && tabs_open !== null && tabs_open !== "") {
      if (typeof tabs_open === "number" && Number.isFinite(tabs_open)) {
        parsedTabs = tabs_open;
      } else if (typeof tabs_open === "string") {
        const direct = Number(tabs_open);
        if (Number.isFinite(direct)) {
          parsedTabs = direct;
        } else {
          const digits = tabs_open.replace(/\D/g, "");
          if (digits !== "") {
            parsedTabs = Math.round((Number(digits) / 1000) * 100) / 100;
          }
        }
      }
    }

    const participant = await upsertParticipant({
      id,
      nickname,
      avatar,
      tabs_open: parsedTabs,
      form_behavior,
      shopping_time,
      manager_decision,
      wait_tolerance,
      cart_abandon_reason,
      trust_signal,
      shipping_choice,
      return_reason,
    });

    const syncData = await getFullSyncData();
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
