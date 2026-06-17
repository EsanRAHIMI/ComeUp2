// Exercise name → muscle-group classification.
// Ordered, specificity-first rules. Compound terms (e.g. "leg curl", "leg press")
// are matched before generic ones (e.g. "curl", "press") so that, for example,
// "Dumbbell Curl" resolves to biceps — never glutes — and leg work is never
// tagged triceps. When nothing matches confidently the item is flagged for review.

export type Confidence = 'high' | 'low';

export type Classification = {
  groups: string[];
  confidence: Confidence;
  valid: boolean;
  needsReview: boolean;
  reason?: string;
};

// Words that are modifiers/notes, not real exercises.
const STOPWORDS = new Set([
  'close',
  'rest',
  'note',
  'notes',
  'superset',
  'super set',
  'dropset',
  'drop set',
  'warmup',
  'warm up',
  'warm-up',
  'cooldown',
  'cool down',
  'finisher',
  'circuit',
  'amrap',
  'emom',
  'tempo',
  'optional',
]);

type Rule = { groups: string[]; re: RegExp };

// Order matters: the most specific patterns come first.
const RULES: Rule[] = [
  // Posterior chain / hamstrings (must beat the generic "curl" → biceps rule)
  { groups: ['hamstrings'], re: /\b(leg curl|lying leg curl|seated leg curl|hamstring|nordic|romanian deadlift|rdl|good morning|stiff[- ]?leg)\b/i },
  // Deadlift (compound posterior + back)
  { groups: ['back', 'glutes', 'hamstrings'], re: /\b(deadlift|rack pull|ددلیفت)\b/i },
  // Glutes
  { groups: ['glutes'], re: /\b(hip thrust|glute bridge|glute|hip abduction|kickback machine|thruster|باسن)\b/i },
  // Calves
  { groups: ['calves'], re: /\b(calf|calves|standing calf|seated calf|ساق)\b/i },
  // Quads (isolation / machine)
  { groups: ['quads'], re: /\b(leg extension|leg press|hack squat|sissy squat)\b/i },
  // Quads + glutes (compound legs)
  { groups: ['quads', 'glutes'], re: /\b(squat|lunge|split squat|bulgarian|step[- ]?up|goblet|wall sit|pistol|ران|پا)\b/i },
  // Biceps (named)
  { groups: ['biceps'], re: /\b(bicep|biceps|preacher|concentration curl|hammer curl|incline curl|spider curl|drag curl|چکشی|جلو ?بازو)\b/i },
  // Biceps (generic curl, but NOT leg/hamstring/skull curl)
  { groups: ['biceps'], re: /(?<!leg )(?<!hamstring )(?<!ham )(?<!skull )\bcurl\b/i },
  // Triceps (note: only full words — never the loose "tri")
  { groups: ['triceps'], re: /\b(tricep|triceps|push[- ]?down|pressdown|skull ?crusher|skullcrusher|kickback|overhead extension|close[- ]?grip bench|dip|پشت ?بازو)\b/i },
  // Chest
  { groups: ['chest'], re: /\b(bench press|incline press|decline press|chest press|chest fly|pec ?deck|pectoral|push[- ]?up|cable fly|dumbbell fly|سینه|پرس سینه)\b/i },
  // Back
  { groups: ['back'], re: /\b(row|pulldown|pull[- ]?down|pull[- ]?up|chin[- ]?up|lat\b|latissimus|shrug|face pull|زیربغل|لت)\b/i },
  // Shoulders
  { groups: ['shoulders'], re: /\b(shoulder press|overhead press|ohp|military press|arnold|lateral raise|side raise|front raise|rear delt|delt|upright row|نشر|سرشانه)\b/i },
  // Core
  { groups: ['core'], re: /\b(plank|crunch|sit[- ]?up|leg raise|hanging|ab wheel|russian twist|hollow|core|abs?|شکم|پلانک)\b/i },
  // Cardio
  { groups: ['cardio'], re: /\b(run|running|treadmill|jog|cycle|bike|elliptical|rowing machine|jump rope|burpee|hiit|sprint|cardio|دویدن)\b/i },
];

export function isValidExerciseName(name: string): boolean {
  const cleaned = name.trim().toLowerCase();
  if (STOPWORDS.has(cleaned)) return false;
  const letters = (cleaned.match(/[a-z؀-ۿ]/g) ?? []).length;
  // Need at least a couple of real letters and a plausible token length.
  return letters >= 3 && cleaned.length >= 3;
}

export function classifyExercise(name: string): Classification {
  if (!isValidExerciseName(name)) {
    return {
      groups: ['full body'],
      confidence: 'low',
      valid: false,
      needsReview: true,
      reason: `"${name.trim()}" is not a recognizable exercise name`,
    };
  }

  const groups = new Set<string>();
  for (const rule of RULES) {
    if (rule.re.test(name)) rule.groups.forEach((g) => groups.add(g));
  }

  if (groups.size === 0) {
    return {
      groups: ['full body'],
      confidence: 'low',
      valid: true,
      needsReview: true,
      reason: 'Muscle group could not be determined with confidence',
    };
  }

  return { groups: [...groups], confidence: 'high', valid: true, needsReview: false };
}
