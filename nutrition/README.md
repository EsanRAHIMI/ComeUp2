# Nutrition Module (legacy reference)

This folder was the original Next.js + SQLite prototype. **ComeUp now uses MongoDB Atlas for all nutrition data** via `backend/src/routes/nutrition.ts`.

**Domain types** live in `shared/domain` (`@comeup/domain`) — do not duplicate types here.

Do not copy the SQLite routes or `better-sqlite3` setup into production. Use the integrated stack instead:

- **Shared types:** `shared/domain/src/nutrition.ts`
- **Backend models:** `backend/src/models/Nutrition*.ts`
- **API:** `/api/v1/nutrition/*`
- **UI:** `ui/src/views/NutritionView.tsx` + `ui/src/components/nutrition/*`

The structured meal plan seed lives in `backend/src/data/defaultMealPlan.ts`.
