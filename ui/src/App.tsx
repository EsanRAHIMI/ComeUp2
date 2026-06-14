import {
  Activity,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Gauge,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Goal = 'Weight Loss' | 'Muscle Gain' | 'General Fitness' | 'Strength';
type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced';
type Difficulty = FitnessLevel;

type User = {
  id: string;
  name: string;
  email: string;
  goal: Goal;
  fitnessLevel: FitnessLevel;
  workoutDaysPerWeek: number;
};

type Exercise = {
  _id?: string;
  name: string;
  sets: number;
  reps: number;
  repRange?: string;
  restTime: number;
  instructions: string;
  notes?: string;
  muscleGroups: string[];
  difficulty?: Difficulty;
  equipment?: string[];
  category?: 'Strength' | 'Cardio' | 'Flexibility' | 'Balance';
  trackingType?: 'reps' | 'time';
};

type Program = {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  duration: number;
  exercises: Exercise[];
  daysPerWeek: number;
  isActive?: boolean;
  isPublic?: boolean;
  shareCode?: string;
  tags: string[];
  totalCalories: number;
  sourceText?: string;
  executionRules?: string[];
  nutrition?: {
    calories?: string;
    protein?: string;
    mealRule?: string;
    notes?: string[];
  };
  supplements?: string[];
  longTermGoal?: string;
  schedule?: Array<{
    week: number;
    day: number;
    title: string;
    startsAt: string;
    duration: number;
    focus?: string;
    exerciseNames: string[];
  }>;
};

type AuthMode = 'login' | 'register';
type ViewKey = 'dashboard' | 'programs' | 'workout' | 'profile';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? (import.meta.env.DEV ? 'http://localhost:4000' : '/api');

function buildApiUrl(path: string) {
  const baseUrl = new URL(API_BASE_URL, window.location.origin);
  const basePath = baseUrl.pathname.replace(/\/$/, '');
  const requestPath = basePath.endsWith('/api') && path.startsWith('/api/') ? path.slice('/api'.length) : path;
  baseUrl.pathname = `${basePath}${requestPath}`.replace(/\/{2,}/g, '/');
  return baseUrl.toString();
}

function getPersistedProgramId(program: Program) {
  return typeof program._id === 'string' && /^[a-f\d]{24}$/i.test(program._id) ? program._id : null;
}

function dateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function nextScheduledSession(program: Program | null, now: number) {
  if (!program?.schedule?.length) return null;
  return (
    program.schedule.find((item) => new Date(item.startsAt).getTime() >= now) ??
    program.schedule[program.schedule.length - 1]
  );
}

const demoPrograms: Program[] = [
  {
    _id: 'demo-strength',
    name: 'Foundational Strength',
    description: 'A balanced plan for building reliable strength without overloading recovery.',
    difficulty: 'Beginner',
    duration: 42,
    daysPerWeek: 3,
    isActive: true,
    isPublic: false,
    tags: ['strength', 'full body', 'mvp'],
    totalCalories: 360,
    exercises: [
      {
        name: 'Goblet Squat',
        sets: 3,
        reps: 10,
        restTime: 75,
        instructions: 'Brace, sit between the hips, and keep tempo controlled.',
        muscleGroups: ['legs', 'core'],
      },
      {
        name: 'Incline Push-up',
        sets: 3,
        reps: 12,
        restTime: 60,
        instructions: 'Keep shoulders packed and ribs down.',
        muscleGroups: ['chest', 'triceps'],
      },
      {
        name: 'Plank',
        sets: 3,
        reps: 45,
        restTime: 45,
        instructions: 'Hold a straight line and breathe calmly.',
        muscleGroups: ['core'],
        trackingType: 'time',
      },
    ],
  },
  {
    _id: 'demo-conditioning',
    name: 'Lean Conditioning',
    description: 'Short, repeatable sessions for calorie burn and movement quality.',
    difficulty: 'Intermediate',
    duration: 32,
    daysPerWeek: 4,
    isActive: false,
    isPublic: true,
    tags: ['conditioning', 'fat loss'],
    totalCalories: 420,
    exercises: [
      {
        name: 'Mountain Climbers',
        sets: 4,
        reps: 30,
        restTime: 40,
        instructions: 'Move fast while keeping the hips quiet.',
        muscleGroups: ['core', 'cardio'],
      },
      {
        name: 'Reverse Lunge',
        sets: 3,
        reps: 12,
        restTime: 60,
        instructions: 'Step back softly and drive through the front foot.',
        muscleGroups: ['legs', 'glutes'],
      },
    ],
  },
];

const demoUser: User = {
  id: 'demo-user',
  name: 'ComeUp Athlete',
  email: 'demo@comeup.fit',
  goal: 'General Fitness',
  fitnessLevel: 'Intermediate',
  workoutDaysPerWeek: 4,
};

async function apiRequest<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed');
  }

  return data as T;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('comeup_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('comeup_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [programs, setPrograms] = useState<Program[]>(() =>
    localStorage.getItem('comeup_token') ? [] : demoPrograms,
  );
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const [status, setStatus] = useState(() =>
    localStorage.getItem('comeup_token') ? 'Syncing programs...' : 'Ready',
  );
  const [isBusy, setIsBusy] = useState(() => Boolean(localStorage.getItem('comeup_token')));
  const [searchTerm, setSearchTerm] = useState('');
  const [coachPlanText, setCoachPlanText] = useState('');
  const [coachStartDate, setCoachStartDate] = useState(() => dateInputValue());
  const [coachWorkoutTime, setCoachWorkoutTime] = useState('18:30');
  const [coachWeeks, setCoachWeeks] = useState(12);
  const [coachSessionDuration, setCoachSessionDuration] = useState(75);
  const [nowMs] = useState(() => Date.now());

  const currentUser = user ?? demoUser;
  const activeProgram = programs.find((program) => program.isActive) ?? programs[0] ?? null;
  const nextSession = nextScheduledSession(activeProgram, nowMs);

  const metrics = useMemo(() => {
    const totalExercises = programs.reduce((sum, program) => sum + program.exercises.length, 0);
    const weeklyMinutes = programs.reduce((sum, program) => sum + program.duration * program.daysPerWeek, 0);
    const weeklyCalories = programs.reduce((sum, program) => sum + program.totalCalories * program.daysPerWeek, 0);

    return {
      totalPrograms: programs.length,
      totalExercises,
      weeklyMinutes,
      weeklyCalories,
    };
  }, [programs]);

  useEffect(() => {
    const savedToken = localStorage.getItem('comeup_token');
    if (!savedToken) return;

    let isCancelled = false;
    apiRequest<{ programs: Program[] }>('/api/v1/programs', savedToken)
      .then((result) => {
        if (isCancelled) return;
        setPrograms(result.programs);
        setStatus(result.programs.length ? 'Programs synced' : 'No saved programs yet');
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setStatus(error instanceof Error ? error.message : 'Could not sync programs');
      })
      .finally(() => {
        if (!isCancelled) setIsBusy(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleAuth(mode: AuthMode, formData: FormData) {
    setIsBusy(true);
    setStatus(mode === 'login' ? 'Signing in...' : 'Creating account...');

    try {
      const body =
        mode === 'login'
          ? {
              email: String(formData.get('email')),
              password: String(formData.get('password')),
            }
          : {
              name: String(formData.get('name')),
              email: String(formData.get('email')),
              password: String(formData.get('password')),
              goal: String(formData.get('goal')) as Goal,
              fitnessLevel: String(formData.get('fitnessLevel')) as FitnessLevel,
            };

      const result = await apiRequest<{ token: string; user: User }>(
        mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register',
        null,
        { method: 'POST', body: JSON.stringify(body) },
      );

      localStorage.setItem('comeup_token', result.token);
      localStorage.setItem('comeup_user', JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      setStatus('Connected to backend');
      await refreshPrograms(result.token);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsBusy(false);
    }
  }

  async function refreshPrograms(authToken = token) {
    if (!authToken) {
      setStatus('Demo mode: sign in to sync programs');
      return;
    }

    setIsBusy(true);
    setStatus('Syncing programs...');
    try {
      const result = await apiRequest<{ programs: Program[] }>('/api/v1/programs', authToken);
      setPrograms(result.programs);
      setStatus(result.programs.length ? 'Programs synced' : 'No saved programs yet');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sync programs');
    } finally {
      setIsBusy(false);
    }
  }

  async function generateProgram() {
    if (!token) {
      setStatus('Sign in to generate and save AI workouts');
      return;
    }

    setIsBusy(true);
    setStatus('Generating AI workout...');

    try {
      const result = await apiRequest<{ program: Program }>('/api/v1/ai/workouts/generate', token, {
        method: 'POST',
        body: JSON.stringify({
          goal: currentUser.goal,
          fitnessLevel: currentUser.fitnessLevel,
          duration: 40,
          equipment: ['bodyweight', 'dumbbells'],
          focusAreas: ['legs', 'core', 'chest'],
        }),
      });
      const generatedProgram = result.program;

      const programInput: Program = {
        name: generatedProgram.name,
        description: generatedProgram.description || 'Generated by ComeUp AI and tuned to your profile.',
        difficulty: generatedProgram.difficulty,
        duration: generatedProgram.duration,
        daysPerWeek: generatedProgram.daysPerWeek || currentUser.workoutDaysPerWeek,
        exercises: generatedProgram.exercises,
        tags: generatedProgram.tags?.length ? generatedProgram.tags : ['ai', currentUser.goal.toLowerCase()],
        totalCalories: generatedProgram.totalCalories,
        isActive: false,
      };

      const saved = await apiRequest<{ program: Program }>('/api/v1/programs', token, {
        method: 'POST',
        body: JSON.stringify(programInput),
      });

      setPrograms((current) => [saved.program, ...current]);
      setStatus('AI program created');
      setActiveView('programs');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'AI generation failed');
    } finally {
      setIsBusy(false);
    }
  }

  async function importCoachPlan() {
    if (!token) {
      setStatus('Sign in to import a coach plan');
      return;
    }

    setIsBusy(true);
    setStatus('Planning coach program...');

    try {
      const result = await apiRequest<{ program: Program }>('/api/v1/programs/import-coach-plan', token, {
        method: 'POST',
        body: JSON.stringify({
          text: coachPlanText,
          startDate: coachStartDate,
          workoutTime: coachWorkoutTime,
          weeks: coachWeeks,
          sessionDuration: coachSessionDuration,
        }),
      });

      setPrograms((current) => [result.program, ...current]);
      setCoachPlanText('');
      setStatus('Coach plan scheduled');
      setActiveView('programs');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not import coach plan');
    } finally {
      setIsBusy(false);
    }
  }

  async function activateProgram(program: Program) {
    const programId = getPersistedProgramId(program);

    if (!token) {
      setPrograms((current) => current.map((item) => ({ ...item, isActive: item === program })));
      return;
    }

    if (!programId) {
      setStatus('Generate a saved program before activating it');
      return;
    }

    setIsBusy(true);
    setStatus('Activating program...');
    try {
      const result = await apiRequest<{ program: Program }>(`/api/v1/programs/${programId}/activate`, token, {
        method: 'POST',
      });
      setPrograms((current) =>
        current.map((item) => ({ ...item, isActive: item._id === result.program._id })),
      );
      setStatus('Program activated');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Activation failed');
    } finally {
      setIsBusy(false);
    }
  }

  async function shareProgram(program: Program) {
    const programId = getPersistedProgramId(program);

    if (!token) {
      setStatus('Sign in to create a real share code');
      return;
    }

    if (!programId) {
      setStatus('Generate a saved program before sharing it');
      return;
    }

    setIsBusy(true);
    setStatus('Creating share code...');
    try {
      const result = await apiRequest<{ shareCode: string; program: Program }>(
        `/api/v1/programs/${programId}/share`,
        token,
        { method: 'POST' },
      );
      setPrograms((current) =>
        current.map((item) => (item._id === program._id ? { ...result.program, shareCode: result.shareCode } : item)),
      );
      setStatus(`Share code: ${result.shareCode}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sharing failed');
    } finally {
      setIsBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('comeup_token');
    localStorage.removeItem('comeup_user');
    setToken(null);
    setUser(null);
    setPrograms(demoPrograms);
    setStatus('Signed out. Demo mode active.');
    setActiveView('dashboard');
  }

  const filteredPrograms = programs.filter((program) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [program.name, program.description, program.difficulty, ...program.tags]
      .join(' ')
      .toLowerCase()
      .includes(term);
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Zap size={20} />
          </div>
          <div>
            <strong>ComeUp</strong>
            <span>Training OS</span>
          </div>
        </div>

        <nav className="nav">
          <NavButton icon={LayoutDashboard} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
          <NavButton icon={Dumbbell} label="Programs" active={activeView === 'programs'} onClick={() => setActiveView('programs')} />
          <NavButton icon={PlayCircle} label="Workout" active={activeView === 'workout'} onClick={() => setActiveView('workout')} />
          <NavButton icon={UserRound} label="Profile" active={activeView === 'profile'} onClick={() => setActiveView('profile')} />
        </nav>

        <div className="sidebar-card">
          <ShieldCheck size={18} />
          <div>
            <strong>{token ? 'Backend synced' : 'Demo mode'}</strong>
            <span>{token ? 'Programs persist in Atlas' : 'Sign in to save data'}</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Performance workspace</p>
            <h1>{headlineFor(activeView)}</h1>
          </div>
          <div className="topbar-actions">
            <div className="status-pill">
              {isBusy ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
              <span>{status}</span>
            </div>
            {token ? (
              <button className="icon-button" onClick={logout} aria-label="Sign out">
                <LogOut size={18} />
              </button>
            ) : null}
          </div>
        </header>

        {!token ? <AuthPanel onSubmit={handleAuth} isBusy={isBusy} /> : null}

        {activeView === 'dashboard' ? (
          <Dashboard
            user={currentUser}
            metrics={metrics}
            activeProgram={activeProgram}
            nextSession={nextSession}
            nowMs={nowMs}
            onGenerate={generateProgram}
            onImportCoachPlan={importCoachPlan}
            onOpenPrograms={() => setActiveView('programs')}
            coachPlanText={coachPlanText}
            onCoachPlanTextChange={setCoachPlanText}
            coachStartDate={coachStartDate}
            onCoachStartDateChange={setCoachStartDate}
            coachWorkoutTime={coachWorkoutTime}
            onCoachWorkoutTimeChange={setCoachWorkoutTime}
            coachWeeks={coachWeeks}
            onCoachWeeksChange={setCoachWeeks}
            coachSessionDuration={coachSessionDuration}
            onCoachSessionDurationChange={setCoachSessionDuration}
          />
        ) : null}

        {activeView === 'programs' ? (
          <ProgramsView
            programs={filteredPrograms}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            onRefresh={() => refreshPrograms()}
            onActivate={activateProgram}
            onShare={shareProgram}
            onGenerate={generateProgram}
            isBusy={isBusy}
            isSignedIn={Boolean(token)}
          />
        ) : null}

        {activeView === 'workout' ? <WorkoutView program={activeProgram} onGenerate={generateProgram} nowMs={nowMs} /> : null}

        {activeView === 'profile' ? <ProfileView user={currentUser} apiUrl={API_BASE_URL} /> : null}
      </main>
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={19} />
      <span>{label}</span>
    </button>
  );
}

function AuthPanel({ onSubmit, isBusy }: { onSubmit: (mode: AuthMode, formData: FormData) => void; isBusy: boolean }) {
  const [mode, setMode] = useState<AuthMode>('login');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(mode, new FormData(event.currentTarget));
  }

  return (
    <section className="auth-panel">
      <div>
        <p className="eyebrow">Connect your account</p>
        <h2>Use demo instantly, or sign in to sync with Atlas.</h2>
      </div>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' ? (
          <input name="name" placeholder="Full name" autoComplete="name" minLength={2} required />
        ) : null}
        <input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={mode === 'register' ? 8 : 1}
          required
        />
        {mode === 'register' ? (
          <>
            <select name="goal" defaultValue="General Fitness">
              <option>General Fitness</option>
              <option>Strength</option>
              <option>Muscle Gain</option>
              <option>Weight Loss</option>
            </select>
            <select name="fitnessLevel" defaultValue="Beginner">
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </>
        ) : null}
        <button className="primary-button" type="submit" disabled={isBusy}>
          {isBusy ? <Loader2 className="spin" size={18} /> : <Lock size={18} />}
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button className="text-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Create a new account' : 'I already have an account'}
        </button>
      </form>
    </section>
  );
}

function Dashboard({
  user,
  metrics,
  activeProgram,
  nextSession,
  nowMs,
  onGenerate,
  onImportCoachPlan,
  onOpenPrograms,
  coachPlanText,
  onCoachPlanTextChange,
  coachStartDate,
  onCoachStartDateChange,
  coachWorkoutTime,
  onCoachWorkoutTimeChange,
  coachWeeks,
  onCoachWeeksChange,
  coachSessionDuration,
  onCoachSessionDurationChange,
}: {
  user: User;
  metrics: { totalPrograms: number; totalExercises: number; weeklyMinutes: number; weeklyCalories: number };
  activeProgram: Program | null;
  nextSession: NonNullable<Program['schedule']>[number] | null;
  nowMs: number;
  onGenerate: () => void;
  onImportCoachPlan: () => void;
  onOpenPrograms: () => void;
  coachPlanText: string;
  onCoachPlanTextChange: (value: string) => void;
  coachStartDate: string;
  onCoachStartDateChange: (value: string) => void;
  coachWorkoutTime: string;
  onCoachWorkoutTimeChange: (value: string) => void;
  coachWeeks: number;
  onCoachWeeksChange: (value: number) => void;
  coachSessionDuration: number;
  onCoachSessionDurationChange: (value: number) => void;
}) {
  return (
    <section className="page-grid">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Today</p>
          <h2>Train with a plan that adapts around {user.goal.toLowerCase()}.</h2>
          <p>
            {activeProgram
              ? `Your active program is ready with ${activeProgram.exercises.length} exercises, ${activeProgram.duration} minutes, and recovery-aware pacing.`
              : 'Generate your first saved program to start tracking a real training plan.'}
          </p>
          <div className="button-row">
            <button className="primary-button" onClick={onGenerate}>
              <Sparkles size={18} />
              Generate program
            </button>
            <button className="secondary-button" onClick={onOpenPrograms}>
              Review programs
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="readiness-card">
          <Gauge size={22} />
          <strong>{nextSession ? 'Next session' : 'Readiness'}</strong>
          <span>
            {nextSession
              ? new Intl.DateTimeFormat(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(nextSession.startsAt))
              : 'Good for strength work'}
          </span>
          {nextSession ? <small>{nextSession.title}</small> : null}
          <div className="meter">
            <i style={{ width: '76%' }} />
          </div>
        </div>
      </div>

      <div className="metric-grid">
        <Metric icon={Dumbbell} label="Programs" value={metrics.totalPrograms} />
        <Metric icon={Activity} label="Exercises" value={metrics.totalExercises} />
        <Metric icon={Clock3} label="Weekly minutes" value={metrics.weeklyMinutes} />
        <Metric icon={Flame} label="Weekly calories" value={metrics.weeklyCalories} />
      </div>

      <CoachPlanImporter
        value={coachPlanText}
        onChange={onCoachPlanTextChange}
        startDate={coachStartDate}
        onStartDateChange={onCoachStartDateChange}
        workoutTime={coachWorkoutTime}
        onWorkoutTimeChange={onCoachWorkoutTimeChange}
        weeks={coachWeeks}
        onWeeksChange={onCoachWeeksChange}
        sessionDuration={coachSessionDuration}
        onSessionDurationChange={onCoachSessionDurationChange}
        onImport={onImportCoachPlan}
      />

      {activeProgram ? (
        <ProgramDetail program={activeProgram} nowMs={nowMs} />
      ) : (
        <EmptyState
          title="No active program yet"
          description="Create an AI program and it will appear here with its exercises, weekly load, and workout flow."
          actionLabel="Generate program"
          onAction={onGenerate}
        />
      )}
    </section>
  );
}

function CoachPlanImporter({
  value,
  onChange,
  startDate,
  onStartDateChange,
  workoutTime,
  onWorkoutTimeChange,
  weeks,
  onWeeksChange,
  sessionDuration,
  onSessionDurationChange,
  onImport,
}: {
  value: string;
  onChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  workoutTime: string;
  onWorkoutTimeChange: (value: string) => void;
  weeks: number;
  onWeeksChange: (value: number) => void;
  sessionDuration: number;
  onSessionDurationChange: (value: number) => void;
  onImport: () => void;
}) {
  return (
    <section className="coach-importer">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Coach plan import</p>
          <h2>Paste your coach program and turn it into a dated training plan.</h2>
        </div>
        <Bot size={22} />
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste DAY 1, DAY 2, nutrition, supplements, rest rules, and 3-month goal here..."
      />
      <div className="planner-controls">
        <label>
          Start date
          <input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} />
        </label>
        <label>
          Gym time
          <input type="time" value={workoutTime} onChange={(event) => onWorkoutTimeChange(event.target.value)} />
        </label>
        <label>
          Weeks
          <input
            type="number"
            min={1}
            max={24}
            value={weeks}
            onChange={(event) => onWeeksChange(Number(event.target.value))}
          />
        </label>
        <label>
          Session min
          <input
            type="number"
            min={30}
            max={180}
            step={5}
            value={sessionDuration}
            onChange={(event) => onSessionDurationChange(Number(event.target.value))}
          />
        </label>
        <button className="primary-button" onClick={onImport} disabled={value.trim().length < 40}>
          <CalendarDays size={18} />
          Build plan
        </button>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Dumbbell; label: string; value: string | number }) {
  return (
    <article className="metric-card">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ProgramsView({
  programs,
  searchTerm,
  onSearch,
  onRefresh,
  onActivate,
  onShare,
  onGenerate,
  isBusy,
  isSignedIn,
}: {
  programs: Program[];
  searchTerm: string;
  onSearch: (value: string) => void;
  onRefresh: () => void;
  onActivate: (program: Program) => void;
  onShare: (program: Program) => void;
  onGenerate: () => void;
  isBusy: boolean;
  isSignedIn: boolean;
}) {
  return (
    <section className="stack">
      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input value={searchTerm} onChange={(event) => onSearch(event.target.value)} placeholder="Search programs" />
        </label>
        <button className="secondary-button" onClick={onRefresh} disabled={isBusy}>
          <RefreshCcw size={17} />
          Sync
        </button>
        <button className="primary-button" onClick={onGenerate} disabled={isBusy}>
          <Plus size={17} />
          AI program
        </button>
      </div>

      {programs.length ? (
        <div className="program-grid">
          {programs.map((program) => {
            const isPersisted = Boolean(getPersistedProgramId(program));
            const lockRealAction = isSignedIn && !isPersisted;
            return (
              <article className="program-card" key={program._id ?? program.id ?? program.name}>
                <div className="program-card-header">
                  <div>
                    <span className={`difficulty ${program.difficulty.toLowerCase()}`}>{program.difficulty}</span>
                    <h3>{program.name}</h3>
                  </div>
                  {program.isActive ? <span className="active-badge">Active</span> : null}
                </div>
                <p>{program.description}</p>
                <div className="program-stats">
                  <span>
                    <Clock3 size={15} />
                    {program.duration} min
                  </span>
                  <span>
                    <CalendarDays size={15} />
                    {program.daysPerWeek} days/wk
                  </span>
                  <span>
                    <Flame size={15} />
                    {program.totalCalories} cal
                  </span>
                </div>
                <div className="tag-row">
                  {program.tags.slice(0, 4).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="button-row compact">
                  <button className="secondary-button" onClick={() => onActivate(program)} disabled={isBusy || lockRealAction}>
                    Activate
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => onShare(program)}
                    disabled={isBusy || lockRealAction}
                    aria-label="Share program"
                  >
                    <Share2 size={17} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No programs saved"
          description="Generate a program to save it in Atlas, activate it, and create share codes."
          actionLabel="Generate AI program"
          onAction={onGenerate}
        />
      )}
    </section>
  );
}

function WorkoutView({ program, onGenerate, nowMs }: { program: Program | null; onGenerate: () => void; nowMs: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!program) {
    return (
      <EmptyState
        title="No workout loaded"
        description="Generate and activate a saved program before starting a workout session."
        actionLabel="Generate program"
        onAction={onGenerate}
      />
    );
  }

  const current = program.exercises[currentIndex] ?? program.exercises[0];

  return (
    <section className="workout-layout">
      <div className="session-panel">
        <p className="eyebrow">Live session</p>
        <h2>{program.name}</h2>
        <div className="session-ring">
          <span>{currentIndex + 1}</span>
          <small>of {program.exercises.length}</small>
        </div>
        <h3>{current.name}</h3>
        <p>{current.instructions}</p>
        <div className="button-row">
          <button className="primary-button" onClick={() => setCurrentIndex((value) => Math.min(value + 1, program.exercises.length - 1))}>
            Next exercise
            <ChevronRight size={18} />
          </button>
          <button className="secondary-button" onClick={() => setCurrentIndex(0)}>
            Reset
          </button>
        </div>
      </div>
      <ProgramDetail program={program} nowMs={nowMs} />
    </section>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="empty-state">
      <Sparkles size={22} />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button className="primary-button" onClick={onAction}>
        <Plus size={18} />
        {actionLabel}
      </button>
    </article>
  );
}

function ProgramDetail({ program, nowMs }: { program: Program; nowMs: number }) {
  const upcoming = (program.schedule ?? [])
    .filter((item) => new Date(item.startsAt).getTime() >= nowMs)
    .slice(0, 4);

  return (
    <article className="detail-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Plan details</p>
          <h2>{program.name}</h2>
        </div>
        <Target size={22} />
      </div>
      <div className="exercise-list">
        {program.exercises.map((exercise, index) => (
          <div className="exercise-row" key={`${exercise.name}-${index}`}>
            <span>{index + 1}</span>
            <div>
              <strong>{exercise.name}</strong>
              <small>
                {exercise.sets} sets x {exercise.repRange || exercise.reps} {exercise.trackingType === 'time' ? 'sec' : 'reps'} · {exercise.restTime}s rest
              </small>
            </div>
            <em>{exercise.muscleGroups.slice(0, 2).join(', ')}</em>
          </div>
        ))}
      </div>

      {upcoming.length ? (
        <div className="plan-section">
          <h3>Upcoming sessions</h3>
          <div className="schedule-list">
            {upcoming.map((session) => (
              <div key={`${session.week}-${session.day}-${session.startsAt}`} className="schedule-row">
                <span>W{session.week} D{session.day}</span>
                <div>
                  <strong>{session.title}</strong>
                  <small>
                    {new Intl.DateTimeFormat(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(session.startsAt))}
                  </small>
                </div>
                <em>{session.duration} min</em>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {program.nutrition || program.supplements?.length || program.executionRules?.length || program.longTermGoal ? (
        <div className="plan-section">
          <h3>Coach protocol</h3>
          <div className="protocol-grid">
            <div>
              <span>Nutrition</span>
              <strong>{program.nutrition?.calories || 'Not set'}</strong>
              <small>{program.nutrition?.protein || program.nutrition?.mealRule || 'Add nutrition notes'}</small>
            </div>
            <div>
              <span>Supplements</span>
              <strong>{program.supplements?.slice(0, 2).join(' · ') || 'Not set'}</strong>
              <small>{program.supplements?.slice(2).join(' · ') || 'Daily protocol'}</small>
            </div>
            <div>
              <span>Execution</span>
              <strong>{program.executionRules?.[0] || 'Controlled sets'}</strong>
              <small>{program.executionRules?.slice(1, 3).join(' · ')}</small>
            </div>
            <div>
              <span>Goal</span>
              <strong>{program.longTermGoal || 'Progressive overload'}</strong>
              <small>Tracked from coach import</small>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ProfileView({ user, apiUrl }: { user: User; apiUrl: string }) {
  return (
    <section className="profile-grid">
      <article className="profile-card">
        <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <div className="profile-facts">
          <span>{user.goal}</span>
          <span>{user.fitnessLevel}</span>
          <span>{user.workoutDaysPerWeek} days/week</span>
        </div>
      </article>
      <article className="detail-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">System</p>
            <h2>Deployment-ready web client</h2>
          </div>
          <Bot size={22} />
        </div>
        <div className="system-list">
          <span>API base</span>
          <strong>{apiUrl}</strong>
          <span>Frontend runtime</span>
          <strong>Vite + React</strong>
          <span>Data mode</span>
          <strong>Atlas-backed when signed in</strong>
        </div>
      </article>
    </section>
  );
}

function headlineFor(view: ViewKey) {
  switch (view) {
    case 'programs':
      return 'Programs';
    case 'workout':
      return 'Workout session';
    case 'profile':
      return 'Profile';
    default:
      return 'Dashboard';
  }
}

export { App };
