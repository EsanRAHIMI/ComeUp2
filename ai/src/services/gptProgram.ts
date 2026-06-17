import { z } from 'zod';
import { env } from '../config/env.js';

export class GptError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
    this.name = 'GptError';
  }
}

// ---- Request contract (from backend) ----
export const programGenerateSchema = z.object({
  profile: z.object({
    name: z.string().optional(),
    gender: z.string().optional(),
    age: z.number().optional(),
    height: z.number().optional(),
    weight: z.number().optional(),
    goal: z.string().optional(),
    fitnessLevel: z.string().optional(),
    workoutDaysPerWeek: z.number().optional(),
    sessionDuration: z.number().optional(),
    injuries: z.array(z.string()).default([]),
    availableEquipment: z.array(z.string()).default([]),
    preferredDays: z.array(z.number()).default([]),
  }),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .default([]),
  currentDraft: z.unknown().optional(),
});

export type ProgramGenerateInput = z.infer<typeof programGenerateSchema>;

// ---- Structured program GPT must return ----
const gptExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(300),
  repRange: z.string().optional().default(''),
  restTime: z.number().int().min(0).max(900),
  instructions: z.string().optional().default(''),
  muscleGroups: z.array(z.string()).default([]),
  equipment: z.array(z.string()).optional().default([]),
});

const gptDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  title: z.string(),
  focus: z.string().optional().default(''),
  exercises: z.array(gptExerciseSchema).min(1),
});

const gptProgramSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  goal: z.string().optional().default(''),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionDuration: z.number().int().min(20).max(180).default(60),
  days: z.array(gptDaySchema).min(1),
  nutrition: z
    .object({
      calories: z.string().optional().default(''),
      protein: z.string().optional().default(''),
      mealRule: z.string().optional().default(''),
      notes: z.array(z.string()).optional().default([]),
    })
    .optional(),
  supplements: z.array(z.string()).optional().default([]),
  executionRules: z.array(z.string()).optional().default([]),
  longTermGoal: z.string().optional().default(''),
});

export type GptProgram = z.infer<typeof gptProgramSchema>;

const responseSchema = z.object({
  reply: z.string(),
  program: gptProgramSchema,
});

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toInt(value: unknown, fallback: number, min = 0, max = 9999): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(max, Math.max(min, Math.round(value)));
  }
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) return Math.min(max, Math.max(min, parseInt(match[0], 10)));
  }
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normalizeDifficulty(value: unknown, fallback: 'Beginner' | 'Intermediate' | 'Advanced'): 'Beginner' | 'Intermediate' | 'Advanced' {
  const raw = String(value ?? fallback).toLowerCase();
  if (raw.startsWith('beg')) return 'Beginner';
  if (raw.startsWith('adv')) return 'Advanced';
  if (raw.startsWith('int')) return 'Intermediate';
  return fallback;
}

function normalizeExercise(raw: unknown) {
  const ex = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    name: String(ex.name ?? 'Exercise').trim() || 'Exercise',
    sets: toInt(ex.sets, 3, 1, 20),
    reps: toInt(ex.reps, 10, 1, 300),
    repRange: String(ex.repRange ?? ex.rep_range ?? ''),
    restTime: toInt(ex.restTime ?? ex.rest_time ?? ex.rest, 90, 0, 900),
    instructions: String(ex.instructions ?? ex.notes ?? ''),
    muscleGroups: toStringArray(ex.muscleGroups ?? ex.muscle_groups).map((g) => g.toLowerCase()),
    equipment: toStringArray(ex.equipment),
  };
}

function normalizeDay(raw: unknown, index: number) {
  const day = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const exercises = Array.isArray(day.exercises) ? day.exercises.map(normalizeExercise) : [];
  return {
    day: toInt(day.day, index + 1, 1, 7),
    title: String(day.title ?? `Day ${index + 1}`).trim() || `Day ${index + 1}`,
    focus: String(day.focus ?? day.title ?? ''),
    exercises: exercises.length > 0 ? exercises : [normalizeExercise({ name: 'Bodyweight Squat', sets: 3, reps: 12, restTime: 60, muscleGroups: ['legs'] })],
  };
}

/** Coerce loosely-typed GPT JSON into our strict schema before validation. */
export function normalizeGptResponse(raw: unknown, profile: ProgramGenerateInput['profile']) {
  const root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const programRaw = (root.program && typeof root.program === 'object' ? root.program : root) as Record<string, unknown>;
  const fallbackDifficulty = normalizeDifficulty(profile.fitnessLevel, 'Intermediate');
  const days = Array.isArray(programRaw.days) ? programRaw.days.map(normalizeDay) : [];
  const daysPerWeek = toInt(programRaw.daysPerWeek ?? programRaw.days_per_week, (profile.workoutDaysPerWeek ?? days.length) || 3, 1, 7);

  return {
    reply: String(root.reply ?? programRaw.reply ?? 'Your personalized program is ready.'),
    program: {
      name: String(programRaw.name ?? 'Personalized Program').trim() || 'Personalized Program',
      description: String(programRaw.description ?? ''),
      difficulty: normalizeDifficulty(programRaw.difficulty, fallbackDifficulty),
      goal: String(programRaw.goal ?? profile.goal ?? ''),
      daysPerWeek,
      sessionDuration: toInt(programRaw.sessionDuration ?? programRaw.session_duration, profile.sessionDuration ?? 60, 20, 180),
      days: days.length > 0 ? days.slice(0, daysPerWeek) : [normalizeDay({ day: 1, title: 'Full Body', exercises: [] }, 0)],
      nutrition: {
        calories: String((programRaw.nutrition as Record<string, unknown> | undefined)?.calories ?? ''),
        protein: String((programRaw.nutrition as Record<string, unknown> | undefined)?.protein ?? ''),
        mealRule: String((programRaw.nutrition as Record<string, unknown> | undefined)?.mealRule ?? ''),
        notes: toStringArray((programRaw.nutrition as Record<string, unknown> | undefined)?.notes),
      },
      supplements: toStringArray(programRaw.supplements),
      executionRules: toStringArray(programRaw.executionRules ?? programRaw.execution_rules),
      longTermGoal: String(programRaw.longTermGoal ?? programRaw.long_term_goal ?? ''),
    },
  };
}

function preferredDaysHint(preferredDays: number[]) {
  if (!preferredDays.length) return 'No preferred weekdays set — spread sessions evenly across the week.';
  const labels = preferredDays.map((d) => `${d} (${WEEKDAY_LABELS[d] ?? 'day'})`).join(', ');
  return `Preferred training weekdays (0=Sun … 6=Sat): ${labels}. Use these as the "day" field for each session when possible.`;
}

function systemPrompt(profile: ProgramGenerateInput['profile']) {
  const daysTarget = profile.workoutDaysPerWeek ?? 3;
  const sessionMinutes = profile.sessionDuration ?? 60;
  const injuryNote =
    profile.injuries?.length
      ? `Injuries/limitations: ${profile.injuries.join(', ')}. Substitute or avoid aggravating movements.`
      : 'No injuries reported.';
  const equipmentNote =
    profile.availableEquipment?.length
      ? `Available equipment: ${profile.availableEquipment.join(', ')}. Only prescribe exercises they can perform.`
      : 'No equipment listed — prefer bodyweight and minimal-equipment options unless the user asks otherwise.';

  return [
    'You are a professional, dedicated strength & conditioning coach. Build safe, effective, personalized gym programs.',
    'Return STRICT JSON only (no markdown fences) matching this shape:',
    '{ "reply": string, "program": { "name", "description", "difficulty", "goal", "daysPerWeek", "sessionDuration",',
    '  "days": [{ "day", "title", "focus", "exercises": [{ "name", "sets", "reps", "repRange", "restTime", "instructions", "muscleGroups", "equipment" }] }],',
    '  "nutrition": { "calories", "protein", "mealRule", "notes" }, "supplements", "executionRules", "longTermGoal" } }',
    '',
    'Coaching standards:',
    `- Build exactly ${daysTarget} training days unless the user explicitly asks to change frequency.`,
    `- Each session must fit within ${sessionMinutes} minutes including warm-up.`,
    `- Match difficulty to fitness level: ${profile.fitnessLevel ?? 'Intermediate'}.`,
    `- Primary goal: ${profile.goal ?? 'General Fitness'}.`,
    `- ${injuryNote}`,
    `- ${equipmentNote}`,
    `- ${preferredDaysHint(profile.preferredDays ?? [])}`,
    '- "reply": warm, professional summary (2-3 sentences) explaining what you built and why it fits the user.',
    '- sets, reps, restTime MUST be JSON numbers (not strings). restTime is seconds.',
    '- difficulty MUST be exactly "Beginner", "Intermediate", or "Advanced" (capitalized).',
    '- muscleGroups: lowercase tokens like chest, back, legs, glutes, hamstrings, quads, shoulders, biceps, triceps, core, calves, cardio.',
    '- Include practical nutrition guidance scaled to the user\'s goal, age, and weight when known.',
    '- executionRules: 3-5 actionable coaching cues (warm-up, progression, deload, form focus).',
  ].join('\n');
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function callGpt(messages: ChatMessage[]): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(`${env.GPT_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.GPT_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GPT_MODEL,
        temperature: 0.35,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new GptError(`GPT provider error ${response.status}: ${detail.slice(0, 200)}`, 502);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new GptError('GPT returned an empty response', 502);
    return content;
  } catch (error) {
    if (error instanceof GptError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GptError('GPT request timed out — please try again', 504);
    }
    throw new GptError('Could not reach the GPT provider', 502);
  } finally {
    clearTimeout(timeout);
  }
}

function buildMessages(input: ProgramGenerateInput, repairHint?: string): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt(input.profile) }];
  if (input.currentDraft) {
    messages.push({
      role: 'assistant',
      content: `Current draft program JSON:\n${JSON.stringify(input.currentDraft)}`,
    });
  }
  for (const m of input.messages) messages.push(m);
  if (messages.length === 1) {
    messages.push({ role: 'user', content: 'Create my first personalized program based on my profile.' });
  }
  if (repairHint) {
    messages.push({
      role: 'user',
      content: repairHint,
    });
  }
  return messages;
}

const MAX_ATTEMPTS = 3;

export async function generateGptProgram(input: ProgramGenerateInput): Promise<z.infer<typeof responseSchema>> {
  if (!env.GPT_API_KEY) {
    throw new GptError('GPT is not configured on the server', 503);
  }

  let lastIssues = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const repairHint =
      attempt > 1
        ? `Your previous JSON was invalid (${lastIssues}). Return corrected STRICT JSON only. sets, reps, restTime must be numbers; difficulty must be Beginner|Intermediate|Advanced.`
        : undefined;

    const content = await callGpt(buildMessages(input, repairHint));

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      lastIssues = 'invalid JSON';
      continue;
    }

    const normalized = normalizeGptResponse(parsed, input.profile);
    const result = responseSchema.safeParse(normalized);
    if (result.success) return result.data;

    lastIssues = result.error.issues.map((i) => i.path.join('.')).join(', ') || 'schema mismatch';
  }

  throw new GptError('GPT could not produce a valid program — please try again', 502);
}
