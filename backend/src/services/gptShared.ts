import { Program } from '../models/Program.js';
import { normalizeGptProgram } from './programNormalizer.js';

export type ProfileSource = {
  name?: string | null;
  gender?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  goal?: string | null;
  fitnessLevel?: string | null;
  workoutDaysPerWeek?: number | null;
  injuries?: string[] | null;
  availableEquipment?: string[] | null;
  preferredDays?: number[] | null;
  sessionDuration?: number | null;
};

export type QuickGenerateOverrides = {
  goal?: string;
  fitnessLevel?: string;
  duration?: number;
  equipment?: string[];
  focusAreas?: string[];
  daysPerWeek?: number;
  notes?: string;
};

export function buildProfile(user: ProfileSource) {
  return {
    name: user.name ?? undefined,
    gender: user.gender ?? undefined,
    age: user.age ?? undefined,
    height: user.height ?? undefined,
    weight: user.weight ?? undefined,
    goal: user.goal ?? undefined,
    fitnessLevel: user.fitnessLevel ?? undefined,
    workoutDaysPerWeek: user.workoutDaysPerWeek ?? undefined,
    sessionDuration: user.sessionDuration ?? undefined,
    injuries: user.injuries ?? [],
    availableEquipment: user.availableEquipment ?? [],
    preferredDays: user.preferredDays ?? [],
  };
}

export function mergeProfile(user: ProfileSource, overrides: QuickGenerateOverrides) {
  const base = buildProfile(user);
  return {
    ...base,
    goal: overrides.goal ?? base.goal,
    fitnessLevel: overrides.fitnessLevel ?? base.fitnessLevel,
    workoutDaysPerWeek: overrides.daysPerWeek ?? base.workoutDaysPerWeek,
    sessionDuration: overrides.duration ?? base.sessionDuration,
    availableEquipment:
      overrides.equipment?.length ? overrides.equipment : base.availableEquipment,
  };
}

export function buildQuickGeneratePrompt(overrides: QuickGenerateOverrides, profile: ReturnType<typeof buildProfile>) {
  const days = profile.workoutDaysPerWeek ?? 3;
  const minutes = profile.sessionDuration ?? 60;
  const parts = [
    `Design a professional, evidence-based ${days}-day per week training program tailored to me.`,
    `Primary goal: ${profile.goal ?? 'General Fitness'}.`,
    `Fitness level: ${profile.fitnessLevel ?? 'Intermediate'}.`,
    `Each session should fit within ${minutes} minutes including warm-up.`,
  ];

  if (profile.age) parts.push(`Age: ${profile.age}.`);
  if (profile.weight) parts.push(`Body weight: ${profile.weight} kg.`);
  if (profile.gender && profile.gender !== 'undisclosed') parts.push(`Gender: ${profile.gender}.`);

  if (profile.availableEquipment?.length) {
    parts.push(`Use only this equipment: ${profile.availableEquipment.join(', ')}.`);
  }
  if (profile.injuries?.length) {
    parts.push(`Injuries/limitations to respect: ${profile.injuries.join(', ')}.`);
  }
  if (profile.preferredDays?.length) {
    parts.push(`Preferred training weekdays (0=Sun … 6=Sat): ${profile.preferredDays.join(', ')}.`);
  }
  if (overrides.focusAreas?.length) {
    parts.push(`Extra emphasis on: ${overrides.focusAreas.join(', ')}.`);
  }
  if (overrides.notes?.trim()) {
    parts.push(overrides.notes.trim());
  }

  parts.push('Include balanced progression, clear exercise selection, and practical nutrition guidance.');
  return parts.join(' ');
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function saveDraftAsProgram(
  userId: string,
  draftProgram: unknown,
  user: ProfileSource | null,
  activate: boolean,
  opts?: { startDate?: string; workoutTime?: string; weeks?: number },
) {
  const programInput = normalizeGptProgram(draftProgram, {
    startDate: opts?.startDate ?? todayDate(),
    workoutTime: opts?.workoutTime ?? '18:00',
    weeks: opts?.weeks ?? 8,
    preferredDays: user?.preferredDays ?? undefined,
  });

  const program = await Program.create({ ...programInput, ownerId: userId });

  if (activate) {
    await Program.updateMany({ ownerId: userId }, { isActive: false });
    program.isActive = true;
    await program.save();
  }

  return program;
}
