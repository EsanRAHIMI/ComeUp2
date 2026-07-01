// ─────────────────────────────────────────────────────────────
// data/meal-plan.ts
// The user's weekly diet plan, transcribed into structured data.
// Edit this file directly if the plan changes — everything else
// in the module (UI, logging, targets) reads from here.
// ─────────────────────────────────────────────────────────────

import type { WeeklyPlan } from "../types/nutrition";

export const mealPlan: WeeklyPlan = {
  slots: [
    {
      id: "breakfast",
      title: "Breakfast",
      time: "08:00",
      options: [
        {
          label: "Option 1",
          items: [
            { name: "Eggs", amount: "2" },
            { name: "Brown Toast", amount: "2 slices (60 g)" },
            { name: "Cucumber", amount: "150 g" },
            { name: "Tomato", amount: "150 g" },
            { name: "Coffee (No Sugar)", amount: "" },
          ],
        },
        {
          label: "Option 2",
          items: [
            { name: "Oatmeal", amount: "40 g" },
            { name: "Milk", amount: "200 ml" },
            { name: "Chia Seeds", amount: "10 g" },
            { name: "Honey", amount: "5 g" },
          ],
        },
      ],
    },
    {
      id: "snack_am",
      title: "Snack",
      time: "11:00",
      options: [
        {
          label: "Option 1",
          items: [
            { name: "Yogurt", amount: "200 g" },
            { name: "Walnuts", amount: "15 g" },
          ],
        },
        {
          label: "Option 2",
          items: [{ name: "Apple", amount: "1 medium (150 g)" }],
        },
      ],
    },
    {
      id: "lunch",
      title: "Lunch",
      time: "14:00",
      byDay: {
        saturday: {
          label: "Saturday",
          items: [
            { name: "Chicken Breast", amount: "150 g" },
            { name: "Cooked Rice", amount: "100 g" },
            { name: "Large Salad", amount: "" },
            { name: "Olive Oil", amount: "10 g" },
          ],
        },
        sunday: {
          label: "Sunday",
          items: [
            { name: "Fish", amount: "180 g" },
            { name: "Potato", amount: "180 g" },
            { name: "Large Salad", amount: "" },
            { name: "Olive Oil", amount: "10 g" },
          ],
        },
        monday: {
          label: "Monday",
          items: [
            { name: "Lean Beef", amount: "120-150 g" },
            { name: "Cooked Lentils", amount: "150 g" },
            { name: "Large Salad", amount: "" },
            { name: "Olive Oil", amount: "10 g" },
          ],
        },
        tuesday: {
          label: "Tuesday",
          items: [
            { name: "Chicken Breast", amount: "150 g" },
            { name: "Cooked Beans", amount: "150 g" },
            { name: "Large Salad", amount: "" },
            { name: "Olive Oil", amount: "10 g" },
          ],
        },
        wednesday: {
          label: "Wednesday",
          items: [
            { name: "Shrimp", amount: "180 g" },
            { name: "Whole Wheat Pasta", amount: "70 g (dry)" },
            { name: "Large Salad", amount: "" },
            { name: "Olive Oil", amount: "10 g" },
          ],
        },
        thursday: {
          label: "Thursday",
          items: [
            { name: "Fish", amount: "180 g" },
            { name: "Cooked Rice", amount: "100 g" },
            { name: "Large Salad", amount: "" },
            { name: "Olive Oil", amount: "10 g" },
          ],
        },
        friday: {
          label: "Friday",
          items: [
            { name: "Lean Beef", amount: "120-150 g" },
            { name: "Cooked Chickpeas", amount: "150 g" },
            { name: "Large Salad", amount: "" },
            { name: "Olive Oil", amount: "10 g" },
          ],
        },
      },
    },
    {
      id: "snack_pm",
      title: "Snack",
      time: "17:00",
      options: [
        {
          label: "Option 1",
          items: [
            { name: "Cheese", amount: "30 g" },
            { name: "Brown Toast", amount: "1 slice" },
          ],
        },
        {
          label: "Option 2",
          items: [
            { name: "Peanut Butter", amount: "15 g" },
            { name: "Brown Toast", amount: "1 slice" },
          ],
        },
        {
          label: "Option 3",
          items: [{ name: "Pistachios", amount: "20 g" }],
        },
      ],
    },
    {
      id: "dinner",
      title: "Dinner",
      time: "20:00",
      byDay: {
        saturday: {
          items: [
            { name: "Chicken Breast", amount: "150 g" },
            { name: "Mixed Vegetables", amount: "300 g" },
            { name: "Olive Oil", amount: "5 g" },
          ],
        },
        sunday: {
          items: [
            { name: "Chicken Breast", amount: "150 g" },
            { name: "Mixed Vegetables", amount: "300 g" },
            { name: "Olive Oil", amount: "5 g" },
          ],
        },
        monday: {
          items: [
            { name: "Chicken Breast", amount: "150 g" },
            { name: "Mixed Vegetables", amount: "300 g" },
            { name: "Olive Oil", amount: "5 g" },
          ],
        },
        tuesday: {
          items: [
            { name: "Fish", amount: "180 g" },
            { name: "Mixed Vegetables", amount: "300 g" },
            { name: "Olive Oil", amount: "5 g" },
          ],
        },
        wednesday: {
          items: [
            { name: "Chicken Breast", amount: "150 g" },
            { name: "Mixed Vegetables", amount: "300 g" },
            { name: "Olive Oil", amount: "5 g" },
          ],
        },
        thursday: {
          items: [
            { name: "Shrimp", amount: "180 g" },
            { name: "Mixed Vegetables", amount: "300 g" },
            { name: "Olive Oil", amount: "5 g" },
          ],
        },
        friday: {
          items: [
            { name: "Eggs", amount: "3" },
            { name: "Mixed Vegetables", amount: "300 g" },
            { name: "Olive Oil", amount: "5 g" },
          ],
        },
      },
    },
    {
      id: "before_bed",
      title: "Before Bed (Optional)",
      time: "22:30",
      options: [
        { label: "Option 1", items: [{ name: "Milk", amount: "200 ml" }] },
        { label: "Option 2", items: [{ name: "Yogurt", amount: "150 g" }] },
      ],
    },
  ],

  vegetableChoices: [
    "Mushroom 150 g",
    "Lettuce",
    "Tomato",
    "Cucumber",
    "Onion 50 g",
    "Garlic",
    "Cabbage",
  ],

  dailyRules: [
    { label: "Water", value: "3 L" },
    { label: "Coffee", value: "1-2 cups (No Sugar)" },
    { label: "Olive Oil", value: "Max 15 g/day" },
    { label: "Nuts", value: "Max 20 g/day" },
    { label: "Honey", value: "Max 5 g/day" },
    { label: "Bread", value: "Max 2 slices/day" },
    { label: "Rice", value: "Max 100 g cooked/day" },
    { label: "Pasta", value: "Max 70 g dry/day" },
    { label: "Soft Drinks", value: "None" },
    { label: "Sweets", value: "None" },
    { label: "Fried Food", value: "None" },
  ],

  proteinRotation: {
    saturday: { lunch: "Chicken", dinner: "Chicken" },
    sunday: { lunch: "Fish", dinner: "Chicken" },
    monday: { lunch: "Beef", dinner: "Chicken" },
    tuesday: { lunch: "Chicken", dinner: "Fish" },
    wednesday: { lunch: "Shrimp", dinner: "Chicken" },
    thursday: { lunch: "Fish", dinner: "Shrimp" },
    friday: { lunch: "Beef", dinner: "Eggs" },
  },

  cheatMeal: "One meal only per week: Pizza OR Burger OR Dessert (not a full cheat day).",
};

export const DAY_ORDER: (keyof WeeklyPlan["proteinRotation"])[] = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

export const DAY_LABELS_FA: Record<string, string> = {
  saturday: "شنبه",
  sunday: "یکشنبه",
  monday: "دوشنبه",
  tuesday: "سه‌شنبه",
  wednesday: "چهارشنبه",
  thursday: "پنجشنبه",
  friday: "جمعه",
};

export const MEAL_SLOT_LABELS_FA: Record<string, string> = {
  breakfast: "صبحانه",
  snack_am: "میان‌وعده صبح",
  lunch: "ناهار",
  snack_pm: "میان‌وعده عصر",
  dinner: "شام",
  before_bed: "قبل خواب",
};
