"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  useExpoSync,
  PHASES_ORDER,
  PHASE_LABELS,
} from "@/hooks/useExpoSync";
import { ParticipantAvatar } from "@/components/Avatars";
import type {
  PhaseType,
  TrustSignalType,
  ShippingChoiceType,
  ReturnReasonType,
} from "@/lib/db";
import {
  Users,
  AlertTriangle,
  Filter,
  Trophy,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  UserPlus,
  Globe,
  BarChart3,
  Clock,
  MessageSquare,
  Layers,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  ChevronDown,
  ArrowLeft,
  Zap,
  ShoppingCart,
  Truck,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
function formatNumber(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// Pregunta 1 = gasto mensual en compras por internet, en MILES de pesos.
// Se guarda en la columna `tabs_open` para no migrar la base de datos.
const MAX_MONTHLY_SPEND = 2000; // > $2.000.000 al mes se considera dato exagerado
const VISITORS_WHO_LEFT = 620; // personas que cerraron la web por el formulario (Prueba 2)

// 150 -> "$150 mil" ; 1250 -> "$1,3 millones" ; 620*150 -> "$93 millones"
function formatMiles(thousands: number): string {
  if (!Number.isFinite(thousands) || thousands === 0) return "$0";
  if (Math.abs(thousands) >= 1000) {
    const millions = Math.round((thousands / 1000) * 10) / 10;
    return `$${millions.toLocaleString("es-CO")} ${
      millions === 1 ? "millón" : "millones"
    }`;
  }
  return `$${Math.round(thousands).toLocaleString("es-CO")} mil`;
}

export default function PresenterPage() {
  const { state, participants, isConnected, sendAdminAction } = useExpoSync();
  const [hostInput, setHostInput] = useState<string>("");
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [qrZoomed, setQrZoomed] = useState<boolean>(false);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);

  useEffect(() => {
    if (state.custom_host_url) {
      setHostInput(state.custom_host_url);
    } else if (typeof window !== "undefined" && !hostInput) {
      setHostInput(window.location.origin);
    }
  }, [state.custom_host_url, hostInput]);

  const playUrl = useMemo(() => {
    const base = (
      state.custom_host_url ||
      hostInput ||
      "http://localhost:3000"
    ).replace(/\/+$/, "");
    return base.endsWith("/play") ? base : `${base}/play`;
  }, [state.custom_host_url, hostInput]);

  const currentPhaseIndex = PHASES_ORDER.indexOf(state.current_phase);

  const goToPhase = (phase: PhaseType) => {
    sendAdminAction({ current_phase: phase });
  };

  const handlePrevPhase = () => {
    if (currentPhaseIndex > 0) {
      goToPhase(PHASES_ORDER[currentPhaseIndex - 1]);
    }
  };

  const handleNextPhase = () => {
    if (currentPhaseIndex < PHASES_ORDER.length - 1) {
      goToPhase(PHASES_ORDER[currentPhaseIndex + 1]);
    }
  };

  const handleToggleCleaning = () => {
    sendAdminAction({ clean_outliers: state.clean_outliers === 1 ? 0 : 1 });
  };

  const handleSaveHostUrl = (e: React.FormEvent) => {
    e.preventDefault();
    sendAdminAction({ custom_host_url: hostInput.trim() });
    setIsEditingUrl(false);
  };

  const analytics = useMemo(() => {
    const total = participants.length;
    const completedPhase1 = participants.filter(
      (p) =>
        p.tabs_open !== null &&
        p.form_behavior !== null &&
        p.shopping_time !== null
    );

    const withTabs = participants.filter(
      (p) => p.tabs_open !== null && !Number.isNaN(Number(p.tabs_open))
    );

    const outliers = withTabs.filter(
      (p) => Number(p.tabs_open) < 0 || Number(p.tabs_open) > MAX_MONTHLY_SPEND
    );

    const cleanTabsList = withTabs.filter(
      (p) => Number(p.tabs_open) >= 0 && Number(p.tabs_open) <= MAX_MONTHLY_SPEND
    );

    const rawAvgTabs =
      withTabs.length > 0
        ? withTabs.reduce((acc, p) => acc + Number(p.tabs_open), 0) /
          withTabs.length
        : 0;

    // If all entries are outliers (> MAX_MONTHLY_SPEND), the clean average stays at 0 until realistic answers arrive
    const cleanAvgTabs =
      cleanTabsList.length > 0
        ? cleanTabsList.reduce((acc, p) => acc + Number(p.tabs_open), 0) /
          cleanTabsList.length
        : 0;

    const activeAvgTabs =
      state.clean_outliers === 1 ? cleanAvgTabs : rawAvgTabs;

    // Highest realistic answer, used to scale the per-person bars
    const maxCleanSpend = Math.max(
      1,
      ...cleanTabsList.map((p) => Number(p.tabs_open))
    );

    // Money the store lost: people who closed the web x average spend of the room
    const lostMoneyRaw = VISITORS_WHO_LEFT * rawAvgTabs;
    const lostMoneyClean = VISITORS_WHO_LEFT * cleanAvgTabs;

    const formCounts = {
      FILL_PATIENTLY: participants.filter(
        (p) => p.form_behavior === "FILL_PATIENTLY"
      ).length,
      ABANDON: participants.filter((p) => p.form_behavior === "ABANDON").length,
      PREFER_WHATSAPP: participants.filter(
        (p) => p.form_behavior === "PREFER_WHATSAPP"
      ).length,
    };
    const totalFormVotes =
      formCounts.FILL_PATIENTLY +
      formCounts.ABANDON +
      formCounts.PREFER_WHATSAPP;

    const timeCounts = {
      MORNING: participants.filter((p) => p.shopping_time === "MORNING").length,
      AFTERNOON: participants.filter((p) => p.shopping_time === "AFTERNOON")
        .length,
      NIGHT: participants.filter((p) => p.shopping_time === "NIGHT").length,
    };
    const totalTimeVotes =
      timeCounts.MORNING + timeCounts.AFTERNOON + timeCounts.NIGHT;

    const decisionCounts = {
      LOWER_PRICE: participants.filter(
        (p) => p.manager_decision === "LOWER_PRICE"
      ).length,
      MORE_ADS: participants.filter((p) => p.manager_decision === "MORE_ADS")
        .length,
      FIX_FUNNEL_AUTOMATION: participants.filter(
        (p) => p.manager_decision === "FIX_FUNNEL_AUTOMATION"
      ).length,
    };
    const totalDecisionVotes =
      decisionCounts.LOWER_PRICE +
      decisionCounts.MORE_ADS +
      decisionCounts.FIX_FUNNEL_AUTOMATION;

    // Phase 3 Speed & Abandonment counts
    const waitCounts = {
      WAIT_5_MIN: participants.filter((p) => p.wait_tolerance === "WAIT_5_MIN")
        .length,
      WAIT_1_HOUR: participants.filter(
        (p) => p.wait_tolerance === "WAIT_1_HOUR"
      ).length,
      WAIT_24_HOURS: participants.filter(
        (p) => p.wait_tolerance === "WAIT_24_HOURS"
      ).length,
    };
    const totalWaitVotes =
      waitCounts.WAIT_5_MIN + waitCounts.WAIT_1_HOUR + waitCounts.WAIT_24_HOURS;

    const abandonCounts = {
      NO_FAST_SUPPORT: participants.filter(
        (p) => p.cart_abandon_reason === "NO_FAST_SUPPORT"
      ).length,
      TOO_MANY_STEPS: participants.filter(
        (p) => p.cart_abandon_reason === "TOO_MANY_STEPS"
      ).length,
      SURPRISE_SHIPPING: participants.filter(
        (p) => p.cart_abandon_reason === "SURPRISE_SHIPPING"
      ).length,
    };
    const totalAbandonVotes =
      abandonCounts.NO_FAST_SUPPORT +
      abandonCounts.TOO_MANY_STEPS +
      abandonCounts.SURPRISE_SHIPPING;

    const completedPhase3Count = participants.filter(
      (p) => p.wait_tolerance !== null && p.cart_abandon_reason !== null
    ).length;

    // Phase 4 Customer Journey & Psychology counts
    const trustCounts = {
      REVIEWS: participants.filter((p) => p.trust_signal === "REVIEWS").length,
      WHATSAPP_CONTACT: participants.filter(
        (p) => p.trust_signal === "WHATSAPP_CONTACT"
      ).length,
      FOLLOWERS: participants.filter((p) => p.trust_signal === "FOLLOWERS")
        .length,
      PRICE_ONLY: participants.filter((p) => p.trust_signal === "PRICE_ONLY")
        .length,
    };
    const totalTrustVotes =
      trustCounts.REVIEWS +
      trustCounts.WHATSAPP_CONTACT +
      trustCounts.FOLLOWERS +
      trustCounts.PRICE_ONLY;

    const shippingCounts = {
      FREE_SHIPPING: participants.filter(
        (p) => p.shipping_choice === "FREE_SHIPPING"
      ).length,
      PRICE_PLUS_SHIPPING: participants.filter(
        (p) => p.shipping_choice === "PRICE_PLUS_SHIPPING"
      ).length,
      CALCULATE_TOTAL: participants.filter(
        (p) => p.shipping_choice === "CALCULATE_TOTAL"
      ).length,
    };
    const totalShippingVotes =
      shippingCounts.FREE_SHIPPING +
      shippingCounts.PRICE_PLUS_SHIPPING +
      shippingCounts.CALCULATE_TOTAL;
    const overpaidCount = shippingCounts.FREE_SHIPPING;
    const overpaidMoneyTotal = overpaidCount * 3000;
    const overpaidPct =
      totalShippingVotes > 0
        ? Math.round((overpaidCount / totalShippingVotes) * 100)
        : 0;

    const returnCounts = {
      GOOD_SERVICE: participants.filter(
        (p) => p.return_reason === "GOOD_SERVICE"
      ).length,
      NEXT_DISCOUNT: participants.filter(
        (p) => p.return_reason === "NEXT_DISCOUNT"
      ).length,
      WHATSAPP_UPDATES: participants.filter(
        (p) => p.return_reason === "WHATSAPP_UPDATES"
      ).length,
      CHEAPEST_ONLY: participants.filter(
        (p) => p.return_reason === "CHEAPEST_ONLY"
      ).length,
    };
    const totalReturnVotes =
      returnCounts.GOOD_SERVICE +
      returnCounts.NEXT_DISCOUNT +
      returnCounts.WHATSAPP_UPDATES +
      returnCounts.CHEAPEST_ONLY;

    const completedPhase4Count = participants.filter(
      (p) =>
        p.trust_signal !== null &&
        p.shipping_choice !== null &&
        p.return_reason !== null
    ).length;

    const dataDrivenWinners = participants
      .filter((p) => p.manager_decision === "FIX_FUNNEL_AUTOMATION")
      .sort((a, b) => b.score - a.score);

    const individualTabs = (
      state.clean_outliers === 1 ? cleanTabsList : withTabs
    ).slice(0, 18);

    return {
      total,
      completedPhase1Count: completedPhase1.length,
      withTabsCount: withTabs.length,
      cleanTabsCount: cleanTabsList.length,
      outliers,
      rawAvgTabs,
      cleanAvgTabs,
      activeAvgTabs,
      maxCleanSpend,
      lostMoneyRaw,
      lostMoneyClean,
      formCounts,
      totalFormVotes,
      timeCounts,
      totalTimeVotes,
      decisionCounts,
      totalDecisionVotes,
      waitCounts,
      totalWaitVotes,
      abandonCounts,
      totalAbandonVotes,
      completedPhase3Count,
      trustCounts,
      totalTrustVotes,
      shippingCounts,
      totalShippingVotes,
      overpaidCount,
      overpaidMoneyTotal,
      overpaidPct,
      returnCounts,
      totalReturnVotes,
      completedPhase4Count,
      dataDrivenWinners,
      individualTabs,
    };
  }, [participants, state.clean_outliers]);

  // Dynamic Donut Chart that highlights whichever schedule won in the room
  const renderDonutChart = () => {
    const total = analytics.totalTimeVotes;
    const nightPct = total > 0 ? (analytics.timeCounts.NIGHT / total) * 100 : 0;
    const afternoonPct =
      total > 0 ? (analytics.timeCounts.AFTERNOON / total) * 100 : 0;
    const morningPct =
      total > 0 ? (analytics.timeCounts.MORNING / total) * 100 : 0;

    // Determine dominant schedule dynamically
    let topLabel = "Sin votos";
    let topPct = 0;
    if (total > 0) {
      const entries = [
        { label: "Noche", pct: Math.round(nightPct) },
        { label: "Tarde", pct: Math.round(afternoonPct) },
        { label: "Mañana", pct: Math.round(morningPct) },
      ].sort((a, b) => b.pct - a.pct);
      topLabel = entries[0].label;
      topPct = entries[0].pct;
    }

    return (
      <div className="flex items-center gap-5">
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9155"
              fill="transparent"
              stroke="#E2E8F0"
              strokeWidth="4.5"
            />
            {total > 0 && (
              <>
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="transparent"
                  stroke="#2563EB"
                  strokeWidth="4.5"
                  strokeDasharray={`${nightPct} ${100 - nightPct}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="transparent"
                  stroke="#D97706"
                  strokeWidth="4.5"
                  strokeDasharray={`${afternoonPct} ${100 - afternoonPct}`}
                  strokeDashoffset={`${-nightPct}`}
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="transparent"
                  stroke="#059669"
                  strokeWidth="4.5"
                  strokeDasharray={`${morningPct} ${100 - morningPct}`}
                  strokeDashoffset={`${-(nightPct + afternoonPct)}`}
                />
              </>
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display text-2xl font-bold text-[#0F172A]">
              {total > 0 ? `${topPct}%` : "0%"}
            </span>
            <span className="text-[11px] font-bold text-[#475569]">
              {topLabel}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {[
            {
              label: "Noche (+8 pm)",
              count: analytics.timeCounts.NIGHT,
              pct: Math.round(nightPct),
              dot: "bg-[#2563EB]",
            },
            {
              label: "Tarde (12 a 6 pm)",
              count: analytics.timeCounts.AFTERNOON,
              pct: Math.round(afternoonPct),
              dot: "bg-[#D97706]",
            },
            {
              label: "Mañana (8 a 12 pm)",
              count: analytics.timeCounts.MORNING,
              pct: Math.round(morningPct),
              dot: "bg-[#059669]",
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-xs sm:text-sm font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${row.dot}`} />
                <span className="text-[#0F172A]">{row.label}</span>
              </div>
              <span className="text-[#0F172A]">
                {row.count} ({total > 0 ? row.pct : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between relative pb-14">
      {/* FULLSCREEN QR MODAL */}
      {qrZoomed && (
        <div
          className="fixed inset-0 z-50 bg-white/98 backdrop-blur-md overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-start sm:justify-center"
          onClick={() => setQrZoomed(false)}
        >
          <div
            className="max-w-2xl w-full flex flex-col items-center text-center space-y-4 sm:space-y-6 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
              <div className="text-center sm:text-left">
                <p className="text-sm sm:text-base font-semibold text-[#2563EB]">
                  Escanea con la cámara de tu celular
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
                  Datos de adorno vs. decisiones reales
                </h2>
              </div>
              <button
                onClick={() => setQrZoomed(false)}
                className="px-4 py-2.5 rounded-xl bg-[#0F172A] text-white font-semibold text-sm sm:text-base flex items-center gap-2 hover:bg-[#1E293B] shadow-md shrink-0"
              >
                <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Volver a la presentación</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-white rounded-3xl border-4 border-[#0F172A] shadow-[8px_8px_0px_#0F172A] max-w-full">
              <div className="w-[260px] h-[260px] xs:w-[320px] xs:h-[320px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">
                <QRCodeSVG
                  value={playUrl}
                  size={420}
                  level="M"
                  includeMargin={true}
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="w-full px-4 py-2.5 rounded-2xl bg-[#F1F5F9] border-2 border-[#CBD5E1] text-lg sm:text-2xl font-bold text-[#0F172A] break-all">
              {playUrl}
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER BAR WITH BACK BUTTON */}
      <header className="sticky top-0 z-20 border-b-2 border-[#E2E8F0] bg-white px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-[#0F172A] font-bold text-xs sm:text-sm shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver atrás</span>
          </Link>

          <div className="h-9 w-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#2563EB] truncate">
              {PHASE_LABELS[state.current_phase]}
            </p>
            <h1 className="font-display text-sm sm:text-lg font-bold tracking-tight text-[#0F172A] truncate">
              El análisis de datos y por qué las empresas pierden dinero
            </h1>
          </div>
        </div>

        {/* Phase Tabs + Live Status */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <nav
            aria-label="Fases de la exposición"
            className="hidden 2xl:flex items-center gap-1 bg-[#F1F5F9] border border-[#CBD5E1] p-1 rounded-xl"
          >
            {PHASES_ORDER.map((phase, idx) => {
              const active = state.current_phase === phase;
              return (
                <button
                  key={phase}
                  onClick={() => goToPhase(phase)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "text-[#475569] hover:text-[#0F172A] hover:bg-white/70"
                  }`}
                >
                  {idx === 0
                    ? "0. QR"
                    : idx === 1
                    ? "1. Hábitos"
                    : idx === 2
                    ? "1.5 Dashboard"
                    : idx === 3
                    ? "2. Paciencia"
                    : idx === 4
                    ? "2.5 Lentitud"
                    : idx === 5
                    ? "3. Psicología"
                    : idx === 6
                    ? "3.5 Envío Gratis"
                    : idx === 7
                    ? "4. Gerente"
                    : idx === 8
                    ? "4.5 Verdad"
                    : "5. Podio"}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border-2 border-[#CBD5E1] text-[#0F172A] font-bold text-xs sm:text-sm">
              <Users className="w-4 h-4 text-[#2563EB]" />
              <span>{analytics.total}</span>
            </div>

            <div
              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold ${
                isConnected
                  ? "bg-[#ECFDF5] border-[#059669] text-[#065F46]"
                  : "bg-[#FEF2F2] border-[#DC2626] text-[#991B1B]"
              }`}
            >
              <span>{isConnected ? "En vivo" : "Reconectando"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN STAGE (16:9 Capped Container) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-3 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* =========================================================
              FASE 0: LOBBY (GIANT QR + KAHOOT AVATARS)
          ========================================================= */}
          {state.current_phase === "LOBBY" && (
            <motion.div
              key="LOBBY"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center"
            >
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-sm font-semibold">
                  <span>Experimento interactivo en vivo</span>
                </div>

                <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-[1.08] text-[#0F172A]">
                  Datos de adorno vs. decisiones reales
                </h2>

                <p className="text-base sm:text-lg text-[#334155]">
                  Escanea el QR con tu celular, elige tu personaje y entra a la
                  pantalla.
                </p>

                <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 sm:p-5 shadow-[6px_6px_0px_#0F172A]">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-[#0F172A]">
                          Participantes conectados
                        </h3>
                      </div>
                    </div>
                    <span className="font-display text-4xl font-bold text-[#2563EB]">
                      {analytics.total}
                    </span>
                  </div>

                  {analytics.total === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-[#CBD5E1] rounded-xl text-[#475569] text-sm px-4">
                      Esperando participantes... (O pulsa{" "}
                      <strong className="text-[#0F172A]">
                        &ldquo;Demo 25&rdquo;
                      </strong>{" "}
                      abajo).
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {participants.map((p) => (
                        <motion.div
                          key={p.id}
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full bg-[#F8FAFC] border-2 border-[#0F172A] text-[#0F172A] font-bold text-sm shadow-[2px_2px_0px_#0F172A]"
                        >
                          <ParticipantAvatar avatarId={p.avatar} size="sm" />
                          <span>{p.nickname}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col items-center">
                <div className="w-full rounded-3xl bg-white border-4 border-[#0F172A] p-6 shadow-[10px_10px_0px_#0F172A] flex flex-col items-center text-center">
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-sm sm:text-base font-bold text-[#2563EB]">
                      Escanea desde cualquier asiento
                    </span>
                    <button
                      onClick={() => setQrZoomed(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold border border-[#CBD5E1]"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Ampliar QR</span>
                    </button>
                  </div>

                  <div
                    onClick={() => setQrZoomed(true)}
                    className="cursor-pointer p-3 bg-white rounded-2xl border-2 border-[#E2E8F0] hover:border-[#0F172A] transition-colors my-1 max-w-full"
                  >
                    <div className="w-[230px] h-[230px] xs:w-[270px] xs:h-[270px] sm:w-[310px] sm:h-[310px] lg:w-[330px] lg:h-[330px] flex items-center justify-center">
                      <QRCodeSVG
                        value={playUrl}
                        size={330}
                        level="M"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        includeMargin={true}
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  <div className="w-full bg-[#F8FAFC] border-2 border-[#CBD5E1] rounded-xl px-4 py-2.5 mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-left truncate">
                      <Globe className="w-4 h-4 text-[#2563EB] shrink-0" />
                      <span className="text-base font-bold text-[#0F172A] truncate">
                        {playUrl}
                      </span>
                    </div>

                    {!isEditingUrl && (
                      <button
                        onClick={() => setIsEditingUrl(true)}
                        className="px-3 py-1 rounded-lg bg-white border border-[#CBD5E1] hover:border-[#0F172A] text-xs font-bold text-[#0F172A] shrink-0"
                      >
                        Editar IP / URL
                      </button>
                    )}
                  </div>

                  {isEditingUrl && (
                    <form
                      onSubmit={handleSaveHostUrl}
                      className="w-full flex gap-2 mt-2"
                    >
                      <input
                        type="text"
                        value={hostInput}
                        onChange={(e) => setHostInput(e.target.value)}
                        placeholder="http://192.168.20.25:3000"
                        className="flex-1 bg-white border-2 border-[#0F172A] rounded-xl px-3.5 py-2 text-sm text-[#0F172A] font-semibold focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-bold text-white"
                      >
                        Guardar QR
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* =========================================================
              FASE 1: PHASE_1_SURVEY
          ========================================================= */}
          {state.current_phase === "PHASE_1_SURVEY" && (
            <motion.div
              key="PHASE_1_SURVEY"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto w-full space-y-6"
            >
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-[#2563EB]">
                  Prueba 1 en vivo
                </p>
                <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#0F172A]">
                  Conozcamos los hábitos de este salón
                </h2>
              </div>

              <div className="rounded-3xl bg-white border-2 border-[#0F172A] p-6 sm:p-8 shadow-[8px_8px_0px_#0F172A]">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#475569]">
                      Respuestas recibidas
                    </p>
                    <div className="font-display text-4xl sm:text-5xl font-bold text-[#0F172A]">
                      {analytics.completedPhase1Count} de {analytics.total}
                    </div>
                  </div>
                  <span className="font-display text-5xl sm:text-6xl font-bold text-[#2563EB]">
                    {analytics.total > 0
                      ? Math.round(
                          (analytics.completedPhase1Count / analytics.total) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>

                <div className="w-full h-5 bg-[#F1F5F9] rounded-xl overflow-hidden border-2 border-[#0F172A] mb-6">
                  <div
                    className="h-full bg-[#2563EB] origin-left transition-transform duration-500"
                    style={{
                      transform: `scaleX(${
                        analytics.total > 0
                          ? Math.min(
                              1,
                              analytics.completedPhase1Count / analytics.total
                            )
                          : 0
                      })`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] p-5">
                    <div className="flex items-center gap-2 text-[#2563EB] font-bold text-sm mb-1.5">
                      <Layers className="w-4 h-4" />
                      <span>Pregunta 1</span>
                    </div>
                    <p className="text-[#0F172A] font-bold text-lg">
                      ¿Cuánto gastas al mes en compras por internet?
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] p-5">
                    <div className="flex items-center gap-2 text-[#059669] font-bold text-sm mb-1.5">
                      <MessageSquare className="w-4 h-4" />
                      <span>Pregunta 2</span>
                    </div>
                    <p className="text-[#0F172A] font-bold text-lg">
                      ¿Qué haces ante un formulario largo de 10 preguntas?
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] p-5">
                    <div className="flex items-center gap-2 text-[#D97706] font-bold text-sm mb-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Pregunta 3</span>
                    </div>
                    <p className="text-[#0F172A] font-bold text-lg">
                      ¿A qué hora sueles comprar más por internet?
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* =========================================================
              FASE 1.5: PHASE_1_RESULTS (ULTRA-CLEAN VISUAL DASHBOARD)
          ========================================================= */}
          {state.current_phase === "PHASE_1_RESULTS" && (
            <motion.div
              key="PHASE_1_RESULTS"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
            >
              {/* TOP-LEFT (7 cols): Big Number + Column Chart */}
              <div
                className={`lg:col-span-7 rounded-2xl p-5 border-2 flex flex-col justify-between bg-white ${
                  state.clean_outliers === 0 && analytics.outliers.length > 0
                    ? "border-[#DC2626] shadow-[5px_5px_0px_#DC2626]"
                    : "border-[#0F172A] shadow-[5px_5px_0px_#059669]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                        state.clean_outliers === 0 &&
                        analytics.outliers.length > 0
                          ? "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]"
                          : "bg-[#ECFDF5] text-[#065F46] border-[#6EE7B7]"
                      }`}
                    >
                      {state.clean_outliers === 0
                        ? "Datos sin revisar"
                        : "Datos limpios (hasta $2 millones)"}
                    </span>
                    <h3 className="font-display text-xl font-bold text-[#0F172A] mt-0.5">
                      Gasto mensual promedio del salón
                    </h3>
                  </div>

                  <button
                    onClick={handleToggleCleaning}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border-2 transition-transform active:translate-y-0.5 ${
                      state.clean_outliers === 1
                        ? "bg-[#059669] text-white border-[#0F172A]"
                        : "bg-[#0F172A] text-white border-[#0F172A] hover:bg-[#1E293B]"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>
                      {state.clean_outliers === 1
                        ? "Filtro activo"
                        : "Quitar números exagerados"}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-2">
                  <div className="sm:col-span-5 flex items-baseline gap-2.5">
                    <motion.div
                      key={formatNumber(analytics.activeAvgTabs)}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`font-display text-5xl font-bold tracking-tight ${
                        state.clean_outliers === 0 &&
                        analytics.outliers.length > 0
                          ? "text-[#DC2626]"
                          : "text-[#059669]"
                      }`}
                    >
                      {formatMiles(analytics.activeAvgTabs)}
                    </motion.div>
                    <div className="text-sm font-bold text-[#475569]">
                      al mes
                    </div>
                  </div>

                  <div className="sm:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                    <div className="text-xs font-bold text-[#475569] mb-1">
                      Respuestas por persona
                    </div>
                    <div className="h-16 flex items-end gap-1.5 pt-2">
                      {analytics.individualTabs.length === 0 ? (
                        <div className="w-full text-center text-xs text-[#64748B] pb-4">
                          Sin respuestas en este rango
                        </div>
                      ) : (
                        analytics.individualTabs.map((p) => {
                          const val = Number(p.tabs_open) || 0;
                          const isOutlier = val < 0 || val > MAX_MONTHLY_SPEND;
                          const maxScale =
                            state.clean_outliers === 0 &&
                            analytics.outliers.length > 0
                              ? Math.max(1, ...analytics.individualTabs.map((x) => Number(x.tabs_open) || 0))
                              : analytics.maxCleanSpend;
                          const heightPct = isOutlier
                            ? 100
                            : Math.max(
                                12,
                                Math.min(100, (val / maxScale) * 100)
                              );
                          return (
                            <div
                              key={p.id}
                              className="flex-1 flex flex-col items-center justify-end h-full"
                              title={`${p.nickname}: ${formatMiles(val)}`}
                            >
                              <div
                                className={`w-full rounded-t transition-all duration-500 ${
                                  isOutlier ? "bg-[#DC2626]" : "bg-[#2563EB]"
                                }`}
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {analytics.outliers.length > 0 ? (
                  <div
                    className={`rounded-xl px-3.5 py-2 border flex items-center gap-2 text-xs font-bold ${
                      state.clean_outliers === 0
                        ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
                        : "bg-[#ECFDF5] border-[#6EE7B7] text-[#065F46]"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {state.clean_outliers === 0
                        ? `Dato exagerado: ${analytics.outliers
                            .map((o) => `${o.nickname} (${formatMiles(Number(o.tabs_open))})`)
                            .join(", ")}`
                        : `Se quitaron ${analytics.outliers.length} respuestas exageradas (más de $2 millones o negativas).`}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#475569]">
                    Todos los datos están en rango normal ($0 a $2 millones).
                  </div>
                )}
              </div>

              {/* TOP-RIGHT (5 cols): Ultra Clean Comparison */}
              <div className="lg:col-span-5 rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[5px_5px_0px_#0F172A] flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-[#2563EB]">
                    Impacto de los errores
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#0F172A]">
                    Un dato falso engaña a todos
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 my-2">
                  <div className="rounded-xl bg-[#FEF2F2] border-2 border-[#FECACA] p-3.5 text-center">
                    <span className="text-xs font-bold text-[#991B1B] block mb-1">
                      Promedio sin limpiar
                    </span>
                    <span className="font-display text-4xl font-bold text-[#DC2626]">
                      {formatMiles(analytics.rawAvgTabs)}
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#ECFDF5] border-2 border-[#6EE7B7] p-3.5 text-center">
                    <span className="text-xs font-bold text-[#065F46] block mb-1">
                      Promedio limpio
                    </span>
                    <span className="font-display text-4xl font-bold text-[#059669]">
                      {analytics.cleanTabsCount > 0
                        ? formatMiles(analytics.cleanAvgTabs)
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-xs font-semibold text-[#334155] text-center">
                  {analytics.cleanTabsCount === 0 && analytics.withTabsCount > 0
                    ? "Nota: Todos pusieron más de $2 millones al mes (0 datos válidos)."
                    : "Limpiar datos antes de decidir evita errores millonarios."}
                </div>
              </div>

              {/* BOTTOM-LEFT (6 cols): Form Abandonment */}
              <div className="lg:col-span-6 rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[5px_5px_0px_#0F172A]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display text-lg font-bold text-[#0F172A]">
                    ¿Qué hacen ante un formulario de 10 preguntas?
                  </h4>
                  <MessageSquare className="w-5 h-5 text-[#059669]" />
                </div>

                <div className="space-y-3">
                  {[
                    {
                      key: "PREFER_WHATSAPP",
                      label: "Prefiero botón de WhatsApp",
                      count: analytics.formCounts.PREFER_WHATSAPP,
                      barColor: "bg-[#059669]",
                      textColor: "text-[#065F46]",
                    },
                    {
                      key: "ABANDON",
                      label: "Me salgo de la página",
                      count: analytics.formCounts.ABANDON,
                      barColor: "bg-[#DC2626]",
                      textColor: "text-[#991B1B]",
                    },
                    {
                      key: "FILL_PATIENTLY",
                      label: "Lo lleno con paciencia",
                      count: analytics.formCounts.FILL_PATIENTLY,
                      barColor: "bg-[#2563EB]",
                      textColor: "text-[#1E40AF]",
                    },
                  ].map((item) => {
                    const pct =
                      analytics.totalFormVotes > 0
                        ? Math.round(
                            (item.count / analytics.totalFormVotes) * 100
                          )
                        : 0;
                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-[#0F172A]">{item.label}</span>
                          <span className={item.textColor}>
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-4 bg-[#F1F5F9] rounded-md overflow-hidden border border-[#CBD5E1]">
                          <div
                            className={`h-full ${item.barColor} origin-left transition-transform duration-500`}
                            style={{ transform: `scaleX(${pct / 100})` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BOTTOM-RIGHT (6 cols): Shopping Time Donut */}
              <div className="lg:col-span-6 rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[5px_5px_0px_#0F172A] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-display text-lg font-bold text-[#0F172A]">
                    ¿A qué hora compran más por internet?
                  </h4>
                  <Clock className="w-5 h-5 text-[#2563EB]" />
                </div>

                {renderDonutChart()}
              </div>
            </motion.div>
          )}

          {/* =========================================================
              FASE 2: PHASE_2_SIMULATOR (EMPTY BARS AT 0 VOTES)
          ========================================================= */}
          {state.current_phase === "PHASE_2_SIMULATOR" && (
            <motion.div
              key="PHASE_2_SIMULATOR"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
            >
              <div className="lg:col-span-7 rounded-3xl bg-white border-4 border-[#0F172A] p-6 shadow-[8px_8px_0px_#0F172A] flex flex-col justify-between space-y-4">
                <div>
                  <span className="inline-block text-xs font-bold px-3 py-1 rounded-md bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] mb-1">
                    Prueba 4 • El gran reto del gerente
                  </span>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A]">
                    Simulador: Tú eres el gerente
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-[#F8FAFC] border-2 border-[#CBD5E1] p-3 text-center">
                    <div className="text-xs font-bold text-[#475569]">
                      Publicidad
                    </div>
                    <div className="font-display text-2xl font-bold text-[#0F172A]">
                      $2.000.000
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#EFF6FF] border-2 border-[#BFDBFE] p-3 text-center">
                    <div className="text-xs font-bold text-[#1E40AF]">
                      Visitas a la web
                    </div>
                    <div className="font-display text-2xl font-bold text-[#2563EB]">
                      1.000
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#FEF2F2] border-2 border-[#FECACA] p-3 text-center">
                    <div className="text-xs font-bold text-[#991B1B]">
                      Compraron
                    </div>
                    <div className="font-display text-2xl font-bold text-[#DC2626]">
                      Solo 15
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border-2 border-[#0F172A] text-base font-medium text-[#0F172A]">
                  El dueño dice:{" "}
                  <strong className="text-[#DC2626]">
                    &ldquo;Estamos caros o falta publicidad&rdquo;
                  </strong>
                  . ¿Qué decides hacer desde tu celular?
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-[#FEF2F2] border-2 border-[#FECACA] p-3.5">
                    <span className="text-xs font-bold text-[#991B1B] block">
                      Opción A
                    </span>
                    <h4 className="font-display text-base font-bold text-[#0F172A]">
                      Bajar precios 15%
                    </h4>
                  </div>

                  <div className="rounded-xl bg-[#FFFBEB] border-2 border-[#FDE68A] p-3.5">
                    <span className="text-xs font-bold text-[#92400E] block">
                      Opción B
                    </span>
                    <h4 className="font-display text-base font-bold text-[#0F172A]">
                      Doblar publicidad
                    </h4>
                  </div>

                  <div className="rounded-xl bg-[#ECFDF5] border-2 border-[#A7F3D0] p-3.5">
                    <span className="text-xs font-bold text-[#065F46] block">
                      Opción C
                    </span>
                    <h4 className="font-display text-base font-bold text-[#0F172A]">
                      Revisar los datos
                    </h4>
                  </div>
                </div>
              </div>

              {/* Right Column: Vertical Bars (Completely empty when 0 votes) */}
              <div className="lg:col-span-5 rounded-3xl bg-white border-4 border-[#0F172A] p-6 shadow-[8px_8px_0px_#2563EB] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#2563EB] block">
                      Votación en directo
                    </span>
                    <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                      Decisiones en tiempo real
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-3xl font-bold text-[#059669]">
                      {analytics.totalDecisionVotes}
                    </span>
                    <span className="block text-xs font-bold text-[#475569]">
                      votos
                    </span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-3 gap-5 items-end pt-8 pb-2 px-2 my-2 border-b-2 border-[#0F172A] min-h-[240px]">
                  {[
                    {
                      key: "LOWER_PRICE",
                      votes: analytics.decisionCounts.LOWER_PRICE,
                      bg: "bg-[#DC2626]",
                      badgeBg: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
                    },
                    {
                      key: "MORE_ADS",
                      votes: analytics.decisionCounts.MORE_ADS,
                      bg: "bg-[#D97706]",
                      badgeBg: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
                    },
                    {
                      key: "FIX_FUNNEL_AUTOMATION",
                      votes: analytics.decisionCounts.FIX_FUNNEL_AUTOMATION,
                      bg: "bg-[#059669]",
                      badgeBg: "bg-[#ECFDF5] text-[#065F46] border-[#6EE7B7]",
                    },
                  ].map((col) => {
                    const pct =
                      analytics.totalDecisionVotes > 0
                        ? Math.round(
                            (col.votes / analytics.totalDecisionVotes) * 100
                          )
                        : 0;
                    // Strictly 0% height when votes === 0 so no color shows
                    const heightPct = col.votes === 0 ? 0 : Math.max(12, pct);

                    return (
                      <div
                        key={col.key}
                        className="h-full flex flex-col items-center justify-end"
                      >
                        <div
                          className={`mb-2 px-2.5 py-1 rounded-lg border text-xs font-bold ${col.badgeBg}`}
                        >
                          {col.votes} ({pct}%)
                        </div>
                        <div className="w-full h-44 bg-[#F1F5F9] rounded-t-2xl border-x-2 border-t-2 border-[#0F172A] flex items-end overflow-hidden p-1">
                          {col.votes > 0 && (
                            <motion.div
                              className={`w-full rounded-t-xl ${col.bg}`}
                              initial={{ height: "0%" }}
                              animate={{ height: `${heightPct}%` }}
                              transition={{
                                type: "spring",
                                stiffness: 120,
                                damping: 18,
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-5 text-center">
                  <div>
                    <div className="font-display font-bold text-sm text-[#0F172A]">
                      Opción A
                    </div>
                    <div className="text-xs text-[#475569]">Bajar precios</div>
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm text-[#0F172A]">
                      Opción B
                    </div>
                    <div className="text-xs text-[#475569]">Más anuncios</div>
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm text-[#0F172A]">
                      Opción C
                    </div>
                    <div className="text-xs text-[#475569]">Mirar datos</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* =========================================================
              FASE 2.5: PHASE_2_REVEAL (CONCISE DIRECT INSIGHTS)
          ========================================================= */}
          {state.current_phase === "PHASE_2_REVEAL" && (
            <motion.div
              key="PHASE_2_REVEAL"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[5px_5px_0px_#0F172A]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                    ¿Cómo votó el salón ante la caída de ventas?
                  </h3>
                  <span className="px-3.5 py-1 rounded-xl bg-[#ECFDF5] border border-[#059669] text-[#065F46] text-xs font-bold">
                    Ganadora: Opción C (Mirar los datos)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      key: "LOWER_PRICE",
                      title: "Opción A: Bajar precios 15%",
                      votes: analytics.decisionCounts.LOWER_PRICE,
                      barColor: "bg-[#DC2626]",
                      cardBg: "bg-[#FEF2F2] border-[#FECACA]",
                      textColor: "text-[#991B1B]",
                    },
                    {
                      key: "MORE_ADS",
                      title: "Opción B: Doblar publicidad",
                      votes: analytics.decisionCounts.MORE_ADS,
                      barColor: "bg-[#D97706]",
                      cardBg: "bg-[#FFFBEB] border-[#FDE68A]",
                      textColor: "text-[#92400E]",
                    },
                    {
                      key: "FIX_FUNNEL_AUTOMATION",
                      title: "Opción C: Quitar formulario + WhatsApp",
                      votes: analytics.decisionCounts.FIX_FUNNEL_AUTOMATION,
                      barColor: "bg-[#059669]",
                      cardBg: "bg-[#ECFDF5] border-[#059669]",
                      textColor: "text-[#065F46]",
                    },
                  ].map((opt) => {
                    const pct =
                      analytics.totalDecisionVotes > 0
                        ? Math.round(
                            (opt.votes / analytics.totalDecisionVotes) * 100
                          )
                        : 0;
                    return (
                      <div
                        key={opt.key}
                        className={`rounded-xl border-2 ${opt.cardBg} p-3.5`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-bold text-[#0F172A]">
                            {opt.title}
                          </span>
                          <span
                            className={`font-display text-lg font-bold ${opt.textColor}`}
                          >
                            {pct}% ({opt.votes})
                          </span>
                        </div>
                        <div className="w-full h-3 bg-white rounded-md overflow-hidden border border-[#CBD5E1]">
                          <div
                            className={`h-full ${opt.barColor} origin-left transition-transform duration-500`}
                            style={{ transform: `scaleX(${pct / 100})` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[5px_5px_0px_#2563EB] space-y-2">
                  <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#1D4ED8]">
                    Dato 1 • Horario
                  </span>
                  <h4 className="font-display text-2xl font-bold text-[#0F172A]">
                    68% entraba de noche
                  </h4>
                  <p className="text-sm text-[#334155]">
                    La gente buscaba después de las 8 PM, pero la tienda solo
                    contestaba de 8 AM a 5 PM.
                  </p>
                </div>

                <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[5px_5px_0px_#DC2626] space-y-2">
                  <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-md bg-[#FEF2F2] text-[#991B1B]">
                    Dato 2 • Embudo
                  </span>
                  <h4 className="font-display text-2xl font-bold text-[#0F172A]">
                    620 cerraban la web
                  </h4>
                  <p className="text-sm text-[#334155]">
                    Se aburrían al ver el formulario obligatorio de 10 preguntas
                    antes de hablar por WhatsApp.
                  </p>
                  {analytics.cleanTabsCount > 0 && (
                    <p className="text-sm text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">
                      Si cada uno gasta como el promedio del salón (
                      {formatMiles(analytics.cleanAvgTabs)}), son{" "}
                      <strong className="font-display text-lg">
                        {formatMiles(analytics.lostMoneyClean)}
                      </strong>{" "}
                      al mes que se fueron a la competencia.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[5px_5px_0px_#059669] space-y-2">
                  <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#065F46]">
                    Dato 3 • Resultado
                  </span>
                  <h4 className="font-display text-2xl font-bold text-[#059669]">
                    De 15 a 68 ventas (+353%)
                  </h4>
                  <p className="text-sm text-[#334155]">
                    Con botón directo a WhatsApp 24/7 (respuesta en 8 segundos)
                    sin gastar más en anuncios.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* =========================================================
              FASE 3 (NEW): PHASE_3_SPEED ("Prueba de Paciencia")
          ========================================================= */}
          {state.current_phase === "PHASE_3_SPEED" && (
            <motion.div
              key="PHASE_3_SPEED"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto w-full space-y-6"
            >
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-[#2563EB]">
                  Prueba 2 • Velocidad y fugas de dinero
                </p>
                <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#0F172A]">
                  ¿Cuánto espera un cliente antes de irse?
                </h2>
              </div>

              <div className="rounded-3xl bg-white border-2 border-[#0F172A] p-6 sm:p-8 shadow-[8px_8px_0px_#0F172A]">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#475569]">
                      Respuestas en vivo
                    </p>
                    <div className="font-display text-4xl sm:text-5xl font-bold text-[#0F172A]">
                      {analytics.completedPhase3Count} de {analytics.total}
                    </div>
                  </div>
                  <span className="font-display text-5xl sm:text-6xl font-bold text-[#059669]">
                    {analytics.total > 0
                      ? Math.round(
                          (analytics.completedPhase3Count / analytics.total) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>

                <div className="w-full h-5 bg-[#F1F5F9] rounded-xl overflow-hidden border-2 border-[#0F172A] mb-6">
                  <div
                    className="h-full bg-[#059669] origin-left transition-transform duration-500"
                    style={{
                      transform: `scaleX(${
                        analytics.total > 0
                          ? Math.min(
                              1,
                              analytics.completedPhase3Count / analytics.total
                            )
                          : 0
                      })`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] p-5">
                    <div className="flex items-center gap-2 text-[#2563EB] font-bold text-sm mb-1.5">
                      <Zap className="w-5 h-5" />
                      <span>Pregunta 1: Tiempo de espera</span>
                    </div>
                    <p className="text-[#0F172A] font-bold text-xl">
                      Si escribes por WhatsApp para comprar algo, ¿cuánto tiempo
                      esperas antes de buscar otra tienda?
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] p-5">
                    <div className="flex items-center gap-2 text-[#DC2626] font-bold text-sm mb-1.5">
                      <ShoppingCart className="w-5 h-5" />
                      <span>Pregunta 2: Abandono de compra</span>
                    </div>
                    <p className="text-[#0F172A] font-bold text-xl">
                      ¿Qué es lo que más te hace arrepentirte cuando ya tenías
                      la tarjeta lista para pagar?
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* =========================================================
              FASE 3.5 (NEW): PHASE_3_RESULTS ("El Costo de la Lentitud")
          ========================================================= */}
          {state.current_phase === "PHASE_3_RESULTS" && (
            <motion.div
              key="PHASE_3_RESULTS"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
            >
              {/* Left (6 cols): Wait Tolerance Vertical Bars */}
              <div className="lg:col-span-6 rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[6px_6px_0px_#2563EB] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-[#2563EB]">
                      Paciencia del salón
                    </span>
                    <h3 className="font-display text-xl font-bold text-[#0F172A]">
                      ¿Cuánto esperan respuesta en WhatsApp?
                    </h3>
                  </div>
                  <Zap className="w-6 h-6 text-[#2563EB]" />
                </div>

                <div className="grid grid-cols-3 gap-4 items-end pt-6 pb-2 px-2 my-2 border-b-2 border-[#0F172A] h-48">
                  {[
                    {
                      key: "WAIT_5_MIN",
                      label: "5 a 10 min",
                      votes: analytics.waitCounts.WAIT_5_MIN,
                      bg: "bg-[#DC2626]",
                      badge: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
                    },
                    {
                      key: "WAIT_1_HOUR",
                      label: "1 a 2 horas",
                      votes: analytics.waitCounts.WAIT_1_HOUR,
                      bg: "bg-[#D97706]",
                      badge: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
                    },
                    {
                      key: "WAIT_24_HOURS",
                      label: "Al otro día",
                      votes: analytics.waitCounts.WAIT_24_HOURS,
                      bg: "bg-[#2563EB]",
                      badge: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
                    },
                  ].map((col) => {
                    const pct =
                      analytics.totalWaitVotes > 0
                        ? Math.round(
                            (col.votes / analytics.totalWaitVotes) * 100
                          )
                        : 0;
                    const heightPct = col.votes === 0 ? 0 : Math.max(14, pct);
                    return (
                      <div
                        key={col.key}
                        className="h-full flex flex-col items-center justify-end"
                      >
                        <div
                          className={`mb-1.5 px-2 py-0.5 rounded border text-xs font-bold ${col.badge}`}
                        >
                          {col.votes} ({pct}%)
                        </div>
                        <div className="w-full h-32 bg-[#F1F5F9] rounded-t-xl border-x-2 border-t-2 border-[#0F172A] flex items-end overflow-hidden p-1">
                          {col.votes > 0 && (
                            <motion.div
                              className={`w-full rounded-t-lg ${col.bg}`}
                              initial={{ height: "0%" }}
                              animate={{ height: `${heightPct}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold text-[#0F172A]">
                  <div>Máximo 10 min</div>
                  <div>1 a 2 horas</div>
                  <div>Al otro día</div>
                </div>
              </div>

              {/* Right (6 cols): Cart Abandonment Reasons + 5-Minute Rule */}
              <div className="lg:col-span-6 flex flex-col justify-between gap-4">
                <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[6px_6px_0px_#0F172A]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display text-xl font-bold text-[#0F172A]">
                      ¿Por qué abandonan la compra al final?
                    </h4>
                    <ShoppingCart className="w-5 h-5 text-[#DC2626]" />
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        key: "NO_FAST_SUPPORT",
                        label: "Nadie responde mis dudas rápido",
                        count: analytics.abandonCounts.NO_FAST_SUPPORT,
                        barColor: "bg-[#DC2626]",
                      },
                      {
                        key: "TOO_MANY_STEPS",
                        label: "Pedir cuenta y demasiados pasos",
                        count: analytics.abandonCounts.TOO_MANY_STEPS,
                        barColor: "bg-[#D97706]",
                      },
                      {
                        key: "SURPRISE_SHIPPING",
                        label: "Costos sorpresa al pagar",
                        count: analytics.abandonCounts.SURPRISE_SHIPPING,
                        barColor: "bg-[#2563EB]",
                      },
                    ].map((item) => {
                      const pct =
                        analytics.totalAbandonVotes > 0
                          ? Math.round(
                              (item.count / analytics.totalAbandonVotes) * 100
                            )
                          : 0;
                      return (
                        <div key={item.key} className="space-y-1">
                          <div className="flex justify-between text-sm font-bold text-[#0F172A]">
                            <span>{item.label}</span>
                            <span>
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-4 bg-[#F1F5F9] rounded-md overflow-hidden border border-[#CBD5E1]">
                            <div
                              className={`h-full ${item.barColor} origin-left transition-transform duration-500`}
                              style={{ transform: `scaleX(${pct / 100})` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#FEF2F2] border-2 border-[#DC2626] p-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-[#991B1B] block">
                      La regla de los 5 minutos
                    </span>
                    <p className="text-sm font-bold text-[#0F172A]">
                      Si tardas más de 5 minutos en responder un mensaje,
                      pierdes el 80% de probabilidad de vender.
                    </p>
                  </div>
                  <span className="font-display text-4xl font-bold text-[#DC2626] shrink-0">
                    -80%
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* =========================================================
              FASE 4 (NEW): PHASE_4_JOURNEY ("Psicología y Retención")
          ========================================================= */}
          {state.current_phase === "PHASE_4_JOURNEY" && (
            <motion.div
              key="PHASE_4_JOURNEY"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto w-full space-y-6"
            >
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-[#2563EB]">
                  Prueba 3 • Psicología del consumidor y retención
                </p>
                <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#0F172A]">
                  ¿Cómo decidimos realmente al comprar?
                </h2>
              </div>

              <div className="rounded-3xl bg-white border-2 border-[#0F172A] p-6 sm:p-8 shadow-[8px_8px_0px_#0F172A]">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#475569]">
                      Respuestas en vivo
                    </p>
                    <div className="font-display text-4xl sm:text-5xl font-bold text-[#0F172A]">
                      {analytics.completedPhase4Count} de {analytics.total}
                    </div>
                  </div>
                  <span className="font-display text-5xl sm:text-6xl font-bold text-[#059669]">
                    {analytics.total > 0
                      ? Math.round(
                          (analytics.completedPhase4Count / analytics.total) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>

                <div className="w-full h-5 bg-[#F1F5F9] rounded-xl overflow-hidden border-2 border-[#0F172A] mb-6">
                  <div
                    className="h-full bg-[#059669] origin-left transition-transform duration-500"
                    style={{
                      transform: `scaleX(${
                        analytics.total > 0
                          ? Math.min(
                              1,
                              analytics.completedPhase4Count / analytics.total
                            )
                          : 0
                      })`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] p-5">
                    <div className="flex items-center gap-2 text-[#2563EB] font-bold text-sm mb-1.5">
                      <ShieldCheck className="w-5 h-5" />
                      <span>Pregunta 1: Confianza</span>
                    </div>
                    <p className="text-[#0F172A] font-bold text-lg">
                      ¿Qué buscas primero para confiar en una tienda que no conoces?
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] p-5">
                    <div className="flex items-center gap-2 text-[#059669] font-bold text-sm mb-1.5">
                      <Truck className="w-5 h-5" />
                      <span>Pregunta 2: El dilema</span>
                    </div>
                    <p className="text-[#0F172A] font-bold text-lg">
                      $90.000 con envío gratis vs $78.000 + $9.000 de envío. ¿Cuál compras?
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] p-5">
                    <div className="flex items-center gap-2 text-[#D97706] font-bold text-sm mb-1.5">
                      <HeartHandshake className="w-5 h-5" />
                      <span>Pregunta 3: Retención</span>
                    </div>
                    <p className="text-[#0F172A] font-bold text-lg">
                      Si el producto te llegó bien, ¿qué te hace volver a comprar?
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* =========================================================
              FASE 4.5 (NEW): PHASE_4_RESULTS ("El Poder de lo Gratis")
          ========================================================= */}
          {state.current_phase === "PHASE_4_RESULTS" && (
            <motion.div
              key="PHASE_4_RESULTS"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
            >
              {/* Left Hero (7 cols): La Trampa del Envío Gratis */}
              <div className="lg:col-span-7 rounded-2xl bg-white border-2 border-[#0F172A] p-5 shadow-[6px_6px_0px_#059669] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-[#059669]">
                        Psicología económica en vivo
                      </span>
                      <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                        La trampa del "Envío Gratis"
                      </h3>
                    </div>
                    <Truck className="w-7 h-7 text-[#059669]" />
                  </div>

                  <div className="p-4 rounded-xl bg-[#FEF2F2] border-2 border-[#FECACA] my-3">
                    <div className="flex items-center gap-3">
                      <div className="font-display text-4xl sm:text-5xl font-bold text-[#DC2626] shrink-0">
                        {analytics.overpaidPct}%
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#991B1B]">
                          del salón prefirió pagar MÁS CARO por la palabra "GRATIS"
                        </p>
                        <p className="text-xs text-[#7F1D1D] mt-0.5">
                          Tienda A ($90.000) era $3.000 más costosa que Tienda B ($78.000 + $9.000 = $87.000).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Visual Option Comparison */}
                  <div className="space-y-3 pt-1">
                    {[
                      {
                        key: "FREE_SHIPPING",
                        title: "Tienda A: $90.000 con Envío Gratis",
                        sub: "Total a pagar: $90.000 (Más costoso)",
                        votes: analytics.shippingCounts.FREE_SHIPPING,
                        barColor: "bg-[#DC2626]",
                        badge: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
                        isTrick: true,
                      },
                      {
                        key: "PRICE_PLUS_SHIPPING",
                        title: "Tienda B: $78.000 + $9.000 envío",
                        sub: "Total a pagar: $87.000 (Ahorro de $3.000)",
                        votes: analytics.shippingCounts.PRICE_PLUS_SHIPPING,
                        barColor: "bg-[#2563EB]",
                        badge: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
                        isTrick: false,
                      },
                      {
                        key: "CALCULATE_TOTAL",
                        title: "Hizo la cuenta mental ($87k vs $90k)",
                        sub: "Comparó el precio final completo",
                        votes: analytics.shippingCounts.CALCULATE_TOTAL,
                        barColor: "bg-[#059669]",
                        badge: "bg-[#ECFDF5] text-[#065F46] border-[#6EE7B7]",
                        isTrick: false,
                      },
                    ].map((opt) => {
                      const pct =
                        analytics.totalShippingVotes > 0
                          ? Math.round(
                              (opt.votes / analytics.totalShippingVotes) * 100
                            )
                          : 0;
                      return (
                        <div
                          key={opt.key}
                          className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1]"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div>
                              <span className="text-sm font-bold text-[#0F172A]">
                                {opt.title}
                              </span>
                              <div className="text-xs text-[#475569]">
                                {opt.sub}
                              </div>
                            </div>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded border ${opt.badge}`}
                            >
                              {opt.votes} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-3.5 bg-white rounded-md overflow-hidden border border-[#CBD5E1] mt-1.5">
                            <div
                              className={`h-full ${opt.barColor} origin-left transition-transform duration-500`}
                              style={{ transform: `scaleX(${pct / 100})` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-[#ECFDF5] border border-[#6EE7B7] text-xs font-semibold text-[#065F46] flex items-center justify-between gap-3">
                  <span>
                    💡 <strong>Lección de negocio:</strong> El consumidor odia pagar por transporte. Si incluyes el envío en el precio, vendes más aunque cobres más.
                  </span>
                  {analytics.overpaidCount > 0 && (
                    <span className="shrink-0 font-bold bg-white px-2.5 py-1 rounded-lg border border-[#A7F3D0]">
                      +${formatNumber(analytics.overpaidMoneyTotal)} pagados de más
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side (5 cols): Confianza + Retención */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                {/* Confianza previa */}
                <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 shadow-[5px_5px_0px_#0F172A]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-display text-base font-bold text-[#0F172A]">
                      ¿Qué da confianza en una tienda nueva?
                    </h4>
                    <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        key: "REVIEWS",
                        label: "Reseñas y fotos de clientes",
                        count: analytics.trustCounts.REVIEWS,
                        color: "bg-[#2563EB]",
                      },
                      {
                        key: "WHATSAPP_CONTACT",
                        label: "Botón de WhatsApp directo",
                        count: analytics.trustCounts.WHATSAPP_CONTACT,
                        color: "bg-[#059669]",
                      },
                      {
                        key: "FOLLOWERS",
                        label: "Muchos seguidores en redes",
                        count: analytics.trustCounts.FOLLOWERS,
                        color: "bg-[#D97706]",
                      },
                      {
                        key: "PRICE_ONLY",
                        label: "Solo si es muy barato",
                        count: analytics.trustCounts.PRICE_ONLY,
                        color: "bg-[#DC2626]",
                      },
                    ].map((item) => {
                      const pct =
                        analytics.totalTrustVotes > 0
                          ? Math.round(
                              (item.count / analytics.totalTrustVotes) * 100
                            )
                          : 0;
                      return (
                        <div key={item.key} className="space-y-0.5">
                          <div className="flex justify-between text-xs font-bold text-[#0F172A]">
                            <span>{item.label}</span>
                            <span>
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-[#F1F5F9] rounded overflow-hidden border border-[#CBD5E1]">
                            <div
                              className={`h-full ${item.color} origin-left transition-transform duration-500`}
                              style={{ transform: `scaleX(${pct / 100})` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Retención */}
                <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 shadow-[5px_5px_0px_#0F172A]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-display text-base font-bold text-[#0F172A]">
                      ¿Qué hace que un cliente vuelva?
                    </h4>
                    <HeartHandshake className="w-5 h-5 text-[#D97706]" />
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        key: "GOOD_SERVICE",
                        label: "Atención rápida y amable",
                        count: analytics.returnCounts.GOOD_SERVICE,
                        color: "bg-[#059669]",
                      },
                      {
                        key: "NEXT_DISCOUNT",
                        label: "Cupón para la siguiente compra",
                        count: analytics.returnCounts.NEXT_DISCOUNT,
                        color: "bg-[#2563EB]",
                      },
                      {
                        key: "WHATSAPP_UPDATES",
                        label: "Avisos por WhatsApp de novedades",
                        count: analytics.returnCounts.WHATSAPP_UPDATES,
                        color: "bg-[#D97706]",
                      },
                      {
                        key: "CHEAPEST_ONLY",
                        label: "Solo quien tenga el menor precio",
                        count: analytics.returnCounts.CHEAPEST_ONLY,
                        color: "bg-[#64748B]",
                      },
                    ].map((item) => {
                      const pct =
                        analytics.totalReturnVotes > 0
                          ? Math.round(
                              (item.count / analytics.totalReturnVotes) * 100
                            )
                          : 0;
                      return (
                        <div key={item.key} className="space-y-0.5">
                          <div className="flex justify-between text-xs font-bold text-[#0F172A]">
                            <span>{item.label}</span>
                            <span>
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-[#F1F5F9] rounded overflow-hidden border border-[#CBD5E1]">
                            <div
                              className={`h-full ${item.color} origin-left transition-transform duration-500`}
                              style={{ transform: `scaleX(${pct / 100})` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Golden Metric Banner */}
                <div className="rounded-2xl bg-[#FFFBEB] border-2 border-[#F59E0B] p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#B45309] block uppercase tracking-wide">
                      Regla de Oro en E-commerce
                    </span>
                    <p className="text-xs font-bold text-[#78350F]">
                      Conseguir un cliente nuevo cuesta 5 veces más que hacer que uno existente vuelva a comprar.
                    </p>
                  </div>
                  <span className="font-display text-3xl font-bold text-[#B45309] shrink-0">
                    5x
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* =========================================================
              FASE 5: FINAL_PODIUM ("Conclusión y Cuadro de Honor")
          ========================================================= */}
          {state.current_phase === "FINAL_PODIUM" && (
            <motion.div
              key="FINAL_PODIUM"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <p className="text-sm font-bold text-[#2563EB]">
                    Resumen final
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A]">
                    4 lecciones que salvan negocios
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 flex items-center gap-4 shadow-[4px_4px_0px_#0F172A]">
                    <div className="h-11 w-11 rounded-xl bg-[#FEF2F2] border-2 border-[#DC2626] flex items-center justify-center text-[#DC2626] shrink-0 font-display font-bold text-xl">
                      1
                    </div>
                    <div>
                      <h4 className="font-display text-lg font-bold text-[#0F172A]">
                        No limpiar los datos erróneos
                      </h4>
                      <p className="text-sm text-[#334155]">
                        Un solo número exagerado distorsiona todo el promedio.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 flex items-center gap-4 shadow-[4px_4px_0px_#0F172A]">
                    <div className="h-11 w-11 rounded-xl bg-[#FFFBEB] border-2 border-[#D97706] flex items-center justify-center text-[#D97706] shrink-0 font-display font-bold text-xl">
                      2
                    </div>
                    <div>
                      <h4 className="font-display text-lg font-bold text-[#0F172A]">
                        No atender en los primeros 5 minutos ni de noche
                      </h4>
                      <p className="text-sm text-[#334155]">
                        El cliente compra de noche y si nadie le responde rápido, se va con la competencia.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 flex items-center gap-4 shadow-[4px_4px_0px_#0F172A]">
                    <div className="h-11 w-11 rounded-xl bg-[#ECFDF5] border-2 border-[#059669] flex items-center justify-center text-[#059669] shrink-0 font-display font-bold text-xl">
                      3
                    </div>
                    <div>
                      <h4 className="font-display text-lg font-bold text-[#0F172A]">
                        Decidir por corazonadas en vez de mirar datos
                      </h4>
                      <p className="text-sm text-[#334155]">
                        Bajar precios o gastar más en anuncios sin arreglar el embudo primero.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 flex items-center gap-4 shadow-[4px_4px_0px_#0F172A]">
                    <div className="h-11 w-11 rounded-xl bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center text-[#2563EB] shrink-0 font-display font-bold text-xl">
                      4
                    </div>
                    <div>
                      <h4 className="font-display text-lg font-bold text-[#0F172A]">
                        Ignorar la psicología del precio y descuidar la retención
                      </h4>
                      <p className="text-sm text-[#334155]">
                        El "envío gratis" vende más que bajar precios, y retener clientes cuesta 5 veces menos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-3xl bg-white border-4 border-[#0F172A] p-6 shadow-[8px_8px_0px_#059669]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-[#ECFDF5] border-2 border-[#059669] flex items-center justify-center text-[#059669]">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#059669]">
                        Cuadro de honor
                      </p>
                      <h3 className="font-display text-xl font-bold text-[#0F172A]">
                        Mejores Estrategas
                      </h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-[#ECFDF5] border border-[#6EE7B7] text-[#065F46] font-bold text-xs">
                    {analytics.dataDrivenWinners.length} ganadores
                  </span>
                </div>

                {analytics.dataDrivenWinners.length === 0 ? (
                  <div className="py-10 text-center text-[#475569] border-2 border-dashed border-[#CBD5E1] rounded-2xl text-sm">
                    Ningún participante votó por la Opción C todavía.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {analytics.dataDrivenWinners.map((winner, index) => (
                      <div
                        key={winner.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1]"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              index === 0
                                ? "bg-[#0F172A] text-white"
                                : "bg-[#E2E8F0] text-[#0F172A]"
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <ParticipantAvatar
                            avatarId={winner.avatar}
                            size="sm"
                          />
                          <div className="font-bold text-[#0F172A] text-sm">
                            {winner.nickname}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#ECFDF5] border border-[#6EE7B7] text-[#065F46] font-bold text-xs shrink-0">
                          {winner.score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FLOATING COLLAPSIBLE CONTROL BAR FOR PRESENTER */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl">
        {isControlsOpen ? (
          <div className="rounded-2xl bg-white/95 backdrop-blur-md border-2 border-[#0F172A] px-4 py-2 shadow-[4px_4px_0px_#0F172A] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPhase}
                disabled={currentPhaseIndex <= 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] disabled:opacity-40 disabled:pointer-events-none text-[#0F172A] font-bold text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <div className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A]">
                {PHASE_LABELS[state.current_phase]}
              </div>

              <button
                onClick={handleNextPhase}
                disabled={currentPhaseIndex >= PHASES_ORDER.length - 1}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleToggleCleaning}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  state.clean_outliers === 1
                    ? "bg-[#ECFDF5] border-[#059669] text-[#065F46]"
                    : "bg-white border-[#CBD5E1] text-[#0F172A] hover:border-[#0F172A]"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>
                  {state.clean_outliers === 1
                    ? "Datos limpios: Sí"
                    : "Limpiar datos"}
                </span>
              </button>

              <button
                onClick={() => sendAdminAction({ action: "SEED_DEMO" })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#059669] text-[#065F46] text-xs font-bold"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Demo 25</span>
              </button>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Seguro que deseas reiniciar la exposición y borrar los participantes?"
                    )
                  ) {
                    sendAdminAction({ action: "RESET_ALL" });
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#DC2626] text-[#991B1B] text-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>

              <button
                onClick={() => setIsControlsOpen(false)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Ocultar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setIsControlsOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold shadow-[4px_4px_0px_rgba(0,0,0,0.2)] hover:bg-[#1E293B] border-2 border-white"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Mostrar controles</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
