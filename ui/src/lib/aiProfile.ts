import type { User } from '../types';
import type { AiProfileContext } from '../components/AiGeneratingPanel';

export function profileContextFromUser(user: User | null | undefined): AiProfileContext | null {
  if (!user) return null;
  return {
    name: user.name,
    goal: user.goal,
    fitnessLevel: user.fitnessLevel,
    workoutDaysPerWeek: user.workoutDaysPerWeek,
    sessionDuration: user.sessionDuration,
    equipment: user.availableEquipment,
    injuries: user.injuries,
  };
}
