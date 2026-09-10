import { MEAL_SLOT_IDS } from '@comeup/domain';
import type { MealSlotId } from '@comeup/domain';
import { useT } from '../../i18n/LocaleProvider';

type Props = {
  value: MealSlotId;
  onChange: (value: MealSlotId) => void;
};

export function NutritionMealSlotField({ value, onChange }: Props) {
  const t = useT();
  return (
    <label className="field">
      <span>{t.nutrition.mealSlot}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as MealSlotId)}>
        {MEAL_SLOT_IDS.map((slot) => (
          <option key={slot} value={slot}>
            {t.nutrition.mealSlots[slot]}
          </option>
        ))}
      </select>
    </label>
  );
}
