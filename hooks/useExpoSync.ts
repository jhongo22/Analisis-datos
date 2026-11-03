"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  PresentationState,
  Participant,
  PhaseType,
} from "@/lib/db";

export interface SyncPayload {
  state: PresentationState;
  participants: Participant[];
}

export const PHASES_ORDER: PhaseType[] = [
  "LOBBY",
  "PHASE_1_SURVEY",
  "PHASE_1_RESULTS",
  "PHASE_2_SIMULATOR",
  "PHASE_2_REVEAL",
  "PHASE_3_SPEED",
  "PHASE_3_RESULTS",
  "FINAL_PODIUM",
];

export const PHASE_LABELS: Record<PhaseType, string> = {
  LOBBY: "0. Bienvenida y QR",
  PHASE_1_SURVEY: "1. Hábitos del salón",
  PHASE_1_RESULTS: "1.5. Dashboard de hábitos",
  PHASE_2_SIMULATOR: "2. Simulador de gerente",
  PHASE_2_REVEAL: "2.5. Resultados del simulador",
  PHASE_3_SPEED: "3. Prueba de paciencia",
  PHASE_3_RESULTS: "3.5. Costo de la lentitud",
  FINAL_PODIUM: "4. Podio y conclusiones",
};

const DEFAULT_STATE: PresentationState = {
  id: 1,
  current_phase: "LOBBY",
  clean_outliers: 0,
  unlocked_clues: 0,
  custom_host_url: null,
  updated_at: 0,
};

export function useExpoSync() {
  const [data, setData] = useState<SyncPayload>({
    state: DEFAULT_STATE,
    participants: [],
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lastUpdatedRef = useRef<string>("");

  const applyPayload = useCallback((payload: SyncPayload) => {
    if (!payload || !payload.state) return;
    const signature = `${payload.state.updated_at}-${payload.participants?.length ?? 0}-${payload.state.current_phase}-${payload.state.clean_outliers}-${payload.state.unlocked_clues}`;
    if (signature !== lastUpdatedRef.current) {
      lastUpdatedRef.current = signature;
      setData(payload);
    }
    setIsConnected(true);
    setIsLoading(false);
  }, []);

  const fetchSync = useCallback(async () => {
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (!res.ok) throw new Error("Sync HTTP error");
      const json: SyncPayload = await res.json();
      applyPayload(json);
    } catch {
      setIsConnected(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    fetchSync();

    // Connect SSE stream for instant updates
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/stream");
      es.onmessage = (event) => {
        try {
          const parsed: SyncPayload = JSON.parse(event.data);
          applyPayload(parsed);
        } catch {
          // ignore malformed packet
        }
      };
      es.onerror = () => {
        // Fallback polling continues seamlessly
      };
    } catch {
      // Fallback polling handles it
    }

    // Also poll every 1000ms as guaranteed fallback
    const pollInterval = setInterval(fetchSync, 1000);

    return () => {
      if (es) es.close();
      clearInterval(pollInterval);
    };
  }, [fetchSync, applyPayload]);

  const sendAdminAction = useCallback(
    async (payload: {
      action?: "SEED_DEMO" | "RESET_ALL";
      current_phase?: PhaseType;
      clean_outliers?: boolean | number;
      unlocked_clues?: number;
      custom_host_url?: string | null;
    }) => {
      try {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated: SyncPayload = await res.json();
          lastUpdatedRef.current = ""; // force immediate state refresh
          applyPayload(updated);
        }
      } catch (err) {
        console.error("Failed admin action:", err);
      }
    },
    [applyPayload]
  );

  return {
    state: data.state,
    participants: data.participants,
    isConnected,
    isLoading,
    refresh: fetchSync,
    sendAdminAction,
  };
}

