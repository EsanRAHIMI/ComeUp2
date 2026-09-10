/** Normalize a User document into the safe public shape returned to clients. */
import { isAdminEmail } from './admin.js';

export function publicUser(user: any) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    isAdmin: isAdminEmail(user.email),
    age: user.age,
    height: user.height,
    weight: user.weight,
    gender: user.gender,
    injuries: user.injuries ?? [],
    availableEquipment: user.availableEquipment ?? [],
    preferredDays: user.preferredDays ?? [],
    sessionDuration: user.sessionDuration,
    goal: user.goal,
    fitnessLevel: user.fitnessLevel,
    workoutDaysPerWeek: user.workoutDaysPerWeek,
    // Phase 3 additions — absent on older documents, so they serialize as undefined.
    targetWeight: user.targetWeight,
    goalDeadline: user.goalDeadline ? user.goalDeadline.toISOString().slice(0, 10) : undefined,
    muscleFocus: user.muscleFocus ?? [],
    physicalLimitations: user.physicalLimitations ?? [],
    nutritionPreference: user.nutritionPreference,
    supplements: user.supplements ?? [],
    waterTargetMl: user.waterTargetMl,
    walkingTarget: user.walkingTarget
      ? { metric: user.walkingTarget.metric, value: user.walkingTarget.value }
      : undefined,
    missedWorkoutBehavior: user.missedWorkoutBehavior ?? 'shift',
    preferences: user.preferences
      ? {
          autoRestTimer: user.preferences.autoRestTimer,
          defaultRestSeconds: user.preferences.defaultRestSeconds,
          restCountdownSound: user.preferences.restCountdownSound,
        }
      : undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
