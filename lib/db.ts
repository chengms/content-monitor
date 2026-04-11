import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "content-monitor.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS category_settings (
    category_id TEXT PRIMARY KEY,
    platforms_json TEXT NOT NULL,
    keywords_json TEXT NOT NULL,
    creators_json TEXT NOT NULL,
    schedule_type TEXT NOT NULL DEFAULT 'manual',
    run_time TEXT NOT NULL DEFAULT '',
    schedule_weekday INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contents (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    raw_content TEXT NOT NULL DEFAULT '',
    plain_text_content TEXT NOT NULL DEFAULT '',
    creator TEXT NOT NULL,
    publish_time TEXT NOT NULL,
    date TEXT NOT NULL,
    heat INTEGER NOT NULL,
    engagement_score INTEGER NOT NULL,
    stats_json TEXT NOT NULL,
    matched_keywords_json TEXT NOT NULL,
    matched_creators_json TEXT NOT NULL,
    ai_tags_json TEXT NOT NULL,
    source_type TEXT NOT NULL,
    pool_status TEXT NOT NULL DEFAULT 'candidate',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    goal TEXT NOT NULL,
    status TEXT NOT NULL,
    keywords_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_analysis_at TEXT
  );

  CREATE TABLE IF NOT EXISTS topic_contents (
    topic_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    added_at TEXT NOT NULL,
    PRIMARY KEY (topic_id, content_id)
  );

  CREATE TABLE IF NOT EXISTS topic_analysis_results (
    topic_id TEXT PRIMARY KEY,
    generated_at TEXT NOT NULL,
    model TEXT NOT NULL,
    total_articles INTEGER NOT NULL,
    article_insights_json TEXT NOT NULL,
    topic_insights_json TEXT NOT NULL
  );
`);

export function serializeJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export { db, dbPath };

const categorySettingsColumns = db.prepare("PRAGMA table_info(category_settings)").all() as Array<{ name: string }>;
if (!categorySettingsColumns.some((column) => column.name === "schedule_type")) {
  try {
    db.exec("ALTER TABLE category_settings ADD COLUMN schedule_type TEXT NOT NULL DEFAULT 'manual';");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: schedule_type")) {
      throw error;
    }
  }
}
if (!categorySettingsColumns.some((column) => column.name === "run_time")) {
  try {
    db.exec("ALTER TABLE category_settings ADD COLUMN run_time TEXT NOT NULL DEFAULT '';");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: run_time")) {
      throw error;
    }
  }
}
if (!categorySettingsColumns.some((column) => column.name === "schedule_weekday")) {
  try {
    db.exec("ALTER TABLE category_settings ADD COLUMN schedule_weekday INTEGER NOT NULL DEFAULT 1;");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: schedule_weekday")) {
      throw error;
    }
  }
}
if (!categorySettingsColumns.some((column) => column.name === "last_run_at")) {
  try {
    db.exec("ALTER TABLE category_settings ADD COLUMN last_run_at TEXT NOT NULL DEFAULT '';");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: last_run_at")) {
      throw error;
    }
  }
}

const contentColumns = db.prepare("PRAGMA table_info(contents)").all() as Array<{ name: string }>;
if (!contentColumns.some((column) => column.name === "pool_status")) {
  try {
    db.exec("ALTER TABLE contents ADD COLUMN pool_status TEXT NOT NULL DEFAULT 'candidate';");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: pool_status")) {
      throw error;
    }
  }
}

if (!contentColumns.some((column) => column.name === "raw_content")) {
  try {
    db.exec("ALTER TABLE contents ADD COLUMN raw_content TEXT NOT NULL DEFAULT '';");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: raw_content")) {
      throw error;
    }
  }
}

if (!contentColumns.some((column) => column.name === "plain_text_content")) {
  try {
    db.exec("ALTER TABLE contents ADD COLUMN plain_text_content TEXT NOT NULL DEFAULT '';");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: plain_text_content")) {
      throw error;
    }
  }
}

db.exec("UPDATE contents SET pool_status = 'candidate' WHERE pool_status IS NULL OR TRIM(pool_status) = ''; ");

