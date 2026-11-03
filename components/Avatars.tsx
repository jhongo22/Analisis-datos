import React from "react";

export interface AvatarConfig {
  id: string;
  name: string;
  bg: string;
  border: string;
  svg: React.ReactNode;
}

export const AVATAR_LIST: AvatarConfig[] = [
  {
    id: "fox",
    name: "Zorro Astuto",
    bg: "#FFEDD5",
    border: "#EA580C",
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <polygon points="10,10 26,22 14,34" fill="#EA580C" />
        <polygon points="54,10 38,22 50,34" fill="#EA580C" />
        <circle cx="32" cy="36" r="18" fill="#F97316" />
        <polygon points="16,38 32,54 48,38 40,34 24,34" fill="#FFF7ED" />
        <circle cx="25" cy="33" r="3" fill="#0F172A" />
        <circle cx="39" cy="33" r="3" fill="#0F172A" />
        <circle cx="32" cy="44" r="3.5" fill="#0F172A" />
      </svg>
    ),
  },
  {
    id: "robot",
    name: "Bot Analítico",
    bg: "#DBEAFE",
    border: "#2563EB",
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <line x1="32" y1="8" x2="32" y2="18" stroke="#2563EB" strokeWidth="4" />
        <circle cx="32" cy="8" r="4" fill="#EF4444" />
        <rect x="14" y="18" width="36" height="32" rx="8" fill="#3B82F6" />
        <rect x="20" y="25" width="24" height="10" rx="4" fill="#EFF6FF" />
        <circle cx="26" cy="30" r="3" fill="#1D4ED8" />
        <circle cx="38" cy="30" r="3" fill="#1D4ED8" />
        <rect x="24" y="41" width="16" height="4" rx="2" fill="#EFF6FF" />
      </svg>
    ),
  },
  {
    id: "cat",
    name: "Gato Curioso",
    bg: "#FCE7F3",
    border: "#DB2777",
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <polygon points="14,12 28,22 14,32" fill="#EC4899" />
        <polygon points="50,12 36,22 50,32" fill="#EC4899" />
        <circle cx="32" cy="36" r="18" fill="#F472B6" />
        <circle cx="25" cy="33" r="3" fill="#0F172A" />
        <circle cx="39" cy="33" r="3" fill="#0F172A" />
        <polygon points="29,39 35,39 32,43" fill="#9D174D" />
        <path d="M26,45 Q32,49 38,45" stroke="#9D174D" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
  {
    id: "panda",
    name: "Panda Zen",
    bg: "#ECFDF5",
    border: "#059669",
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="16" cy="18" r="7" fill="#0F172A" />
        <circle cx="48" cy="18" r="7" fill="#0F172A" />
        <circle cx="32" cy="36" r="18" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
        <ellipse cx="24" cy="34" rx="5" ry="6" fill="#0F172A" />
        <ellipse cx="40" cy="34" rx="5" ry="6" fill="#0F172A" />
        <circle cx="24" cy="33" r="2" fill="#FFFFFF" />
        <circle cx="40" cy="33" r="2" fill="#FFFFFF" />
        <ellipse cx="32" cy="42" rx="4" ry="2.5" fill="#0F172A" />
      </svg>
    ),
  },
  {
    id: "owl",
    name: "Búho Sabio",
    bg: "#FEF3C7",
    border: "#D97706",
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="36" r="19" fill="#D97706" />
        <circle cx="24" cy="32" r="7" fill="#FFFFFF" />
        <circle cx="40" cy="32" r="7" fill="#FFFFFF" />
        <circle cx="24" cy="32" r="3.5" fill="#0F172A" />
        <circle cx="40" cy="32" r="3.5" fill="#0F172A" />
        <polygon points="29,38 35,38 32,45" fill="#F59E0B" />
      </svg>
    ),
  },
  {
    id: "alien",
    name: "Alien Galáctico",
    bg: "#EDE9FE",
    border: "#7C3AED",
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <ellipse cx="32" cy="34" rx="17" ry="20" fill="#8B5CF6" />
        <ellipse cx="24" cy="32" rx="5" ry="8" transform="rotate(-15 24 32)" fill="#0F172A" />
        <ellipse cx="40" cy="32" rx="5" ry="8" transform="rotate(15 40 32)" fill="#0F172A" />
        <circle cx="23" cy="30" r="1.8" fill="#FFFFFF" />
        <circle cx="39" cy="30" r="1.8" fill="#FFFFFF" />
        <path d="M27,45 Q32,48 37,45" stroke="#0F172A" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
  {
    id: "lion",
    name: "León Líder",
    bg: "#FEF9C3",
    border: "#CA8A04",
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="34" r="22" fill="#B45309" />
        <circle cx="32" cy="34" r="15" fill="#FBBF24" />
        <circle cx="26" cy="31" r="2.8" fill="#0F172A" />
        <circle cx="38" cy="31" r="2.8" fill="#0F172A" />
        <polygon points="29,37 35,37 32,41" fill="#78350F" />
      </svg>
    ),
  },
  {
    id: "rocket",
    name: "Piloto Espacial",
    bg: "#E0E7FF",
    border: "#4338CA",
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="34" r="19" fill="#4F46E5" />
        <rect x="19" y="24" width="26" height="16" rx="8" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2.5" />
        <path d="M24,29 Q32,26 40,29" stroke="#E0F2FE" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
];

export function getAvatarById(id?: string | null): AvatarConfig {
  const found = AVATAR_LIST.find((a) => a.id === id);
  return found || AVATAR_LIST[0];
}

export function ParticipantAvatar({
  avatarId,
  size = "md",
}: {
  avatarId?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const config = getAvatarById(avatarId);
  const sizeClasses =
    size === "sm"
      ? "w-7 h-7"
      : size === "md"
      ? "w-10 h-10"
      : size === "lg"
      ? "w-14 h-14"
      : "w-20 h-20";

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 p-1`}
      style={{ backgroundColor: config.bg, borderColor: config.border }}
      title={config.name}
    >
      {config.svg}
    </div>
  );
}

