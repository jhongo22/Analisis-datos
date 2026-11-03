import { NextResponse } from "next/server";
import {
  getFullSyncData,
  PhaseType,
  resetAllData,
  seedSimulatedParticipants,
  updatePresentationState,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, current_phase, clean_outliers, unlocked_clues, custom_host_url } =
      body;

    if (action === "SEED_DEMO") {
      await seedSimulatedParticipants();
      return NextResponse.json(await getFullSyncData());
    }

    if (action === "RESET_ALL") {
      await resetAllData();
      return NextResponse.json(await getFullSyncData());
    }

    const updates: {
      current_phase?: PhaseType;
      clean_outliers?: number;
      unlocked_clues?: number;
      custom_host_url?: string | null;
    } = {};

    if (current_phase !== undefined) updates.current_phase = current_phase;
    if (clean_outliers !== undefined)
      updates.clean_outliers = clean_outliers ? 1 : 0;
    if (unlocked_clues !== undefined)
      updates.unlocked_clues = Number(unlocked_clues);
    if (custom_host_url !== undefined)
      updates.custom_host_url = custom_host_url;

    await updatePresentationState(updates);
    return NextResponse.json(await getFullSyncData());
  } catch (error) {
    console.error("Error in POST /api/admin:", error);
    return NextResponse.json(
      { error: "Failed to execute admin action" },
      { status: 500 }
    );
  }
}

