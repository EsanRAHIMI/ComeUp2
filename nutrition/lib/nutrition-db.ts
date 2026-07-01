// ─────────────────────────────────────────────────────────────
// lib/nutrition-db.ts
// Lightweight SQLite storage for weigh-in logs, plate photos, and
// generated plate images. Uses better-sqlite3 (sync, zero-config),
// consistent with a typical Next.js + SQLite setup.
//
// If your existing workout app already has a SQLite/Prisma DB,
// you have two options:
//   1) Keep this as a separate file (default: ./data/nutrition.db)
//      — simplest, zero risk of colliding with existing tables.
//   2) Point NUTRITION_DB_PATH at your existing db file — these
//      tables use a "nutrition_" prefix so they won't collide.
// ─────────────────────────────────────────────────────────────

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.NUTRITION_DB_PATH || path.join(process.cwd(), "data", "nutrition.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS nutrition_weigh_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  meal_slot TEXT NOT NULL,
  food_name TEXT NOT NULL,
  weight_grams REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nutrition_plate_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  meal_slot TEXT NOT NULL,
  file_path TEXT NOT NULL,
  caption TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nutrition_generated_plates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  meal_slot TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_weigh_logs_date ON nutrition_weigh_logs(date);
CREATE INDEX IF NOT EXISTS idx_plate_photos_date ON nutrition_plate_photos(date);
`);

export default db;
