// app/api/nutrition/log/route.ts
// POST: log a weighed food item ("100 g rice for lunch")
// GET:  fetch logs for a given date (?date=2026-07-01)

import { NextRequest, NextResponse } from "next/server";
import db from "../../../../lib/nutrition-db";
import type { WeighLogEntry } from "../../../../types/nutrition";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as WeighLogEntry;

  if (!body.date || !body.mealSlot || !body.foodName || body.weightGrams == null) {
    return NextResponse.json(
      { error: "date, mealSlot, foodName, weightGrams are required" },
      { status: 400 }
    );
  }

  const stmt = db.prepare(`
    INSERT INTO nutrition_weigh_logs (date, meal_slot, food_name, weight_grams, note)
    VALUES (@date, @mealSlot, @foodName, @weightGrams, @note)
  `);

  const result = stmt.run({
    date: body.date,
    mealSlot: body.mealSlot,
    foodName: body.foodName,
    weightGrams: body.weightGrams,
    note: body.note ?? null,
  });

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param is required" }, { status: 400 });
  }

  const rows = db
    .prepare(`SELECT * FROM nutrition_weigh_logs WHERE date = ? ORDER BY created_at ASC`)
    .all(date);

  return NextResponse.json({ logs: rows });
}
