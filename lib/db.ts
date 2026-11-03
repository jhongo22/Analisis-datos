import { createClient, type Client, type InStatement } from "@libsql/client";

export type PhaseType =
  | "LOBBY"
  | "PHASE_1_SURVEY"
  | "PHASE_1_RESULTS"
  | "PHASE_2_SIMULATOR"
  | "PHASE_2_REVEAL"
  | "PHASE_3_SPEED"
  | "PHASE_3_RESULTS"
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
  score: number;
  created_at: number;
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
}): Promise<Participant> {
  const db = await getDb();
  const existing = (
    await db.execute({
      sql: "SELECT * FROM participants WHERE id = ?",
      args: [data.id],
    })
  ).rows[0] as unknown as Participant | undefined;

  if (!existing) {
    const nickname = (data.nickname || "Invitado").trim().slice(0, 28);
    const avatar = data.avatar || "fox";
    const tabsOpen = data.tabs_open !== undefined ? data.tabs_open : null;
    const formBehavior = data.form_behavior ?? null;
    const shoppingTime = data.shopping_time ?? null;
    const managerDecision = data.manager_decision ?? null;
    const waitTolerance = data.wait_tolerance ?? null;
    const cartAbandon = data.cart_abandon_reason ?? null;

    let score = 0;
    if (tabsOpen !== null && formBehavior !== null && shoppingTime !== null) {
      score += 20;
    }
    if (managerDecision === "FIX_FUNNEL_AUTOMATION") score += 100;
    else if (managerDecision) score += 20;
    if (waitTolerance !== null && cartAbandon !== null) {
      score += 30;
    }

    await db.execute({
      sql: `INSERT INTO participants (
        id, nickname, avatar, tabs_open, form_behavior, shopping_time, manager_decision, wait_tolerance, cart_abandon_reason, score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.id,
        nickname,
        avatar,
        tabsOpen,
        formBehavior,
        shoppingTime,
        managerDecision,
        waitTolerance,
        cartAbandon,
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
    const tabsOpen =
      data.tabs_open !== undefined ? data.tabs_open : existing.tabs_open;
    const formBehavior =
      data.form_behavior !== undefined
        ? data.form_behavior
        : existing.form_behavior;
    const shoppingTime =
      data.shopping_time !== undefined
        ? data.shopping_time
        : existing.shopping_time;
    const managerDecision =
      data.manager_decision !== undefined
        ? data.manager_decision
        : existing.manager_decision;
    const waitTolerance =
      data.wait_tolerance !== undefined
        ? data.wait_tolerance
        : existing.wait_tolerance;
    const cartAbandon =
      data.cart_abandon_reason !== undefined
        ? data.cart_abandon_reason
        : existing.cart_abandon_reason;

    let score = 0;
    if (tabsOpen !== null && formBehavior !== null && shoppingTime !== null) {
      score += 20;
    }
    if (managerDecision === "FIX_FUNNEL_AUTOMATION") score += 100;
    else if (managerDecision) score += 20;
    if (waitTolerance !== null && cartAbandon !== null) {
      score += 30;
    }

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
                score = ?
            WHERE id = ?`,
      args: [
        nickname,
        avatar,
        tabsOpen,
        formBehavior,
        shoppingTime,
        managerDecision,
        waitTolerance,
        cartAbandon,
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
    tabs_open: number;
    form_behavior: FormBehaviorType;
    shopping_time: ShoppingTimeType;
    manager_decision: ManagerDecisionType;
    wait_tolerance: WaitToleranceType;
    cart_abandon_reason: CartAbandonType;
  }> = [
    {
      nickname: "Carlos (9999)",
      tabs_open: 9999,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Andrés (-10)",
      tabs_open: -10,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
    },
    {
      nickname: "Valentina G.",
      tabs_open: 14,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Mateo R.",
      tabs_open: 8,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "SURPRISE_SHIPPING",
    },
    {
      nickname: "Camila M.",
      tabs_open: 22,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Sebastián L.",
      tabs_open: 11,
      form_behavior: "ABANDON",
      shopping_time: "AFTERNOON",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
    },
    {
      nickname: "Laura P.",
      tabs_open: 19,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Daniel V.",
      tabs_open: 34,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "TOO_MANY_STEPS",
    },
    {
      nickname: "Natalia S.",
      tabs_open: 6,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "MORNING",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "SURPRISE_SHIPPING",
    },
    {
      nickname: "Alejandro T.",
      tabs_open: 12,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Sofía C.",
      tabs_open: 27,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Daniela B.",
      tabs_open: 9,
      form_behavior: "FILL_PATIENTLY",
      shopping_time: "AFTERNOON",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_24_HOURS",
      cart_abandon_reason: "SURPRISE_SHIPPING",
    },
    {
      nickname: "Felipe H.",
      tabs_open: 15,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
    },
    {
      nickname: "Juliana K.",
      tabs_open: 7,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Nicolás D.",
      tabs_open: 18,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Mariana F.",
      tabs_open: 10,
      form_behavior: "ABANDON",
      shopping_time: "AFTERNOON",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
    },
    {
      nickname: "Santiago Z.",
      tabs_open: 24,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Paula A.",
      tabs_open: 13,
      form_behavior: "FILL_PATIENTLY",
      shopping_time: "MORNING",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "SURPRISE_SHIPPING",
    },
    {
      nickname: "Juan Pablo",
      tabs_open: 5,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Gabriela M.",
      tabs_open: 16,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
    },
    {
      nickname: "Esteban Q.",
      tabs_open: 21,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Manuela W.",
      tabs_open: 8,
      form_behavior: "ABANDON",
      shopping_time: "AFTERNOON",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_1_HOUR",
      cart_abandon_reason: "SURPRISE_SHIPPING",
    },
    {
      nickname: "Ricardo E.",
      tabs_open: 17,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "NIGHT",
      manager_decision: "MORE_ADS",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
    {
      nickname: "Diana N.",
      tabs_open: 11,
      form_behavior: "PREFER_WHATSAPP",
      shopping_time: "MORNING",
      manager_decision: "LOWER_PRICE",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "TOO_MANY_STEPS",
    },
    {
      nickname: "Tomás G.",
      tabs_open: 29,
      form_behavior: "ABANDON",
      shopping_time: "NIGHT",
      manager_decision: "FIX_FUNNEL_AUTOMATION",
      wait_tolerance: "WAIT_5_MIN",
      cart_abandon_reason: "NO_FAST_SUPPORT",
    },
  ];

  const now = Date.now();
  const statements: InStatement[] = demoProfiles.map((profile, idx) => {
    const score =
      profile.manager_decision === "FIX_FUNNEL_AUTOMATION" ? 150 : 70;
    const avatar = avatars[idx % avatars.length];
    return {
      sql: `INSERT OR REPLACE INTO participants (
        id, nickname, avatar, tabs_open, form_behavior, shopping_time, manager_decision, wait_tolerance, cart_abandon_reason, score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
