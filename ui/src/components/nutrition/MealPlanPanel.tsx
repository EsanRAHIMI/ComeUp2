import { Clock3, Salad } from 'lucide-react';
import { useState } from 'react';
import {
  DAY_ORDER,
  todayPlanDay,
  type DayOfWeek,
  type MealSlotId,
  type NutritionPlan,
} from '@comeup/domain';
import { useT } from '../../i18n/LocaleProvider';

type Props = {
  plan: NutritionPlan;
};

export function MealPlanPanel({ plan }: Props) {
  const t = useT();
  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => todayPlanDay());
  const rotation = plan.proteinRotation[activeDay];

  function mealSlotLabel(id: string) {
    return t.nutrition.mealSlots[id as MealSlotId] ?? id;
  }

  return (
    <div className="nutrition-panel">
      <section className="card">
        <div className="card__head">
          <div>
            <p className="eyebrow">{t.nutrition.weeklyPlan}</p>
            <h3>{t.nutrition.planDays[activeDay]}</h3>
          </div>
          <span className="card__head-icon" aria-hidden>
            <Salad size={20} />
          </span>
        </div>

        <div className="chip-toggle">
          {DAY_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              className={`chip-toggle__item ${activeDay === day ? 'is-on' : ''}`}
              onClick={() => setActiveDay(day)}
            >
              {t.nutrition.planDays[day]}
            </button>
          ))}
        </div>

        {rotation ? (
          <p className="nutrition-meta muted">
            {t.nutrition.lunchColon} {rotation.lunch} · {t.nutrition.dinnerColon} {rotation.dinner}
          </p>
        ) : null}
      </section>

      {plan.slots.map((slot) => {
        const dayMeal = slot.byDay?.[activeDay];
        return (
          <section key={slot.id} className="card nutrition-meal">
            <div className="card__head nutrition-meal__head">
              <div>
                <p className="eyebrow">{mealSlotLabel(slot.id) ?? slot.title}</p>
                <h3>{slot.title}</h3>
              </div>
              <span className="chip">
                <Clock3 size={12} aria-hidden /> {slot.time}
              </span>
            </div>

            {dayMeal ? (
              <ul className="nutrition-meal__list">
                {dayMeal.items.map((item, index) => (
                  <li key={index} className="history-row nutrition-meal__row">
                    <div className="history-row__body">
                      <strong>{item.name}</strong>
                      {item.amount ? <small>{item.amount}</small> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {slot.options ? (
              <div className="nutrition-meal__options">
                {slot.options.map((option, index) => (
                  <div key={index} className="nutrition-meal__option">
                    {option.label ? <p className="eyebrow">{option.label}</p> : null}
                    <ul className="nutrition-meal__list">
                      {option.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="history-row nutrition-meal__row">
                          <div className="history-row__body">
                            <strong>{item.name}</strong>
                            {item.amount ? <small>{item.amount}</small> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}

      <section className="card">
        <div className="card__head">
          <div>
            <p className="eyebrow">{t.nutrition.constraints}</p>
            <h3>{t.nutrition.dailyRules}</h3>
          </div>
        </div>
        <ul className="nutrition-rules__grid">
          {plan.dailyRules.map((rule, index) => (
            <li key={index}>
              <strong>{rule.label}</strong>
              <span className="muted">{rule.value}</span>
            </li>
          ))}
        </ul>
      </section>

      {plan.vegetableChoices.length ? (
        <section className="card">
          <div className="card__head">
            <div>
              <p className="eyebrow">{t.nutrition.freeChoice}</p>
              <h3>{t.nutrition.vegetables}</h3>
            </div>
          </div>
          <div className="tag-row">
            {plan.vegetableChoices.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {plan.cheatMeal ? (
        <section className="card nutrition-cheat">
          <p className="eyebrow">{t.nutrition.cheatMeal}</p>
          <p className="muted">{plan.cheatMeal}</p>
        </section>
      ) : null}
    </div>
  );
}
