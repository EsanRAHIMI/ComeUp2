/** Normalize a User document into the safe public shape returned to clients. */
export function publicUser(user: any) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
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
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
