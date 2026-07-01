import type {
  AiConversation,
  ExerciseMedia,
  FitnessLevel,
  GptDraftProgram,
  GptQuota,
  Goal,
  ImportReviewItem,
  Measurement,
  Program,
  ReportOverview,
  User,
  WeeklyReport,
  DailyReport,
  WorkoutSession,
} from '../types';
import type { NutritionGeneratedPlate, NutritionPlan, NutritionPlatePhoto, NutritionWeighLog } from '@comeup/domain';
import { apiRequest, apiUpload } from './client';

export { API_BASE_URL, ApiError, buildApiUrl } from './client';

type LoginBody = { email: string; password: string };
type RegisterBody = {
  name: string;
  email: string;
  password: string;
  goal: Goal;
  fitnessLevel: FitnessLevel;
};

export const authApi = {
  login: (body: LoginBody) =>
    apiRequest<{ token: string; user: User }>('/api/v1/auth/login', null, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  register: (body: RegisterBody) =>
    apiRequest<{ token: string; user: User }>('/api/v1/auth/register', null, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: (token: string) => apiRequest<{ user: User }>('/api/v1/auth/me', token),
  forgotPassword: (body: { email: string }) =>
    apiRequest<{ message: string }>('/api/v1/auth/forgot-password', null, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  resetPassword: (body: { token: string; password: string }) =>
    apiRequest<{ message: string }>('/api/v1/auth/reset-password', null, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const programsApi = {
  list: (token: string) => apiRequest<{ programs: Program[] }>('/api/v1/programs', token),
  create: (token: string, program: Partial<Program>) =>
    apiRequest<{ program: Program }>('/api/v1/programs', token, {
      method: 'POST',
      body: JSON.stringify(program),
    }),
  activate: (token: string, id: string) =>
    apiRequest<{ program: Program }>(`/api/v1/programs/${id}/activate`, token, { method: 'POST' }),
  share: (token: string, id: string) =>
    apiRequest<{ shareCode: string; program: Program }>(`/api/v1/programs/${id}/share`, token, {
      method: 'POST',
    }),
  importCoachPlan: (
    token: string,
    body: { text: string; startDate: string; workoutTime: string; weeks: number; sessionDuration: number },
  ) =>
    apiRequest<{ program: Program }>('/api/v1/programs/import-coach-plan', token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  importCoachPlanPreview: (
    token: string,
    body: { text: string; startDate: string; workoutTime: string; weeks: number; sessionDuration: number },
  ) =>
    apiRequest<{ program: Partial<Program>; review: ImportReviewItem[]; flaggedCount: number }>(
      '/api/v1/programs/import-coach-plan/preview',
      token,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  update: (token: string, id: string, patch: Partial<Program>) =>
    apiRequest<{ program: Program }>(`/api/v1/programs/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  duplicate: (token: string, id: string) =>
    apiRequest<{ program: Program }>(`/api/v1/programs/${id}/duplicate`, token, { method: 'POST' }),
  importByCode: (token: string, shareCode: string) =>
    apiRequest<{ program: Program }>(`/api/v1/programs/import/${encodeURIComponent(shareCode)}`, token, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  remove: (token: string, id: string) =>
    apiRequest<void>(`/api/v1/programs/${id}`, token, { method: 'DELETE' }),
  generate: (
    token: string,
    body: {
      goal: Goal;
      fitnessLevel: FitnessLevel;
      duration: number;
      equipment: string[];
      focusAreas: string[];
      daysPerWeek?: number;
      notes?: string;
    },
  ) =>
    apiRequest<{
      reply: string;
      draftProgram: GptDraftProgram;
      conversationId: string;
      quota: GptQuota;
    }>('/api/v1/ai/workouts/generate', token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const sessionsApi = {
  start: (token: string, programId: string) =>
    apiRequest<{ session: WorkoutSession }>('/api/v1/sessions/start', token, {
      method: 'POST',
      body: JSON.stringify({ programId }),
    }),
  complete: (
    token: string,
    id: string,
    body: {
      exercises: WorkoutSession['exercises'];
      totalDuration: number;
      caloriesBurned: number;
      averageFormScore: number;
      endTime?: string;
    },
  ) =>
    apiRequest<{ session: WorkoutSession }>(`/api/v1/sessions/${id}/complete`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  list: (token: string) => apiRequest<{ sessions: WorkoutSession[] }>('/api/v1/sessions', token),
};

export const mediaApi = {
  list: (token: string) => apiRequest<{ media: ExerciseMedia[] }>('/api/v1/exercise-media', token),
  upsert: (token: string, exerciseName: string, imageUrl: string) =>
    apiRequest<{ media: ExerciseMedia }>('/api/v1/exercise-media', token, {
      method: 'PUT',
      body: JSON.stringify({ exerciseName, imageUrl }),
    }),
};

export const profileApi = {
  update: (token: string, patch: Partial<User>) =>
    apiRequest<{ user: User }>('/api/v1/profile', token, { method: 'PATCH', body: JSON.stringify(patch) }),
};

export const chatApi = {
  quota: (token: string) => apiRequest<{ quota: GptQuota }>('/api/v1/ai/program-chat/quota', token),
  start: (token: string) =>
    apiRequest<{ conversation: AiConversation; quota: GptQuota }>('/api/v1/ai/program-chat/start', token, {
      method: 'POST',
    }),
  get: (token: string, id: string) =>
    apiRequest<{ conversation: AiConversation; quota: GptQuota }>(`/api/v1/ai/program-chat/${id}`, token),
  message: (token: string, id: string, content: string) =>
    apiRequest<{
      reply: string;
      draftProgram: GptDraftProgram;
      quota: GptQuota;
      program?: Program;
      activated?: boolean;
    }>(
      `/api/v1/ai/program-chat/${id}/message`,
      token,
      { method: 'POST', body: JSON.stringify({ content }) },
    ),
  convert: (token: string, id: string, body: { activate?: boolean; startDate?: string; workoutTime?: string; weeks?: number }) =>
    apiRequest<{ program: Program }>(`/api/v1/ai/program-chat/${id}/convert-to-program`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const reportsApi = {
  weekly: (token: string) => apiRequest<WeeklyReport>('/api/v1/reports/weekly', token),
  overview: (token: string) => apiRequest<ReportOverview>('/api/v1/reports/overview', token),
  daily: (token: string) => apiRequest<DailyReport>('/api/v1/reports/daily', token),
};

export const measurementsApi = {
  list: (token: string) => apiRequest<{ measurements: Measurement[] }>('/api/v1/measurements', token),
  create: (token: string, body: Partial<Measurement>) =>
    apiRequest<{ measurement: Measurement }>('/api/v1/measurements', token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const nutritionApi = {
  activePlan: (token: string) =>
    apiRequest<{ plan: NutritionPlan }>('/api/v1/nutrition/plan/active', token),
  logs: (token: string, date: string) =>
    apiRequest<{ logs: NutritionWeighLog[] }>(`/api/v1/nutrition/logs?date=${encodeURIComponent(date)}`, token),
  createLog: (
    token: string,
    body: { date: string; mealSlot: NutritionWeighLog['mealSlot']; foodName: string; weightGrams: number; note?: string },
  ) =>
    apiRequest<{ log: NutritionWeighLog }>('/api/v1/nutrition/logs', token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteLog: (token: string, id: string) =>
    apiRequest<{ ok: true }>(`/api/v1/nutrition/logs/${encodeURIComponent(id)}`, token, {
      method: 'DELETE',
    }),
  logSummary: (token: string, from: string, to: string) =>
    apiRequest<{ byDate: Record<string, unknown[]>; dailyTotals: Record<string, Record<string, number>> }>(
      `/api/v1/nutrition/logs/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      token,
    ),
  photos: (token: string, date?: string) =>
    apiRequest<{ photos: NutritionPlatePhoto[] }>(
      date
        ? `/api/v1/nutrition/photos?date=${encodeURIComponent(date)}`
        : '/api/v1/nutrition/photos',
      token,
    ),
  uploadPhoto: (token: string, formData: FormData) =>
    apiUpload<{ photo: NutritionPlatePhoto }>('/api/v1/nutrition/photos', token, formData),
  plates: (token: string, date?: string) =>
    apiRequest<{ plates: NutritionGeneratedPlate[] }>(
      date
        ? `/api/v1/nutrition/plates?date=${encodeURIComponent(date)}`
        : '/api/v1/nutrition/plates',
      token,
    ),
  generatePlate: (token: string, body: { date: string; mealSlot: NutritionWeighLog['mealSlot'] }) =>
    apiRequest<{ plate: NutritionGeneratedPlate; prompt: string }>(
      '/api/v1/nutrition/plates/generate',
      token,
      { method: 'POST', body: JSON.stringify(body) },
    ),
};

export type AdminOverview = {
  users: number;
  programs: number;
  communityMedia: number;
  personalMedia: number;
  sessions: number;
  completedSessions: number;
  sessionsThisWeek: number;
};

export type AdminCatalogExercise = {
  exerciseKey: string;
  exerciseName: string;
  muscleGroups: string[];
  primaryGroup: string;
  programCount: number;
  hasImage: boolean;
  imageUrl?: string;
  mediaId?: string;
  needsReview: boolean;
};

export type AdminExerciseMediaPayload = {
  stats: {
    totalExercises: number;
    withImage: number;
    withoutImage: number;
    communityMedia: number;
    personalOverrides: number;
  };
  groups: string[];
  withImage: AdminCatalogExercise[];
  withoutImage: AdminCatalogExercise[];
  byGroup: Record<string, { withImage: AdminCatalogExercise[]; withoutImage: AdminCatalogExercise[] }>;
  community: Array<{
    id: string;
    exerciseKey: string;
    exerciseName: string;
    imageUrl: string;
    updatedAt?: string;
  }>;
  personal: Array<{
    id: string;
    exerciseKey: string;
    exerciseName: string;
    imageUrl: string;
    owner?: { name?: string; email?: string };
    updatedAt?: string;
  }>;
};

export const adminApi = {
  overview: (token: string) => apiRequest<AdminOverview>('/api/v1/admin/overview', token),
  users: (token: string, q?: string) =>
    apiRequest<{ users: User[] }>(`/api/v1/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, token),
  createUser: (token: string, body: { name: string; email: string; password: string; goal?: Goal; fitnessLevel?: FitnessLevel }) =>
    apiRequest<{ user: User }>('/api/v1/admin/users', token, { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (token: string, id: string, patch: Partial<User>) =>
    apiRequest<{ user: User }>(`/api/v1/admin/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteUser: (token: string, id: string) =>
    apiRequest<void>(`/api/v1/admin/users/${id}`, token, { method: 'DELETE' }),
  programs: (token: string, ownerId?: string) =>
    apiRequest<{ programs: Program[] }>(`/api/v1/admin/programs${ownerId ? `?ownerId=${ownerId}` : ''}`, token),
  updateProgram: (token: string, id: string, patch: Partial<Program>) =>
    apiRequest<{ program: Program }>(`/api/v1/admin/programs/${id}`, token, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteProgram: (token: string, id: string) =>
    apiRequest<void>(`/api/v1/admin/programs/${id}`, token, { method: 'DELETE' }),
  exerciseMedia: (token: string) => apiRequest<AdminExerciseMediaPayload>('/api/v1/admin/exercise-media', token),
  findExerciseGif: (token: string, exerciseName: string) =>
    apiRequest<{
      exerciseName: string;
      candidates: Array<{ url: string; previewUrl: string; title: string; source: string; score: number }>;
      best: { url: string; previewUrl: string; title: string; source: string; score: number } | null;
    }>(`/api/v1/admin/exercise-media/find-gif?exerciseName=${encodeURIComponent(exerciseName)}`, token),
  autoGifCommunityMedia: (token: string, exerciseName: string) =>
    apiRequest<{ media: unknown; candidate: { url: string; title: string; source: string } }>(
      '/api/v1/admin/exercise-media/community/auto-gif',
      token,
      { method: 'POST', body: JSON.stringify({ exerciseName }) },
    ),
  upsertCommunityMedia: (token: string, body: { exerciseName: string; imageUrl: string }) =>
    apiRequest('/api/v1/admin/exercise-media/community', token, { method: 'POST', body: JSON.stringify(body) }),
  updateCommunityMedia: (token: string, id: string, body: { exerciseName?: string; imageUrl?: string }) =>
    apiRequest(`/api/v1/admin/exercise-media/community/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCommunityMedia: (token: string, id: string) =>
    apiRequest<void>(`/api/v1/admin/exercise-media/community/${id}`, token, { method: 'DELETE' }),
  deletePersonalMedia: (token: string, id: string) =>
    apiRequest<void>(`/api/v1/admin/exercise-media/personal/${id}`, token, { method: 'DELETE' }),
  sessions: (token: string, params?: { userId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.userId) qs.set('userId', params.userId);
    if (params?.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRequest<{
      sessions: Array<{
        id: string;
        status: string;
        startTime: string;
        endTime?: string;
        totalDuration: number;
        caloriesBurned: number;
        exerciseCount: number;
        user?: { name?: string; email?: string };
        program?: { name?: string };
      }>;
    }>(`/api/v1/admin/sessions${suffix}`, token);
  },
};
