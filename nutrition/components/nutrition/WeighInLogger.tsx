// components/nutrition/WeighInLogger.tsx
"use client";

import { useState } from "react";
import type { MealSlotId } from "../../types/nutrition";
import { MEAL_SLOT_LABELS_FA } from "../../data/meal-plan";

const SLOTS: MealSlotId[] = ["breakfast", "snack_am", "lunch", "snack_pm", "dinner", "before_bed"];

interface Props {
  date: string; // ISO date, e.g. from a date picker in the host app
  onLogged?: () => void;
}

export default function WeighInLogger({ date, onLogged }: Props) {
  const [mealSlot, setMealSlot] = useState<MealSlotId>("lunch");
  const [foodName, setFoodName] = useState("");
  const [weight, setWeight] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!foodName || !weight) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealSlot,
          foodName,
          weightGrams: parseFloat(weight),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      setFoodName("");
      setWeight("");
      onLogged?.();
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form dir="rtl" onSubmit={submit} className="space-y-3 rounded-xl border border-neutral-200 p-4 text-right">
      <div className="font-semibold">ثبت وعده با ترازو</div>

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
        type="text"
        placeholder="نام ماده غذایی (مثلاً برنج پخته)"
        value={foodName}
        onChange={(e) => setFoodName(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
      />

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder="وزن (گرم)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
        />
        <span className="text-sm text-neutral-500">g</span>
      </div>

      <button
        type="submit"
        disabled={status === "saving"}
        className="w-full rounded-lg bg-neutral-900 p-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "saving" ? "در حال ثبت..." : status === "saved" ? "ثبت شد ✓" : "ثبت وزن"}
      </button>

      {status === "error" && <div className="text-sm text-red-600">خطا در ثبت. دوباره امتحان کنید.</div>}
    </form>
  );
}
