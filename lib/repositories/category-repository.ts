import { db, parseJson, serializeJson } from "@/lib/db";

export type CategoryPlatformSetting = {
  key: string;
  enabled: boolean;
  volume: string;
  note: string;
};

export type CategoryCreatorSetting = {
  name: string;
  platform: string;
  style: string;
  updateRate: string;
};

export type CategorySettingsRecord = {
  categoryId: string;
  platforms: CategoryPlatformSetting[];
  keywords: string[];
  creators: CategoryCreatorSetting[];
  scheduleType: "manual" | "daily" | "weekly";
  runTime: string;
  scheduleWeekday: number;
  lastRunAt: string;
  updatedAt: string;
};

const selectStmt = db.prepare("SELECT * FROM category_settings WHERE category_id = ?");
const deleteStmt = db.prepare("DELETE FROM category_settings WHERE category_id = ?");
const upsertStmt = db.prepare(`
  INSERT INTO category_settings (category_id, platforms_json, keywords_json, creators_json, schedule_type, run_time, schedule_weekday, last_run_at, updated_at)
  VALUES (@category_id, @platforms_json, @keywords_json, @creators_json, @schedule_type, @run_time, @schedule_weekday, @last_run_at, @updated_at)
  ON CONFLICT(category_id) DO UPDATE SET
    platforms_json = excluded.platforms_json,
    keywords_json = excluded.keywords_json,
    creators_json = excluded.creators_json,
    schedule_type = excluded.schedule_type,
    run_time = excluded.run_time,
    schedule_weekday = excluded.schedule_weekday,
    last_run_at = excluded.last_run_at,
    updated_at = excluded.updated_at
`);

export function getCategorySettings(categoryId: string): CategorySettingsRecord | null {
  const row = selectStmt.get(categoryId) as
    | { category_id: string; platforms_json: string; keywords_json: string; creators_json: string; schedule_type: string | null; run_time: string | null; schedule_weekday: number | null; last_run_at: string | null; updated_at: string }
    | undefined;

  if (!row) return null;

  const scheduleType = row.schedule_type === "daily" || row.schedule_type === "weekly"
    ? row.schedule_type
    : String(row.run_time ?? "").trim()
      ? "daily"
      : "manual";

  return {
    categoryId: row.category_id,
    platforms: parseJson(row.platforms_json, []),
    keywords: parseJson(row.keywords_json, []),
    creators: parseJson(row.creators_json, []),
    scheduleType,
    runTime: String(row.run_time ?? ""),
    scheduleWeekday: Number(row.schedule_weekday ?? 1),
    lastRunAt: String(row.last_run_at ?? ""),
    updatedAt: row.updated_at
  };
}

export function saveCategorySettings(input: Omit<CategorySettingsRecord, "updatedAt">) {
  const updatedAt = new Date().toISOString();
  upsertStmt.run({
    category_id: input.categoryId,
    platforms_json: serializeJson(input.platforms),
    keywords_json: serializeJson(input.keywords),
    creators_json: serializeJson(input.creators),
    schedule_type: input.scheduleType,
    run_time: input.runTime,
    schedule_weekday: input.scheduleWeekday,
    last_run_at: input.lastRunAt,
    updated_at: updatedAt
  });

  return getCategorySettings(input.categoryId);
}

export function deleteCategorySettings(categoryId: string) {
  deleteStmt.run(categoryId);
}
