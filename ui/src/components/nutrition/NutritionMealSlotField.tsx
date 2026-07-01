import { MEAL_SLOT_IDS, MEAL_SLOT_LABELS_FA } from '@comeup/domain';
import type { MealSlotId } from '@comeup/domain';

type Props = {
  value: MealSlotId;
  onChange: (value: MealSlotId) => void;
};

export function NutritionMealSlotField({ value, onChange }: Props) {
  return (
    <label className="field">
      <span>وعده</span>
      <select value={value} onChange={(event) => onChange(event.target.value as MealSlotId)}>
        {MEAL_SLOT_IDS.map((slot) => (
          <option key={slot} value={slot}>
            {MEAL_SLOT_LABELS_FA[slot]}
          </option>
        ))}
      </select>
    </label>
  );
}
