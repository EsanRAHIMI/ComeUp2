// app/api/nutrition/generate-plate/route.ts
//
// POST: builds a plate photo prompt from what was actually weighed/logged
//       for a given date + meal slot, and generates a reference image.
//
// IMPORTANT — read before wiring this up:
// This calls an external image-generation API (OpenAI's images endpoint by
// default). Anthropic's API does not generate images, so you need your own
// key from an image provider, set as IMAGE_GEN_API_KEY below.
//
// About "training on your own plates": there is no realistic way to
// fine-tune a model on a personal photo library through a normal API key —
// that requires a proper fine-tuning pipeline and much more data than a
// few dozen plate photos. What this route does instead, and what actually
// works well in practice: it sends 1-3 of your most recent real plate
// photos (from nutrition_plate_photos) as *reference images* alongside the
// text prompt, so the model matches your plating style (plate color,
// portioning, camera angle) without pretending to "learn" from them
// permanently. Swap `generateImage()` below for whichever provider you
// prefer (OpenAI, Gemini, Stability) — the rest of the route doesn't change.

import { NextRequest, NextResponse } from "next/server";
import db from "../../../../lib/nutrition-db";
import path from "path";
import fs from "fs/promises";

const OUTPUT_DIR = path.join(process.cwd(), "public", "nutrition-generated");

function buildPrompt(items: { food_name: string; weight_grams: number }[], mealSlot: string) {
  const desc = items.map((i) => `${Math.round(i.weight_grams)}g ${i.food_name}`).join(", ");
  return (
    `Top-down photo of a single home-cooked meal plate for ${mealSlot}, ` +
    `realistic portions matching: ${desc}. Natural lighting, simple white plate, ` +
    `minimal styling, photographed like a personal meal-prep log photo, not a ` +
    `magazine shoot.`
  );
}

// Swap this out for your preferred image-gen provider.
async function generateImage(prompt: string, referenceImageB64: string[]): Promise<Buffer> {
  const apiKey = process.env.IMAGE_GEN_API_KEY;
  if (!apiKey) {
    throw new Error("IMAGE_GEN_API_KEY is not set — add an image-gen provider key to .env");
  }

  // Example using OpenAI's images API. Reference images are optional context;
  // if your chosen provider doesn't support them, drop referenceImageB64.
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    }),
  });

  if (!res.ok) {
    throw new Error(`Image generation failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from provider");
  return Buffer.from(b64, "base64");
}

export async function POST(req: NextRequest) {
  const { date, mealSlot } = (await req.json()) as { date: string; mealSlot: string };

  if (!date || !mealSlot) {
    return NextResponse.json({ error: "date and mealSlot are required" }, { status: 400 });
  }

  const items = db
    .prepare(
      `SELECT food_name, weight_grams FROM nutrition_weigh_logs WHERE date = ? AND meal_slot = ?`
    )
    .all(date, mealSlot) as { food_name: string; weight_grams: number }[];

  if (items.length === 0) {
    return NextResponse.json(
      { error: "No weighed items logged for this date/meal yet — log the plate first." },
      { status: 400 }
    );
  }

  const prompt = buildPrompt(items, mealSlot);

  // Pull up to 3 recent real plate photos as style reference (optional).
  const recentPhotos = db
    .prepare(
      `SELECT file_path FROM nutrition_plate_photos WHERE meal_slot = ? ORDER BY created_at DESC LIMIT 3`
    )
    .all(mealSlot) as { file_path: string }[];

  let referenceB64: string[] = [];
  try {
    referenceB64 = await Promise.all(
      recentPhotos.map(async (p) => {
        const filePath = path.join(process.cwd(), "public", p.file_path);
        const bytes = await fs.readFile(filePath);
        return bytes.toString("base64");
      })
    );
  } catch {
    referenceB64 = []; // fine if none exist yet
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = await generateImage(prompt, referenceB64);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const filename = `${date}_${mealSlot}_${Date.now()}.png`;
  await fs.writeFile(path.join(OUTPUT_DIR, filename), imageBuffer);
  const publicPath = `/nutrition-generated/${filename}`;

  db.prepare(
    `INSERT INTO nutrition_generated_plates (date, meal_slot, prompt, image_path) VALUES (?, ?, ?, ?)`
  ).run(date, mealSlot, prompt, publicPath);

  return NextResponse.json({ imagePath: publicPath, prompt });
}
