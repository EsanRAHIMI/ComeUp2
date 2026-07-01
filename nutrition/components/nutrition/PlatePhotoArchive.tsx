// components/nutrition/PlatePhotoArchive.tsx
"use client";

import { useEffect, useState } from "react";
import type { MealSlotId } from "../../types/nutrition";
import { MEAL_SLOT_LABELS_FA } from "../../data/meal-plan";

const SLOTS: MealSlotId[] = ["breakfast", "snack_am", "lunch", "snack_pm", "dinner", "before_bed"];

interface Photo {
  id: number;
  file_path: string;
  meal_slot: string;
  caption?: string;
}

export default function PlatePhotoArchive({ date }: { date: string }) {
  const [mealSlot, setMealSlot] = useState<MealSlotId>("lunch");
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  async function loadPhotos() {
    const res = await fetch(`/api/nutrition/photos?date=${date}`);
    const data = await res.json();
    setPhotos(data.photos ?? []);
  }

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function upload() {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("date", date);
    form.append("mealSlot", mealSlot);
    await fetch("/api/nutrition/photos", { method: "POST", body: form });
    setFile(null);
    setUploading(false);
    loadPhotos();
  }

  async function generate() {
    setGenerating(true);
    setGenError(null);
    setGeneratedImg(null);
    try {
      const res = await fetch("/api/nutrition/generate-plate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, mealSlot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در تولید تصویر");
      setGeneratedImg(data.imagePath);
    } catch (e: any) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-4 rounded-xl border border-neutral-200 p-4 text-right">
      <div className="font-semibold">آرشیو عکس بشقاب</div>

      <select
        value={mealSlot}
        onChange={(e) => setMealSlot(e.target.value as MealSlotId)}
        className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
      >
        {SLOTS.map((s) => (
          <option key={s} value={s}>
            {MEAL_SLOT_LABELS_FA[s]}
          </option>
        ))}
      </select>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full text-sm"
      />

      <button
        onClick={upload}
        disabled={!file || uploading}
        className="w-full rounded-lg bg-neutral-900 p-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {uploading ? "در حال آپلود..." : "آپلود عکس واقعی"}
      </button>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <img key={p.id} src={p.file_path} alt="plate" className="aspect-square rounded-lg object-cover" />
          ))}
        </div>
      )}

      <hr className="border-neutral-200" />

      <div>
        <div className="mb-2 text-sm text-neutral-600">
          تولید تصویر فرضی بشقاب بر اساس آنچه امروز برای این وعده وزن کرده‌اید:
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="w-full rounded-lg border border-neutral-900 p-2 text-sm font-medium disabled:opacity-50"
        >
          {generating ? "در حال تولید..." : "تولید تصویر با هوش مصنوعی"}
        </button>
        {genError && <div className="mt-2 text-sm text-red-600">{genError}</div>}
        {generatedImg && (
          <img src={generatedImg} alt="generated plate" className="mt-3 w-full rounded-lg" />
        )}
      </div>
    </div>
  );
}
