// app/api/nutrition/photos/route.ts
// POST: upload a real photo of a plate (multipart/form-data: file, date, mealSlot, caption)
//       These photos are the archive you'll build up over time — later used as
//       reference material when generating hypothetical plates (see generate-plate route).
// GET:  list photos for a date (?date=2026-07-01)

import { NextRequest, NextResponse } from "next/server";
import db from "../../../../lib/nutrition-db";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "public", "nutrition-photos");

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const date = form.get("date") as string | null;
  const mealSlot = form.get("mealSlot") as string | null;
  const caption = (form.get("caption") as string | null) ?? undefined;

  if (!file || !date || !mealSlot) {
    return NextResponse.json({ error: "file, date, mealSlot are required" }, { status: 400 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const filename = `${date}_${mealSlot}_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  const publicPath = `/nutrition-photos/${filename}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, bytes);

  const stmt = db.prepare(`
    INSERT INTO nutrition_plate_photos (date, meal_slot, file_path, caption)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(date, mealSlot, publicPath, caption ?? null);

  return NextResponse.json({ id: result.lastInsertRowid, filePath: publicPath }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const q = date
    ? db.prepare(`SELECT * FROM nutrition_plate_photos WHERE date = ? ORDER BY created_at DESC`).all(date)
    : db.prepare(`SELECT * FROM nutrition_plate_photos ORDER BY created_at DESC LIMIT 100`).all();

  return NextResponse.json({ photos: q });
}
