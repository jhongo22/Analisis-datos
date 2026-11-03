import { createClient, type Client, type InStatement } from "@libsql/client";

export type PhaseType =
  | "LOBBY"
  | "PHASE_1_SURVEY"
  | "PHASE_1_RESULTS"
  | "PHASE_2_SIMULATOR"
  | "PHASE_2_REVEAL"
  | "PHASE_3_SPEED"
  | "PHASE_3_RESULTS"
  | "PHASE_4_JOURNEY"
  | "PHASE_4_RESULTS"
  | "FINAL_PODIUM";

export type FormBehaviorType = "FILL_PATIENTLY" | "ABANDON" | "PREFER_WHATSAPP";
export type ShoppingTimeType = "MORNING" | "AFTERNOON" | "NIGHT";
export type ManagerDecisionType =
  | "LOWER_PRICE"
  | "MORE_ADS"
  | "FIX_FUNNEL_AUTOMATION";

export type WaitToleranceType = "WAIT_5_MIN" | "WAIT_1_HOUR" | "WAIT_24_HOURS";
export type CartAbandonType =
  | "SURPRISE_SHIPPING"
  | "NO_FAST_SUPPORT"
  | "TOO_MANY_STEPS";

// Phase 4: "El viaje del cliente" (antes de comprar -> al pagar -> después)
export type TrustSignalType =
  | "REVIEWS"
  | "FOLLOWERS"
  | "WHATSAPP_CONTACT"
  | "PRICE_ONLY";
// Tienda A: $90.000 con envío gratis | Tienda B: $78.000 + $9.000 de envío ($87.000)
export type ShippingChoiceType =
  | "FREE_SHIPPING"
  | "PRICE_PLUS_SHIPPING"
  | "CALCULATE_TOTAL";
export type ReturnReasonType =
  | "NEXT_DISCOUNT"
  | "WHATSAPP_UPDATES"
  | "GOOD_SERVICE"
  | "CHEAPEST_ONLY";

export interface PresentationState {
  id: number;
  current_phase: PhaseType;
  clean_outliers: number; // 0 or 1
  unlocked_clues: number;
  custom_host_url: string | null;
  updated_at: number;
}

export interface Participant {
  id: string;
  nickname: string;
  avatar: string;
  tabs_open: number | null;
  form_behavior: FormBehaviorType | null;
  shopping_time: ShoppingTimeType | null;
  manager_decision: ManagerDecisionType | null;
  wait_tolerance: WaitToleranceType | null;
  cart_abandon_reason: CartAbandonType | null;
  trust_signal: TrustSignalType | null;
  shipping_choice: ShippingChoiceType | null;
  return_reason: ReturnReasonType | null;
  score: number;
  created_at: number;
}

// Points: Phase 1 complete +20 | Phase 2 data-driven +100 (other +20)
// Phase 3 complete +30 | Phase 4 complete +30
function computeScore(p: {
  tabs_open: number | null;
  form_behavior: FormBehaviorType | null;
  shopping_time: ShoppingTimeType | null;
  manager_decision: ManagerDecisionType | null;
  wait_tolerance: WaitToleranceType | null;
  cart_abandon_reason: CartAbandonType | null;
  trust_signal: TrustSignalType | null;
  shipping_choice: ShippingChoiceType | null;
  return_reason: ReturnReasonType | null;
}): number {
  let score = 0;
  if (
    p.tabs_open !== null &&
    p.form_behavior !== null &&
    p.shopping_time !== null
  ) {
    score += 20;
  }
  if (p.manager_decision === "FIX_FUNNEL_AUTOMATION") score += 100;
  else if (p.manager_decision) score += 20;
  if (p.wait_tolerance !== null && p.cart_abandon_reason !== null) {
    score += 30;
  }
  if (
    p.trust_signal !== null &&
    p.shipping_choice !== null &&
    p.return_reason !== null
  ) {
    score += 30;
  }
  return score;
}

function resolveDatabaseUrl(): string {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) return url;
  if (process.env.VERCEL) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Configure the Turso env vars in Vercel."
    );
  }
  // Local fallback (persists to a file in the project root).
  return "file:expo.db";
}

const globalForDb = globalThis as unknown as {
  libsqlClient: Client | undefined;
  libsqlInit: Promise<void> | undefined;
};

function getClient(): Client {
  if (!globalForDb.libsqlClient) {
    globalForDb.libsqlClient = createClient({
      url: resolveDatabaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
      intMode: "number",
    });
  }
  return globalForDb.libsqlClient;
}

export async function getDb(): Promise<Client> {
  const client = getClient();
  if (!globalForDb.libsqlInit) {
    globalForDb.libsqlInit = initSchema(client).catch((error) => {
      globalForDb.libsqlInit = undefined;
      throw error;
    });
  }
  await globalForDb.libsqlInit;
  return client;
}

async function initSchema(client: Client) {
  const schema: InStatement[] = [
    {
      sql: `CREATE TABLE IF NOT EXISTS presentation_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_phase TEXT DEFAULT 'LOBBY',
        clean_outliers INTEGER DEFAULT 0,
        unlocked_clues INTEGER DEFAULT 0,
        custom_host_url TEXT,
        updated_at INTEGER
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        avatar TEXT DEFAULT 'fox',
        tabs_open REAL NULL,
        form_behavior TEXT NULL,
        shopping_time TEXT NULL,
        manager_decision TEXT NULL,
        wait_tolerance TEXT NULL,
        cart_abandon_reason TEXT NULL,
        trust_signal TEXT NULL,
        shipping_choice TEXT NULL,
        return_reason TEXT NULL,
        score INTEGER DEFAULT 0,
        created_at INTEGER
      )`,
    },
  ];
  await client.batch(schema, "write");

  const cols = (
    await client.execute("PRAGMA table_info(participants)")
  ).rows.map((row) => row.name as string);

  if (!cols.includes("avatar")) {
    await client.execute(
      "ALTER TABLE participants ADD COLUMN avatar TEXT DEFAULT 'fox'"
    );
  }
  if (!cols.includes("wait_tolerance")) {
    await client.execute(
      "ALTER TABLE participants ADD COLUMN wait_tolerance TEXT NULL"
    );
  }
  if (!cols.includes("cart_abandon_reason")) {
    await client.execute(
      "ALTER TABLE participants ADD COLUMN cart_abandon_reason TEXT NULL"
    );
  }
  for (const col of ["trust_signal", "shipping_choice", "return_reason"]) {
    if (!cols.includes(col)) {
      await client.execute(
        `ALTER TABLE participants ADD COLUMN ${col} TEXT NULL`
      );
    }
  }

  await client.execute({
    sql: `INSERT OR IGNORE INTO presentation_state
          (id, current_phase, clean_outliers, unlocked_clues, custom_host_url, updated_at)
          VALUES (1, 'LOBBY', 0, 0, NULL, ?)`,
    args: [Date.now()],
  });
}

export async function getFullSyncData(): Promise<{
  state: PresentationState;
  participants: Participant[];
}> {
  const db = await getDb();
  const stateResult = await db.execute(
    "SELECT * FROM presentation_state WHERE id = 1"
  );
  const participantsResult = await db.execute(
    "SELECT * FROM participants ORDER BY created_at DESC"
  );

  return {
    state: stateResult.rows[0] as unknown as PresentationState,
    participants: participantsResult.rows as unknown as Participant[],
  };
}

export async function updatePresentationState(
  updates: Partial<
    Pick<
      PresentationState,
      "current_phase" | "clean_outliers" | "unlocked_clues" | "custom_host_url"
    >
  >
): Promise<PresentationState> {
  const db = await getDb();
  const current = (
    await db.execute("SELECT * FROM presentation_state WHERE id = 1")
  ).rows[0] as unknown as PresentationState;

  const nextPhase = updates.current_phase ?? current.current_phase;
  const nextClean =
    updates.clean_outliers !== undefined
      ? updates.clean_outliers
      : current.clean_outliers;
  const nextClues =
    updates.unlocked_clues !== undefined
      ? updates.unlocked_clues
      : current.unlocked_clues;
  const nextHost =
    updates.custom_host_url !== undefined
      ? updates.custom_host_url
      : current.custom_host_url;

  await db.execute({
    sql: `UPDATE presentation_state
          SET current_phase = ?,
              clean_outliers = ?,
              unlocked_clues = ?,
              custom_host_url = ?,
              updated_at = ?
          WHERE id = 1`,
    args: [nextPhase, nextClean, nextClues, nextHost, Date.now()],
  });

  return (
    await db.execute("SELECT * FROM presentation_state WHERE id = 1")
  ).rows[0] as unknown as PresentationState;
}

export async function upsertParticipant(data: {
  id: string;
  nickname?: string;
  avatar?: string;
  tabs_open?: number | null;
  form_behavior?: FormBehaviorType | null;
  shopping_time?: ShoppingTimeType | null;
  manager_decision?: ManagerDecisionType | null;
  wait_tolerance?: WaitToleranceType | null;
  cart_abandon_reason?: CartAbandonType | null;
  trust_signal?: TrustSignalType | null;
  shipping_choice?: ShippingChoiceType | null;
  return_reason?: ReturnReasonType | null;
}): Promise<Participant> {
  const db = await getDb();
  const existing = (
    await db.execute({
      sql: "SELECT * FROM participants WHERE id = ?",
      args: [data.id],
    })
  ).rows[0] as unknown as Participant | undefined;

  // Use the incoming value when provided, otherwise keep the stored one (or null for new rows)
  const pick = <K extends keyof Participant>(key: K): Participant[K] | null => {
    const incoming = (data as Record<string, unknown>)[key as string];
    if (incoming !== undefined) return incoming as Participant[K] | null;
    return existing ? existing[key] ?? null : null;
  };

  const merged = {
    tabs_open: pick("tabs_open"),
    form_behavior: pick("form_behavior"),
    shopping_time: pick("shopping_time"),
    manager_decision: pick("manager_decision"),
    wait_tolerance: pick("wait_tolerance"),
    cart_abandon_reason: pick("cart_abandon_reason"),
    trust_signal: pick("trust_signal"),
    shipping_choice: pick("shipping_choice"),
    return_reason: pick("return_reason"),
  };
  const score = computeScore(merged);

  if (!existing) {
    const nickname = (data.nickname || "Invitado").trim().slice(0, 28);
    const avatar = data.avatar || "fox";

    await db.execute({
      sql: `INSERT INTO participants (
        id, nickname, avatar, tabs_open, form_behavior, shopping_time, manager_decision, wait_tolerance, cart_abandon_reason, trust_signal, shipping_choice, return_reason, score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.id,
        nickname,
        avatar,
        merged.tabs_open,
        merged.form_behavior,
        merged.shopping_time,
        merged.manager_decision,
        merged.wait_tolerance,
        merged.cart_abandon_reason,
        merged.trust_signal,
        merged.shipping_choice,
        merged.return_reason,
        score,
        Date.now(),
      ],
    });
  } else {
    const nickname =
      data.nickname !== undefined
        ? data.nickname.trim().slice(0, 28)
        : existing.nickname;
    const avatar =
      data.avatar !== undefined ? data.avatar : existing.avatar || "fox";

    await db.execute({
      sql: `UPDATE participants
            SET nickname = ?,
                avatar = ?,
                tabs_open = ?,
                form_behavior = ?,
                shopping_time = ?,
                manager_decision = ?,
                wait_tolerance = ?,
                cart_abandon_reason = ?,
                trust_signal = ?,
                shipping_choice = ?,
                return_reason = ?,
                score = ?
            WHERE id = ?`,
      args: [
        nickname,
        avatar,
        merged.tabs_open,
        merged.form_behavior,
        merged.shopping_time,
        merged.manager_decision,
        merged.wait_tolerance,
        merged.cart_abandon_reason,
        merged.trust_signal,
        merged.shipping_choice,
        merged.return_reason,
        score,
        data.id,
      ],
    });
  }

  await db.execute({
    sql: "UPDATE presentation_state SET updated_at = ? WHERE id = 1",
    args: [Date.now()],
  });

  return (
    await db.execute({
      sql: "SELECT * FROM participants WHERE id = ?",
      args: [data.id],
    })
  ).rows[0] as unknown as Participant;
}
export async function seedSimulatedParticipants(): Promise<void> {
  const db = await getDb();
  const avatars = [
    "fox",
    "robot",
    "cat",
    "panda",
    "owl",
    "alien",
    "lion",
    "rocket",
  ];

  const demoProfiles: Array<{
    nickname: string;
    tabs_open: number; // gasto mensual en miles de pesos
    form_behavior: FormBehaviorType;
    shopping_time: ShoppingTimeType;
    manager_decision: ManagerDecisionType;
    wait_tolerance: WaitToleranceType;
    cart_abandon_reason: CartAbandonType;
    trust_signal: TrustSignalType;
    shipping_choice: ShippingChoiceType;
    return_reason: ReturnReasonType;
  }> = [
    {
      nickname: "Carlos (50000)",
      tabs_open: 50000,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "FOLLOWERS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "CHEAPEST_ONLY",
    },
    {
      nickname: "Andrés (-10)",
      tabs_open: -10,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
      trust_signal: "PRICE_ONLY",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "NEXT_DISCOUNT",
    },
    {
      nickname: "Valentina G.",
      tabs_open: 140,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "REVIEWS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "GOOD_SERVICE",
    },
    {
      nickname: "Mateo R.",
      tabs_open: 80,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "SURPRISE_SHIPPING",
      trust_signal: "REVIEWS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "NEXT_DISCOUNT",
    },
    {
      nickname: "Camila M.",
      tabs_open: 220,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "WHATSAPP_CONTACT",
      shipping_choice: "CALCULATE_TOTAL",
      return_reason: "GOOD_SERVICE",
    },
    {
      nickname: "Sebastián L.",
      tabs_open: 110,
      form_behavior: "ABANDON",
      shopping_time: "AFTERNOON",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
      trust_signal: "REVIEWS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "WHATSAPP_UPDATES",
    },
    {
      nickname: "Laura P.",
      tabs_open: 190,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "WHATSAPP_CONTACT",
      shipping_choice: "PRICE_PLUS_SHIPPING",
      return_reason: "GOOD_SERVICE",
    },
    {
      nickname: "Daniel V.",
      tabs_open: 340,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "TOO_MANY_STEPS",
      trust_signal: "FOLLOWERS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "CHEAPEST_ONLY",
    },
    {
      nickname: "Natalia S.",
      tabs_open: 60,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "MORNING",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "SURPRISE_SHIPPING",
      trust_signal: "REVIEWS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "NEXT_DISCOUNT",
    },
    {
      nickname: "Alejandro T.",
      tabs_open: 120,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "PRICE_ONLY",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "NEXT_DISCOUNT",
    },
    {
      nickname: "Sofía C.",
      tabs_open: 270,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "REVIEWS",
      shipping_choice: "CALCULATE_TOTAL",
      return_reason: "GOOD_SERVICE",
    },
    {
      nickname: "Daniela B.",
      tabs_open: 90,
      form_behavior: "FILL_PATIENTLY",
      shopping_time: "AFTERNOON",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_24_HOURS",
      cart_abandon_reason: "SURPRISE_SHIPPING",
      trust_signal: "REVIEWS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "NEXT_DISCOUNT",
    },
    {
      nickname: "Felipe H.",
      tabs_open: 150,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
      trust_signal: "WHATSAPP_CONTACT",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "GOOD_SERVICE",
    },
    {
      nickname: "Juliana K.",
      tabs_open: 70,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "FOLLOWERS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "WHATSAPP_UPDATES",
    },
    {
      nickname: "Nicolás D.",
      tabs_open: 180,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "REVIEWS",
      shipping_choice: "PRICE_PLUS_SHIPPING",
      return_reason: "GOOD_SERVICE",
    },
    {
      nickname: "Mariana F.",
      tabs_open: 100,
      form_behavior: "ABANDON",
      shopping_time: "AFTERNOON",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
      trust_signal: "REVIEWS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "NEXT_DISCOUNT",
    },
    {
      nickname: "Santiago Z.",
      tabs_open: 240,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "WHATSAPP_CONTACT",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "GOOD_SERVICE",
    },
    {
      nickname: "Paula A.",
      tabs_open: 130,
      form_behavior: "FILL_PATIENTLY",
      shopping_time: "MORNING",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "SURPRISE_SHIPPING",
      trust_signal: "REVIEWS",
      shipping_choice: "CALCULATE_TOTAL",
      return_reason: "WHATSAPP_UPDATES",
    },
    {
      nickname: "Juan Pablo",
      tabs_open: 50,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "PRICE_ONLY",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "CHEAPEST_ONLY",
    },
    {
      nickname: "Gabriela M.",
      tabs_open: 160,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
      trust_signal: "REVIEWS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "NEXT_DISCOUNT",
    },
    {
      nickname: "Esteban Q.",
      tabs_open: 210,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "WHATSAPP_CONTACT",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "GOOD_SERVICE",
    },
    {
      nickname: "Manuela W.",
      tabs_open: 80,
      form_behavior: "ABANDON",
      shopping_time: "AFTERNOON",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "SURPRISE_SHIPPING",
      trust_signal: "REVIEWS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "NEXT_DISCOUNT",
    },
    {
      nickname: "Ricardo E.",
      tabs_open: 170,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "FOLLOWERS",
      shipping_choice: "PRICE_PLUS_SHIPPING",
      return_reason: "WHATSAPP_UPDATES",
    },
    {
      nickname: "Diana N.",
      tabs_open: 110,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "MORNING",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
      trust_signal: "REVIEWS",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "NEXT_DISCOUNT",
    },
    {
      nickname: "Tomás G.",
      tabs_open: 290,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
      trust_signal: "WHATSAPP_CONTACT",
      shipping_choice: "FREE_SHIPPING",
      return_reason: "GOOD_SERVICE",
    },
  ];

  const now = Date.now();
  const statements: InStatement[] = demoProfiles.map((profile, idx) => {
    const score = computeScore(profile);
    const avatar = avatars[idx % avatars.length];
    return {
      sql: `INSERT OR REPLACE INTO participants (
        id, nickname, avatar, tabs_open, form_behavior, shopping_time, manager_decision, wait_tolerance, cart_abandon_reason, trust_signal, shipping_choice, return_reason, score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `seed-user-${idx + 1}`,
        profile.nickname,
        avatar,
        profile.tabs_open,
        profile.form_behavior,
        profile.shopping_time,
        profile.manager_decision,
        profile.wait_tolerance,
        profile.cart_abandon_reason,
        profile.trust_signal,
        profile.shipping_choice,
        profile.return_reason,
        score,
        now - (25 - idx) * 1500,
      ],
    };
  });

  statements.push({
    sql: "UPDATE presentation_state SET updated_at = ? WHERE id = 1",
    args: [Date.now()],
  });

  await db.batch(statements, "write");
}
export async function resetAllData(): Promise<void> {
  const db = await getDb();
  await db.batch(
    [
      { sql: "DELETE FROM participants" },
      {
        sql: `UPDATE presentation_state
              SET current_phase = 'LOBBY',
                  clean_outliers = 0,
                  unlocked_clues = 0,
                  updated_at = ?
              WHERE id = 1`,
        args: [Date.now()],
      },
    ],
    "write"
  );
}
