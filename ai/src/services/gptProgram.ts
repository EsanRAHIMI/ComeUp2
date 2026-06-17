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
  day: z.number().int().min(1),
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

function systemPrompt(profile: ProgramGenerateInput['profile']) {
  return [
    'You are an expert strength & conditioning coach building safe, personalized gym programs.',
    'Always return STRICT JSON only (no markdown) matching exactly this TypeScript type:',
    '{ "reply": string, "program": {',
    '  "name": string, "description": string,',
    '  "difficulty": "Beginner"|"Intermediate"|"Advanced", "goal": string,',
    '  "daysPerWeek": number, "sessionDuration": number,',
    '  "days": [{ "day": number, "title": string, "focus": string,',
    '    "exercises": [{ "name": string, "sets": number, "reps": number, "repRange": string,',
    '      "restTime": number, "instructions": string, "muscleGroups": string[], "equipment": string[] }] }],',
    '  "nutrition": { "calories": string, "protein": string, "mealRule": string, "notes": string[] },',
    '  "supplements": string[], "executionRules": string[], "longTermGoal": string } }',
    '',
    'Rules:',
    '- "reply" is a short, friendly summary of what you built or changed (1-3 sentences).',
    '- Respect the user profile: goal, fitness level, available equipment, injuries (program around them), and preferred training days.',
    '- restTime is in seconds. muscleGroups use lowercase tokens like "chest","back","legs","glutes","hamstrings","quads","shoulders","biceps","triceps","core","calves","cardio".',
    '- Keep each session within the requested duration. Never prescribe movements that aggravate a stated injury.',
    '',
    'User profile:',
    JSON.stringify(profile),
  ].join('\n');
}

export async function generateGptProgram(input: ProgramGenerateInput): Promise<z.infer<typeof responseSchema>> {
  if (!env.GPT_API_KEY) {
    throw new GptError('GPT is not configured on the server', 503);
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt(input.profile) },
  ];
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

  let response: Response;
  try {
    response = await fetch(`${env.GPT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.GPT_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GPT_MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages,
      }),
    });
  } catch {
    throw new GptError('Could not reach the GPT provider', 502);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new GptError(`GPT provider error ${response.status}: ${detail.slice(0, 200)}`, 502);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new GptError('GPT returned an empty response', 502);

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new GptError('GPT returned invalid JSON', 502);
  }

  const result = responseSchema.safeParse(parsed);
  if (!result.success) {
    throw new GptError('GPT response did not match the program schema', 502);
  }
  return result.data;
}
