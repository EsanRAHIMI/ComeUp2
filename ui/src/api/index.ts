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
  WorkoutSession,
} from '../types';
import { apiRequest } from './client';

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
    },
  ) =>
    apiRequest<{ program: Program }>('/api/v1/ai/workouts/generate', token, {
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
      body: JSON.stringify({}),
    }),
  get: (token: string, id: string) =>
    apiRequest<{ conversation: AiConversation; quota: GptQuota }>(`/api/v1/ai/program-chat/${id}`, token),
  message: (token: string, id: string, content: string) =>
    apiRequest<{ reply: string; draftProgram: GptDraftProgram; quota: GptQuota }>(
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
};

export const measurementsApi = {
  list: (token: string) => apiRequest<{ measurements: Measurement[] }>('/api/v1/measurements', token),
  create: (token: string, body: Partial<Measurement>) =>
    apiRequest<{ measurement: Measurement }>('/api/v1/measurements', token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
