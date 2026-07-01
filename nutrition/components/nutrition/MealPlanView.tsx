// components/nutrition/MealPlanView.tsx
"use client";

import { mealPlan, DAY_ORDER, DAY_LABELS_FA, MEAL_SLOT_LABELS_FA } from "../../data/meal-plan";
import type { DayOfWeek } from "../../types/nutrition";

function todayKey(): DayOfWeek {
  // JS getDay(): 0=Sun..6=Sat. Plan week starts Saturday.
  const order: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return order[new Date().getDay()];
}

export default function MealPlanView({ day }: { day?: DayOfWeek }) {
  const activeDay = day ?? todayKey();

  return (
    <div dir="rtl" className="space-y-4 text-right">
      <h2 className="text-lg font-bold">
        برنامه غذایی — {DAY_LABELS_FA[activeDay]}
      </h2>

      {mealPlan.slots.map((slot) => {
        const dayMeal = slot.byDay?.[activeDay];
        return (
          <div key={slot.id} className="rounded-xl border border-neutral-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-neutral-500">{slot.time}</span>
              <span className="font-semibold">{MEAL_SLOT_LABELS_FA[slot.id] ?? slot.title}</span>
            </div>

            {dayMeal && (
              <ul className="space-y-1">
                {dayMeal.items.map((it, i) => (
                  <li key={i} className="text-sm">
                    {it.name} {it.amount && <span className="text-neutral-500">— {it.amount}</span>}
                  </li>
                ))}
              </ul>
            )}

            {slot.options && (
              <div className="grid gap-3 sm:grid-cols-2">
                {slot.options.map((opt, idx) => (
                  <div key={idx} className="rounded-lg bg-neutral-50 p-3">
                    <div className="mb-1 text-xs font-medium text-neutral-500">{opt.label}</div>
                    <ul className="space-y-0.5">
                      {opt.items.map((it, i) => (
                        <li key={i} className="text-sm">
                          {it.name} {it.amount && <span className="text-neutral-500">— {it.amount}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="mb-2 font-semibold">قوانین روزانه</div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {mealPlan.dailyRules.map((r, i) => (
            <li key={i}>
              {r.label}: <span className="text-neutral-500">{r.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
