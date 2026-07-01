// components/nutrition/NutritionModule.tsx
// Single entry point — import this into your existing (workout) app,
// e.g. as a new tab/route: <NutritionModule />
"use client";

import { useState } from "react";
import MealPlanView from "./MealPlanView";
import WeighInLogger from "./WeighInLogger";
import PlatePhotoArchive from "./PlatePhotoArchive";
import type { DayOfWeek } from "../../types/nutrition";
import { DAY_ORDER, DAY_LABELS_FA } from "../../data/meal-plan";

function isoDateFor(day: DayOfWeek): string {
  // helper only for display purposes; the date input below drives actual logging
  return new Date().toISOString().slice(0, 10);
}

type Tab = "plan" | "log" | "photos";

export default function NutritionModule() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<Tab>("log");

  return (
    <div dir="rtl" className="mx-auto max-w-md space-y-4 p-4 text-right">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">تغذیه</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-neutral-300 p-1.5 text-sm"
        />
      </div>

      <div className="flex gap-2 rounded-lg bg-neutral-100 p-1 text-sm">
        {([
          ["plan", "برنامه"],
          ["log", "ثبت وعده"],
          ["photos", "عکس بشقاب"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md p-2 font-medium ${
              tab === id ? "bg-white shadow-sm" : "text-neutral-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plan" && <MealPlanView />}
      {tab === "log" && <WeighInLogger date={date} />}
      {tab === "photos" && <PlatePhotoArchive date={date} />}
    </div>
  );
}
