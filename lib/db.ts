import Database from "better-sqlite3";
import path from "path";

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

const dbPath = path.join(process.cwd(), "expo.db");

const globalForDb = globalThis as unknown as {
  sqliteDb: Database.Database | undefined;
};

export function getDb(): Database.Database {
  if (!globalForDb.sqliteDb) {
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    initSchema(db);
    globalForDb.sqliteDb = db;
  }
  return globalForDb.sqliteDb;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS presentation_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_phase TEXT DEFAULT 'LOBBY',
      clean_outliers INTEGER DEFAULT 0,
      unlocked_clues INTEGER DEFAULT 0,
      custom_host_url TEXT,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS participants (
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
    );
  `);

  const cols = db.prepare("PRAGMA table_info(participants)").all() as Array<{
    name: string;
  }>;
  if (!cols.some((c) => c.name === "avatar")) {
    db.exec("ALTER TABLE participants ADD COLUMN avatar TEXT DEFAULT 'fox'");
  }
  if (!cols.some((c) => c.name === "wait_tolerance")) {
    db.exec("ALTER TABLE participants ADD COLUMN wait_tolerance TEXT NULL");
  }
  if (!cols.some((c) => c.name === "cart_abandon_reason")) {
    db.exec(
      "ALTER TABLE participants ADD COLUMN cart_abandon_reason TEXT NULL"
    );
  }

  const existing = db
    .prepare("SELECT id FROM presentation_state WHERE id = 1")
    .get();
  if (!existing) {
    db.prepare(
      `INSERT INTO presentation_state (id, current_phase, clean_outliers, unlocked_clues, custom_host_url, updated_at)
       VALUES (1, 'LOBBY', 0, 0, NULL, ?)`
    ).run(Date.now());
  }
}

export function getFullSyncData(): {
  state: PresentationState;
  participants: Participant[];
} {
  const db = getDb();
  const state = db
    .prepare("SELECT * FROM presentation_state WHERE id = 1")
    .get() as PresentationState;
  const participants = db
    .prepare("SELECT * FROM participants ORDER BY created_at DESC")
    .all() as Participant[];

  return { state, participants };
}

export function updatePresentationState(
  updates: Partial<
    Pick<
      PresentationState,
      "current_phase" | "clean_outliers" | "unlocked_clues" | "custom_host_url"
    >
  >
): PresentationState {
  const db = getDb();
  const current = db
    .prepare("SELECT * FROM presentation_state WHERE id = 1")
    .get() as PresentationState;

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

  db.prepare(
    `UPDATE presentation_state
     SET current_phase = ?,
         clean_outliers = ?,
         unlocked_clues = ?,
         custom_host_url = ?,
         updated_at = ?
     WHERE id = 1`
  ).run(nextPhase, nextClean, nextClues, nextHost, Date.now());

  return db
    .prepare("SELECT * FROM presentation_state WHERE id = 1")
    .get() as PresentationState;
}

export function upsertParticipant(data: {
  id: string;
  nickname?: string;
  avatar?: string;
  tabs_open?: number | null;
  form_behavior?: FormBehaviorType | null;
  shopping_time?: ShoppingTimeType | null;
  manager_decision?: ManagerDecisionType | null;
  wait_tolerance?: WaitToleranceType | null;
  cart_abandon_reason?: CartAbandonType | null;
}): Participant {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM participants WHERE id = ?")
    .get(data.id) as Participant | undefined;

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

    db.prepare(
      `INSERT INTO participants (
        id, nickname, avatar, tabs_open, form_behavior, shopping_time, manager_decision, wait_tolerance, cart_abandon_reason, score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
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
      Date.now()
    );
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

    db.prepare(
      `UPDATE participants
       SET nickname = ?,
           avatar = ?,
           tabs_open = ?,
           form_behavior = ?,
           shopping_time = ?,
           manager_decision = ?,
           wait_tolerance = ?,
           cart_abandon_reason = ?,
           score = ?
       WHERE id = ?`
    ).run(
      nickname,
      avatar,
      tabsOpen,
      formBehavior,
      shoppingTime,
      managerDecision,
      waitTolerance,
      cartAbandon,
      score,
      data.id
    );
  }

  db.prepare("UPDATE presentation_state SET updated_at = ? WHERE id = 1").run(
    Date.now()
  );

  return db
    .prepare("SELECT * FROM participants WHERE id = ?")
    .get(data.id) as Participant;
}

export function seedSimulatedParticipants() {
  const db = getDb();
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

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO participants (
      id, nickname, avatar, tabs_open, form_behavior, shopping_time, manager_decision, wait_tolerance, cart_abandon_reason, score, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const tx = db.transaction(() => {
    demoProfiles.forEach((profile, idx) => {
      const score =
        profile.manager_decision === "FIX_FUNNEL_AUTOMATION" ? 150 : 70;
      const avatar = avatars[idx % avatars.length];
      insertStmt.run(
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
        now - (25 - idx) * 1500
      );
    });
    db.prepare("UPDATE presentation_state SET updated_at = ? WHERE id = 1").run(
      Date.now()
    );
  });

  tx();
}

export function resetAllData() {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM participants").run();
    db.prepare(
      `UPDATE presentation_state
       SET current_phase = 'LOBBY',
           clean_outliers = 0,
           unlocked_clues = 0,
           updated_at = ?
       WHERE id = 1`
    ).run(Date.now());
  });
  tx();
}
