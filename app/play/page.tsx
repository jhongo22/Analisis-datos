"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExpoSync } from "@/hooks/useExpoSync";
import { AVATAR_LIST, ParticipantAvatar } from "@/components/Avatars";
import type {
  FormBehaviorType,
  ShoppingTimeType,
  ManagerDecisionType,
  WaitToleranceType,
  CartAbandonType,
  TrustSignalType,
  ShippingChoiceType,
  ReturnReasonType,
} from "@/lib/db";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  TrendingUp,
  Flame,
  Clock,
  MessageSquare,
  Layers,
  UserCheck,
  Zap,
  ShoppingCart,
  Truck,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
} from "lucide-react";

const STORAGE_ID_KEY = "expo_participant_id_v1";
const STORAGE_NAME_KEY = "expo_participant_nickname_v1";
const STORAGE_AVATAR_KEY = "expo_participant_avatar_v1";

function generateClientId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    "user-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now()
  );
}

export default function PlayPage() {
  const { state, participants, isConnected, refresh } = useExpoSync();

  const [participantId, setParticipantId] = useState<string>("");
  const [nicknameInput, setNicknameInput] = useState<string>("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("fox");
  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Phase 1 state
  const [tabsOpenInput, setTabsOpenInput] = useState<string>("");
  const [formBehavior, setFormBehavior] = useState<FormBehaviorType | null>(
    null
  );
  const [shoppingTime, setShoppingTime] = useState<ShoppingTimeType | null>(
    null
  );
  const [phase1Submitted, setPhase1Submitted] = useState<boolean>(false);

  // Phase 2 state
  const [selectedDecision, setSelectedDecision] =
    useState<ManagerDecisionType | null>(null);

  // Phase 3 state
  const [waitTolerance, setWaitTolerance] = useState<WaitToleranceType | null>(
    null
  );
  const [cartAbandonReason, setCartAbandonReason] =
    useState<CartAbandonType | null>(null);
  const [phase3Submitted, setPhase3Submitted] = useState<boolean>(false);

  // Phase 4 state
  const [trustSignal, setTrustSignal] = useState<TrustSignalType | null>(null);
  const [shippingChoice, setShippingChoice] =
    useState<ShippingChoiceType | null>(null);
  const [returnReason, setReturnReason] = useState<ReturnReasonType | null>(
    null
  );
  const [phase4Submitted, setPhase4Submitted] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let savedId = localStorage.getItem(STORAGE_ID_KEY);
    const savedName = localStorage.getItem(STORAGE_NAME_KEY);
    const savedAvatar = localStorage.getItem(STORAGE_AVATAR_KEY);
    if (!savedId) {
      savedId = generateClientId();
      localStorage.setItem(STORAGE_ID_KEY, savedId);
    }
    setParticipantId(savedId);
    if (savedName) setNicknameInput(savedName);
    if (savedAvatar) setSelectedAvatar(savedAvatar);
  }, []);

  const myRecord = useMemo(() => {
    if (!participantId) return undefined;
    return participants.find((p) => p.id === participantId);
  }, [participants, participantId]);

  const myRecordKey = myRecord
    ? [
        myRecord.id,
        myRecord.nickname,
        myRecord.avatar,
        myRecord.tabs_open,
        myRecord.form_behavior,
        myRecord.shopping_time,
        myRecord.manager_decision,
        myRecord.wait_tolerance,
        myRecord.cart_abandon_reason,
        myRecord.trust_signal,
        myRecord.shipping_choice,
        myRecord.return_reason,
      ].join("|")
    : "";
  const isRoomEmpty = participants.length === 0;

  useEffect(() => {
    if (myRecord) {
      if (!isEditingProfile) {
        setHasJoined(true);
      }
      if (myRecord.avatar && !isEditingProfile) {
        setSelectedAvatar(myRecord.avatar);
      }
      if (
        myRecord.tabs_open !== null &&
        myRecord.form_behavior !== null &&
        myRecord.shopping_time !== null
      ) {
        setPhase1Submitted(true);
        setTabsOpenInput(Math.round(Number(myRecord.tabs_open) * 1000).toLocaleString("es-CO"));
        setFormBehavior(myRecord.form_behavior);
        setShoppingTime(myRecord.shopping_time);
      } else {
        setPhase1Submitted(false);
      }

      if (myRecord.manager_decision) {
        setSelectedDecision(myRecord.manager_decision);
      } else {
        setSelectedDecision(null);
      }

      if (
        myRecord.wait_tolerance !== null &&
        myRecord.cart_abandon_reason !== null
      ) {
        setPhase3Submitted(true);
        setWaitTolerance(myRecord.wait_tolerance);
        setCartAbandonReason(myRecord.cart_abandon_reason);
      } else {
        setPhase3Submitted(false);
      }

      if (
        myRecord.trust_signal !== null &&
        myRecord.shipping_choice !== null &&
        myRecord.return_reason !== null
      ) {
        setPhase4Submitted(true);
        setTrustSignal(myRecord.trust_signal);
        setShippingChoice(myRecord.shipping_choice);
        setReturnReason(myRecord.return_reason);
      } else {
        setPhase4Submitted(false);
      }
    } else if (hasJoined && participants.length === 0) {
      setHasJoined(false);
      setIsEditingProfile(false);
      setPhase1Submitted(false);
      setSelectedDecision(null);
      setPhase3Submitted(false);
      setPhase4Submitted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myRecordKey, hasJoined, isEditingProfile, isRoomEmpty]);

  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nicknameInput.trim();
    if (!cleanName || !participantId) return;

    setIsSubmitting(true);
    try {
      localStorage.setItem(STORAGE_NAME_KEY, cleanName);
      localStorage.setItem(STORAGE_AVATAR_KEY, selectedAvatar);
      const res = await fetch("/api/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: participantId,
          nickname: cleanName,
          avatar: selectedAvatar,
        }),
      });
      if (res.ok) {
        setIsEditingProfile(false);
        setHasJoined(true);
        await refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPhase1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawDigits = tabsOpenInput.replace(/\D/g, "");
    if (
      rawDigits === "" ||
      !formBehavior ||
      !shoppingTime ||
      !participantId
    ) {
      return;
    }

    const tabsInThousands = Math.round((Number(rawDigits) / 1000) * 100) / 100;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: participantId,
          nickname: nicknameInput.trim() || "Participante",
          avatar: selectedAvatar,
          tabs_open: tabsInThousands,
          form_behavior: formBehavior,
          shopping_time: shoppingTime,
        }),
      });
      if (res.ok) {
        setPhase1Submitted(true);
        await refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteDecision = async (decision: ManagerDecisionType) => {
    if (!participantId) return;
    setSelectedDecision(decision);
    setIsSubmitting(true);
    try {
      await fetch("/api/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: participantId,
          nickname: nicknameInput.trim() || "Participante",
          avatar: selectedAvatar,
          manager_decision: decision,
        }),
      });
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPhase3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitTolerance || !cartAbandonReason || !participantId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: participantId,
          nickname: nicknameInput.trim() || "Participante",
          avatar: selectedAvatar,
          wait_tolerance: waitTolerance,
          cart_abandon_reason: cartAbandonReason,
        }),
      });
      if (res.ok) {
        setPhase3Submitted(true);
        await refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPhase4 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trustSignal || !shippingChoice || !returnReason || !participantId)
      return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: participantId,
          nickname: nicknameInput.trim() || "Participante",
          avatar: selectedAvatar,
          trust_signal: trustSignal,
          shipping_choice: shippingChoice,
          return_reason: returnReason,
        }),
      });
      if (res.ok) {
        setPhase4Submitted(true);
        await refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMyTabAnOutlier =
    myRecord?.tabs_open !== null &&
    myRecord?.tabs_open !== undefined &&
    (Number(myRecord.tabs_open) < 0 || Number(myRecord.tabs_open) > 500); // > $500.000/mes = exagerado para $2M

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between max-w-md mx-auto border-x border-[#E2E8F0] shadow-sm relative">
      {/* Top Mobile Status Bar */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ParticipantAvatar
            avatarId={myRecord?.avatar || selectedAvatar}
            size="sm"
          />
          <div>
            <span className="text-[11px] font-semibold text-[#2563EB] block">
              Participante en vivo
            </span>
            <h1 className="font-display text-sm font-bold text-[#0F172A] truncate max-w-[160px]">
              {hasJoined && !isEditingProfile
                ? myRecord?.nickname || nicknameInput
                : "Elige tu personaje"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {myRecord && (
            <span className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] font-bold text-xs">
              {myRecord.score} pts
            </span>
          )}
          <span
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
              isConnected
                ? "bg-[#ECFDF5] border-[#6EE7B7] text-[#065F46]"
                : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
            }`}
          >
            {isConnected ? "En línea" : "Reconectando"}
          </span>
        </div>
      </header>

      {/* Main Dynamic Mobile Screen */}
      <main className="flex-1 p-5 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {!hasJoined || isEditingProfile ? (
            <motion.div
              key="REGISTER"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#2563EB]">
                  {isEditingProfile
                    ? "Actualiza tu perfil"
                    : "Bienvenido al experimento en vivo"}
                </p>
                <h2 className="font-display text-2xl font-bold text-[#0F172A]">
                  Elige tu personaje y tu nombre
                </h2>
              </div>

              <form
                onSubmit={handleJoinLobby}
                className="rounded-2xl bg-white border-2 border-[#0F172A] p-5 space-y-5 shadow-[6px_6px_0px_#0F172A]"
              >
                {/* Kahoot-style Avatar Picker */}
                <div>
                  <label className="block text-sm font-bold text-[#0F172A] mb-2.5">
                    1. Toca un personaje
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {AVATAR_LIST.map((av) => {
                      const active = selectedAvatar === av.id;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setSelectedAvatar(av.id)}
                          className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 transition-transform ${
                            active
                              ? "border-[#0F172A] bg-[#EFF6FF] scale-105 shadow-[3px_3px_0px_#0F172A]"
                              : "border-[#E2E8F0] bg-[#F8FAFC] opacity-80 hover:opacity-100"
                          }`}
                        >
                          <div
                            className="w-12 h-12 rounded-full p-1 border"
                            style={{
                              backgroundColor: av.bg,
                              borderColor: av.border,
                            }}
                          >
                            {av.svg}
                          </div>
                          <span className="text-[10px] font-bold text-[#0F172A] truncate w-full text-center">
                            {av.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="nickname-input"
                    className="block text-sm font-bold text-[#0F172A] mb-2"
                  >
                    2. Escribe tu nombre o apodo
                  </label>
                  <input
                    id="nickname-input"
                    type="text"
                    required
                    maxLength={24}
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="Ej. Camila"
                    className="w-full rounded-xl bg-[#F8FAFC] border-2 border-[#CBD5E1] focus:border-[#0F172A] px-4 py-3 text-base font-semibold text-[#0F172A] placeholder:text-[#64748B] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  {isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-3.5 rounded-xl bg-[#F1F5F9] text-[#0F172A] font-bold text-sm border-2 border-[#CBD5E1]"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || !nicknameInput.trim()}
                    className="flex-1 min-h-[48px] py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-base border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A] flex items-center justify-center gap-2"
                  >
                    <span>
                      {isEditingProfile ? "Guardar cambios" : "Entrar a la sala"}
                    </span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <>
              {/* FASE 0: LOBBY WAITING SCREEN */}
              {state.current_phase === "LOBBY" && (
                <motion.div
                  key="LOBBY_WAIT"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-3xl bg-white border-2 border-[#0F172A] p-6 text-center space-y-4 shadow-[6px_6px_0px_#0F172A]"
                >
                  <div className="flex justify-center">
                    <ParticipantAvatar
                      avatarId={myRecord?.avatar || selectedAvatar}
                      size="xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#059669] text-xs font-bold">
                      <UserCheck className="w-4 h-4" />
                      <span>Ya estás en la pantalla del salón</span>
                    </div>
                    <h2 className="font-display text-3xl font-bold text-[#0F172A]">
                      ¡Hola, {myRecord?.nickname || nicknameInput}!
                    </h2>
                    <p className="text-sm text-[#334155]">
                      Mira tu personaje en el proyector. Tu teléfono cambiará de
                      pantalla automáticamente cuando empiece la primera
                      pregunta.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="px-4 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] transition-colors"
                  >
                    Cambiar mi personaje o nombre
                  </button>
                </motion.div>
              )}

              {/* FASE 1: PHASE_1_SURVEY */}
              {state.current_phase === "PHASE_1_SURVEY" && (
                <motion.div
                  key="PHASE_1_SURVEY"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  {phase1Submitted ? (
                    <div className="rounded-3xl bg-white border-2 border-[#0F172A] p-6 text-center space-y-4 shadow-[6px_6px_0px_#059669]">
                      <CheckCircle2 className="w-14 h-14 text-[#059669] mx-auto" />
                      <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                        ¡Respuestas enviadas! (+20 pts)
                      </h3>
                      <p className="text-base text-[#334155]">
                        Dijiste que gastas{" "}
                        <strong className="text-[#0F172A]">
                          ${myRecord?.tabs_open !== null && myRecord?.tabs_open !== undefined
                            ? Math.round(Number(myRecord.tabs_open) * 1000).toLocaleString("es-CO")
                            : "0"} al mes
                        </strong>{" "}
                        en compras por internet. En breve veremos los resultados del salón.
                      </p>
                      <button
                        onClick={() => setPhase1Submitted(false)}
                        className="text-sm font-bold text-[#2563EB] underline"
                      >
                        Corregir mi respuesta
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitPhase1} className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-[#2563EB]">
                          Prueba 1: Tus hábitos al comprar
                        </p>
                        <h2 className="font-display text-2xl font-bold text-[#0F172A]">
                          Responde estas 3 preguntas rápidas
                        </h2>
                      </div>

                      {/* Pregunta 1 */}
                      <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB]">
                          <Layers className="w-4 h-4" />
                          <span>Pregunta 1</span>
                        </div>
                        <label
                          htmlFor="tabs-input"
                          className="block text-base font-bold text-[#0F172A]"
                        >
                          ¿Cuánto gastas al mes en compras por internet?
                        </label>
                        <p className="text-xs font-semibold text-[#475569]">
                          Ingresa el monto en pesos (los puntos se colocan automáticamente).
                        </p>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-[#475569]">
                            $
                          </span>
                          <input
                            id="tabs-input"
                            type="text"
                            
                            inputMode="numeric"
                            required
                            value={tabsOpenInput}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "");
                              if (!digits) {
                                setTabsOpenInput("");
                              } else {
                                setTabsOpenInput(
                                  Number(digits).toLocaleString("es-CO")
                                );
                              }
                            }}
                            placeholder="Ej: 300.000 (o 5.000.000)"
                            className="w-full rounded-xl bg-[#F8FAFC] border-2 border-[#CBD5E1] focus:border-[#0F172A] pl-8 pr-14 py-3 text-base font-bold text-[#0F172A] focus:outline-none"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#475569]">
                            COP
                          </span>
                        </div>
                      </div>

                      {/* Pregunta 2 */}
                      <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#059669]">
                          <MessageSquare className="w-4 h-4" />
                          <span>Pregunta 2</span>
                        </div>
                        <p className="text-base font-bold text-[#0F172A]">
                          Si una web te pide llenar un formulario largo de 10
                          preguntas, ¿qué haces?
                        </p>
                        <div className="space-y-2 pt-1">
                          {[
                            {
                              id: "FILL_PATIENTLY" as FormBehaviorType,
                              label: "Lo lleno completo con paciencia.",
                            },
                            {
                              id: "ABANDON" as FormBehaviorType,
                              label: "Me da pereza y salgo de la página.",
                            },
                            {
                              id: "PREFER_WHATSAPP" as FormBehaviorType,
                              label:
                                "Prefiero tocar el botón de WhatsApp rápido.",
                            },
                          ].map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setFormBehavior(opt.id)}
                              className={`w-full min-h-[48px] text-left p-3.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                                formBehavior === opt.id
                                  ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E3A8A]"
                                  : "bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pregunta 3 */}
                      <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#D97706]">
                          <Clock className="w-4 h-4" />
                          <span>Pregunta 3</span>
                        </div>
                        <p className="text-base font-bold text-[#0F172A]">
                          ¿A qué hora sueles buscar o comprar más cosas por
                          internet?
                        </p>
                        <div className="space-y-2 pt-1">
                          {[
                            {
                              id: "MORNING" as ShoppingTimeType,
                              label: "Por la mañana (8:00 am - 12:00 pm)",
                            },
                            {
                              id: "AFTERNOON" as ShoppingTimeType,
                              label: "Por la tarde (12:00 pm - 6:00 pm)",
                            },
                            {
                              id: "NIGHT" as ShoppingTimeType,
                              label: "Por la noche (Después de las 8:00 pm)",
                            },
                          ].map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setShoppingTime(opt.id)}
                              className={`w-full min-h-[48px] text-left p-3.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                                shoppingTime === opt.id
                                  ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E3A8A]"
                                  : "bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          tabsOpenInput === "" ||
                          !formBehavior ||
                          !shoppingTime
                        }
                        className="w-full min-h-[52px] py-4 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white font-bold text-base border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A]"
                      >
                        Enviar mis respuestas
                      </button>
                    </form>
                  )}
                </motion.div>
              )}

              {/* FASE 1.5: PHASE_1_RESULTS */}
              {state.current_phase === "PHASE_1_RESULTS" && (
                <motion.div
                  key="PHASE_1_RESULTS"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <div
                    className={`rounded-3xl bg-white p-6 border-2 border-[#0F172A] space-y-4 ${
                      state.clean_outliers === 0
                        ? "shadow-[6px_6px_0px_#DC2626]"
                        : "shadow-[6px_6px_0px_#059669]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle
                        className={`w-8 h-8 shrink-0 ${
                          state.clean_outliers === 0
                            ? "text-[#DC2626]"
                            : "text-[#059669]"
                        }`}
                      />
                      <div>
                        <span className="text-xs font-bold text-[#475569]">
                          {state.clean_outliers === 0
                            ? "Datos sin revisar"
                            : "Datos corregidos"}
                        </span>
                        <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                          Mira la pantalla principal
                        </h3>
                      </div>
                    </div>

                    <p className="text-base text-[#334155] leading-relaxed">
                      {state.clean_outliers === 0 ? (
                        <>
                          Basta con que{" "}
                          <strong className="text-[#DC2626]">
                            una sola persona anote un número exagerado
                          </strong>{" "}
                          para dañar todo el promedio del salón si nadie lo
                          corrige.
                        </>
                      ) : (
                        <>
                          Al{" "}
                          <strong className="text-[#059669]">
                            filtrar los números exagerados
                          </strong>
                          , el promedio del proyector ahora sí muestra la verdad
                          del grupo.
                        </>
                      )}
                    </p>

                    {isMyTabAnOutlier && (
                      <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B] font-bold">
                        ¡Tú pusiste un número exagerado (${myRecord?.tabs_open !== null && myRecord?.tabs_open !== undefined
                          ? Math.round(Number(myRecord.tabs_open) * 1000).toLocaleString("es-CO")
                          : "0"}{" "}
                        ! Buen ejemplo de cómo se daña un reporte.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* FASE 2: PHASE_2_SIMULATOR */}
              {state.current_phase === "PHASE_2_SIMULATOR" && (
                <motion.div
                  key="PHASE_2_SIMULATOR"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 space-y-1.5">
                    <span className="text-xs font-bold text-[#2563EB]">
                      Prueba 4: Tú eres el gerente
                    </span>
                    <p className="text-sm text-[#334155] leading-relaxed">
                      Gastas <strong>$2.000.000</strong> en anuncios. Entran{" "}
                      <strong>1.000 personas</strong>, pero solo{" "}
                      <strong>15 compran</strong>. ¿Qué haces?
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        id: "LOWER_PRICE" as ManagerDecisionType,
                        badge: "Opción A: Bajar precios",
                        title: "Hacer un descuento del 15% en todo.",
                      },
                      {
                        id: "MORE_ADS" as ManagerDecisionType,
                        badge: "Opción B: Más publicidad",
                        title:
                          "Pagar el doble en anuncios para traer más visitas.",
                      },
                      {
                        id: "FIX_FUNNEL_AUTOMATION" as ManagerDecisionType,
                        badge: "Opción C: Mirar los datos",
                        title:
                          "Quitar el formulario largo y atender por WhatsApp de noche.",
                      },
                    ].map((card) => {
                      const isSelected = selectedDecision === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleVoteDecision(card.id)}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
                            isSelected
                              ? "bg-[#EFF6FF] border-[#2563EB] shadow-[4px_4px_0px_#2563EB]"
                              : "bg-white border-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#475569]">
                              {card.badge}
                            </span>
                            {isSelected && (
                              <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Tu voto
                              </span>
                            )}
                          </div>
                          <div className="text-base font-bold text-[#0F172A] leading-snug">
                            {card.title}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* FASE 2.5: PHASE_2_REVEAL */}
              {state.current_phase === "PHASE_2_REVEAL" && (
                <motion.div
                  key="PHASE_2_REVEAL"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {selectedDecision === "FIX_FUNNEL_AUTOMATION" ? (
                    <div className="rounded-3xl bg-[#ECFDF5] border-2 border-[#059669] p-5 space-y-2">
                      <div className="flex items-center gap-2 text-[#065F46] font-bold text-sm">
                        <TrendingUp className="w-5 h-5" />
                        <span>¡Salvaste la empresa! (+100 pts)</span>
                      </div>
                      <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                        Decisión con datos
                      </h3>
                      <p className="text-sm text-[#334155]">
                        Pasaste de 15 a 68 ventas sin regalar descuentos ni
                        gastar más en anuncios.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-[#FEF2F2] border-2 border-[#DC2626] p-5 space-y-2">
                      <div className="flex items-center gap-2 text-[#991B1B] font-bold text-sm">
                        <Flame className="w-5 h-5" />
                        <span>Perdiste dinero (+20 pts)</span>
                      </div>
                      <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                        Caíste en la trampa de adivinar
                      </h3>
                      <p className="text-sm text-[#334155]">
                        El problema no era el precio ni los anuncios: era el
                        formulario largo y no contestar de noche.
                      </p>
                    </div>
                  )}
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
                  className="space-y-4"
                >
                  {phase3Submitted ? (
                    <div className="rounded-3xl bg-white border-2 border-[#0F172A] p-6 text-center space-y-4 shadow-[6px_6px_0px_#059669]">
                      <CheckCircle2 className="w-14 h-14 text-[#059669] mx-auto" />
                      <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                        ¡Respuestas listas! (+30 pts)
                      </h3>
                      <p className="text-sm text-[#334155]">
                        Mira el proyector para descubrir cuánto dinero pierden
                        los negocios por tardar en responder.
                      </p>
                      <button
                        onClick={() => setPhase3Submitted(false)}
                        className="text-sm font-bold text-[#2563EB] underline"
                      >
                        Cambiar respuesta
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitPhase3} className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-[#2563EB]">
                          Prueba 2: La velocidad de respuesta
                        </p>
                        <h2 className="font-display text-2xl font-bold text-[#0F172A]">
                          ¿Cuánta paciencia tienes como cliente?
                        </h2>
                      </div>

                      {/* Pregunta Paciencia */}
                      <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB]">
                          <Zap className="w-4 h-4" />
                          <span>Pregunta 1</span>
                        </div>
                        <p className="text-base font-bold text-[#0F172A]">
                          Escribes por WhatsApp a una tienda para comprar algo.
                          ¿Cuánto tiempo esperas antes de buscar en otro lado?
                        </p>
                        <div className="space-y-2 pt-1">
                          {[
                            {
                              id: "WAIT_5_MIN" as WaitToleranceType,
                              label: "Máximo 5 a 10 minutos.",
                            },
                            {
                              id: "WAIT_1_HOUR" as WaitToleranceType,
                              label: "Espero hasta 1 o 2 horas.",
                            },
                            {
                              id: "WAIT_24_HOURS" as WaitToleranceType,
                              label: "No me importa si responden al otro día.",
                            },
                          ].map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setWaitTolerance(opt.id)}
                              className={`w-full min-h-[48px] text-left p-3.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                                waitTolerance === opt.id
                                  ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E3A8A]"
                                  : "bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pregunta Abandono */}
                      <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#DC2626]">
                          <ShoppingCart className="w-4 h-4" />
                          <span>Pregunta 2</span>
                        </div>
                        <p className="text-base font-bold text-[#0F172A]">
                          ¿Qué es lo que más te hace arrepentirte cuando ya ibas
                          a pagar?
                        </p>
                        <div className="space-y-2 pt-1">
                          {[
                            {
                              id: "NO_FAST_SUPPORT" as CartAbandonType,
                              label: "Tener una duda y que nadie me responda.",
                            },
                            {
                              id: "TOO_MANY_STEPS" as CartAbandonType,
                              label: "Que me pidan crear cuenta y mil pasos.",
                            },
                            {
                              id: "SURPRISE_SHIPPING" as CartAbandonType,
                              label: "Costos sorpresa al final del pago.",
                            },
                          ].map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setCartAbandonReason(opt.id)}
                              className={`w-full min-h-[48px] text-left p-3.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                                cartAbandonReason === opt.id
                                  ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E3A8A]"
                                  : "bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          isSubmitting || !waitTolerance || !cartAbandonReason
                        }
                        className="w-full min-h-[52px] py-4 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white font-bold text-base border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A]"
                      >
                        Enviar respuestas
                      </button>
                    </form>
                  )}
                </motion.div>
              )}

              {/* FASE 3.5: PHASE_3_RESULTS */}
              {state.current_phase === "PHASE_3_RESULTS" && (
                <motion.div
                  key="PHASE_3_RESULTS"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="rounded-3xl bg-white border-2 border-[#0F172A] p-6 space-y-3 shadow-[6px_6px_0px_#2563EB]">
                    <span className="text-xs font-bold text-[#2563EB]">
                      Regla de los 5 minutos
                    </span>
                    <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                      El cliente que espera, se va con la competencia
                    </h3>
                    <p className="text-sm text-[#334155]">
                      Después de 5 minutos sin respuesta, la probabilidad de
                      cerrar una venta cae un <strong>80%</strong>.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* =========================================================
                  FASE 4: PHASE_4_JOURNEY ("PsicologÃ­a y RetenciÃ³n")
              ========================================================= */}
              {state.current_phase === "PHASE_4_JOURNEY" && (
                <motion.div
                  key="PHASE_4_JOURNEY"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {phase4Submitted ? (
                    <div className="rounded-3xl bg-white border-2 border-[#0F172A] p-6 text-center space-y-4 shadow-[6px_6px_0px_#059669]">
                      <CheckCircle2 className="w-14 h-14 text-[#059669] mx-auto" />
                      <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                        Â¡Respuestas listas! (+30 pts)
                      </h3>
                      <p className="text-sm text-[#334155]">
                        Mira el proyector para descubrir la trampa del envÃ­o gratis y el verdadero secreto de la retenciÃ³n.
                      </p>
                      <button
                        onClick={() => setPhase4Submitted(false)}
                        className="text-sm font-bold text-[#2563EB] underline"
                      >
                        Cambiar respuesta
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitPhase4} className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-[#2563EB]">
                          Prueba 3: Psicología y retención del cliente
                        </p>
                        <h2 className="font-display text-2xl font-bold text-[#0F172A]">
                          ¿Cómo decides tú al comprar?
                        </h2>
                      </div>

                      {/* Pregunta 1: Confianza previa */}
                      <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB]">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Pregunta 1: Confianza</span>
                        </div>
                        <p className="text-base font-bold text-[#0F172A]">
                          Vas a comprar en una tienda online nueva que nunca habÃ­as visto. Â¿QuÃ© es lo PRIMERO que buscas para confiar?
                        </p>
                        <div className="space-y-2 pt-1">
                          {[
                            {
                              id: "REVIEWS" as TrustSignalType,
                              label: "Opiniones, fotos y reseÃ±as de otros clientes.",
                            },
                            {
                              id: "WHATSAPP_CONTACT" as TrustSignalType,
                              label: "Que tengan botÃ³n de WhatsApp para hablar con alguien.",
                            },
                            {
                              id: "FOLLOWERS" as TrustSignalType,
                              label: "Que tengan miles de seguidores y publicaciones activas.",
                            },
                            {
                              id: "PRICE_ONLY" as TrustSignalType,
                              label: "Solo el precio: si estÃ¡ muy barato, me arriesgo.",
                            },
                          ].map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setTrustSignal(opt.id)}
                              className={`w-full min-h-[48px] text-left p-3.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                                trustSignal === opt.id
                                  ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E3A8A]"
                                  : "bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pregunta 2: PsicologÃ­a del EnvÃ­o */}
                      <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#059669]">
                          <Truck className="w-4 h-4" />
                          <span>Pregunta 2: El dilema del envÃ­o</span>
                        </div>
                        <p className="text-base font-bold text-[#0F172A]">
                          Vas a comprar exactamente los mismos audÃ­fonos. Â¿En cuÃ¡l de estas tiendas compras?
                        </p>
                        <div className="space-y-2 pt-1">
                          {[
                            {
                              id: "FREE_SHIPPING" as ShippingChoiceType,
                              badge: "Tienda A",
                              title: "$90.000 con Â¡ENVÃO GRATIS!",
                              desc: "Un solo precio cerrado sin sorpresas.",
                            },
                            {
                              id: "PRICE_PLUS_SHIPPING" as ShippingChoiceType,
                              badge: "Tienda B",
                              title: "$78.000 + $9.000 de envÃ­o",
                              desc: "Producto mÃ¡s econÃ³mico por separado.",
                            },
                            {
                              id: "CALCULATE_TOTAL" as ShippingChoiceType,
                              badge: "Calculador",
                              title: "Hago la cuenta: $78k + $9k = $87.000",
                              desc: "Elijo la opciÃ³n mÃ¡s barata en total.",
                            },
                          ].map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setShippingChoice(opt.id)}
                              className={`w-full text-left p-3.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                                shippingChoice === opt.id
                                  ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E3A8A]"
                                  : "bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-[#CBD5E1] font-bold text-[#0F172A]">
                                  {opt.badge}
                                </span>
                              </div>
                              <div className="text-base font-bold text-[#0F172A]">
                                {opt.title}
                              </div>
                              <div className="text-xs font-normal text-[#475569] mt-0.5">
                                {opt.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pregunta 3: RetenciÃ³n */}
                      <div className="rounded-2xl bg-white border-2 border-[#0F172A] p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#D97706]">
                          <HeartHandshake className="w-4 h-4" />
                          <span>Pregunta 3: RetenciÃ³n</span>
                        </div>
                        <p className="text-base font-bold text-[#0F172A]">
                          Ya compraste y el producto te llegÃ³ sÃºper bien. Â¿QuÃ© te motivarÃ­a a volver a comprar en esa misma tienda?
                        </p>
                        <div className="space-y-2 pt-1">
                          {[
                            {
                              id: "GOOD_SERVICE" as ReturnReasonType,
                              label: "Que la atenciÃ³n haya sido rÃ¡pida, confiable y amable.",
                            },
                            {
                              id: "NEXT_DISCOUNT" as ReturnReasonType,
                              label: "Un cupÃ³n de 15% de descuento para mi siguiente compra.",
                            },
                            {
                              id: "WHATSAPP_UPDATES" as ReturnReasonType,
                              label: "Que me avisen por WhatsApp cuando lleguen novedades que me gusten.",
                            },
                            {
                              id: "CHEAPEST_ONLY" as ReturnReasonType,
                              label: "Nada; la prÃ³xima vez busco de nuevo quiÃ©n lo tenga mÃ¡s barato.",
                            },
                          ].map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setReturnReason(opt.id)}
                              className={`w-full min-h-[48px] text-left p-3.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                                returnReason === opt.id
                                  ? "bg-[#EFF6FF] border-[#2563EB] text-[#1E3A8A]"
                                  : "bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          !trustSignal ||
                          !shippingChoice ||
                          !returnReason
                        }
                        className="w-full min-h-[52px] py-4 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white font-bold text-base border-2 border-[#0F172A] shadow-[4px_4px_0px_#0F172A]"
                      >
                        Enviar respuestas (+30 pts)
                      </button>
                    </form>
                  )}
                </motion.div>
              )}

              {/* FASE 4.5: PHASE_4_RESULTS */}
              {state.current_phase === "PHASE_4_RESULTS" && (
                <motion.div
                  key="PHASE_4_RESULTS"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="rounded-3xl bg-white border-2 border-[#0F172A] p-6 space-y-3 shadow-[6px_6px_0px_#059669]">
                    <span className="text-xs font-bold text-[#059669]">
                      PsicologÃ­a del consumidor
                    </span>
                    <h3 className="font-display text-2xl font-bold text-[#0F172A]">
                      El poder de lo "GRATIS"
                    </h3>
                    <p className="text-sm text-[#334155] leading-relaxed">
                      Mira la pantalla del proyector: descubre cuÃ¡ntas personas prefirieron pagar <strong>mÃ¡s caro</strong> solo por no ver el cobro de envÃ­o por separado, y por quÃ© retener a un cliente cuesta 5 veces menos.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* FASE 5: FINAL_PODIUM */}
              {state.current_phase === "FINAL_PODIUM" && (
                <motion.div
                  key="FINAL_PODIUM"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <div className="rounded-3xl bg-white p-6 border-2 border-[#0F172A] text-center space-y-4 shadow-[8px_8px_0px_#0F172A]">
                    <div className="flex justify-center">
                      <ParticipantAvatar
                        avatarId={myRecord?.avatar || selectedAvatar}
                        size="xl"
                      />
                    </div>

                    <div>
                      <span className="text-xs font-bold text-[#2563EB]">
                        Tu resultado final
                      </span>
                      <h2 className="font-display text-2xl font-bold text-[#0F172A] mt-1">
                        {selectedDecision === "FIX_FUNNEL_AUTOMATION"
                          ? "Gerente Estratega con Datos"
                          : "Gerente por Corazonadas"}
                      </h2>
                      <p className="text-sm text-[#475569] mt-1">
                        {myRecord?.nickname || nicknameInput} •{" "}
                        <strong className="text-[#059669]">
                          {myRecord?.score ?? 0} puntos
                        </strong>
                      </p>
                    </div>

                    <p className="text-sm text-[#334155] leading-relaxed bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4">
                      {selectedDecision === "FIX_FUNNEL_AUTOMATION"
                        ? "¡Felicitaciones! Usaste los datos reales para facilitar la compra y atender rápido."
                        : "Hoy vimos que adivinar sale caro: antes de bajar precios o pagar más anuncios, hay que mirar los datos."}
                    </p>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
