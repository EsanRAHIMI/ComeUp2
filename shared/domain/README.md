# @comeup/domain

Shared domain types and constants used by **backend**, **ui**, and (later) **ai**.

## Nutrition

```ts
import {
  type NutritionPlan,
  type NutritionWeighLog,
  MEAL_SLOT_IDS,
  MEAL_SLOT_LABELS_FA,
  todayPlanDay,
} from '@comeup/domain';
```

## Build

```bash
cd shared/domain && npm install && npm run build
```

Backend and UI run `build:domain` automatically before `build` / `dev`.
