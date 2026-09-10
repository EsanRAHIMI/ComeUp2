import { useCallback, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { ResumeBanner } from './components/ResumeBanner';
import { PremiumHost } from './components/PremiumHost';
import { Toast } from './components/Toast';
import { useApp } from './hooks/useApp';
import { RouterProvider, useRouter } from './hooks/useRouter';
import { AppProvider } from './store/AppProvider';
import { ThemeProvider } from './hooks/useTheme';
import { isLocale, type Locale } from './i18n';
import { LocaleProvider, useT } from './i18n/LocaleProvider';
import { AdminView } from './views/AdminView';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { HistoryView } from './views/HistoryView';
import { NutritionView } from './views/NutritionView';
import { ProfileView } from './views/ProfileView';
import { ProgramsView } from './views/ProgramsView';
import { WorkoutView } from './views/WorkoutView';

function CurrentView() {
  const { view } = useRouter();
  switch (view) {
    case 'programs':
      return <ProgramsView />;
    case 'workout':
      return <WorkoutView />;
    case 'history':
      return <HistoryView />;
    case 'nutrition':
      return <NutritionView />;
    case 'profile':
      return <ProfileView />;
    case 'admin':
      return <AdminView />;
    default:
      return <DashboardView />;
  }
}

function Shell() {
  const fa = useT();
  const { ready, token } = useApp();

  if (!ready) {
    return (
      <div className="boot-splash">
        <Loader2 className="spin" size={28} />
        <span>{fa.loading}</span>
      </div>
    );
  }

  if (!token) {
    return (
      <>
        <AuthView />
        <Toast />
      </>
    );
  }

  return (
    <RouterProvider>
      <div className="app">
        <AppHeader />
        <main className="app__main">
          <ResumeBanner />
          <CurrentView />
        </main>
        <BottomNav />
      </div>
      <PremiumHost />
      <Toast />
    </RouterProvider>
  );
}

function LocaleBridge({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useApp();
  const onLocaleChange = useCallback(
    (locale: Locale) => {
      void updateProfile({ preferences: { locale } }, { silent: true });
    },
    [updateProfile],
  );
  const initial = user?.preferences?.locale;
  return (
    <LocaleProvider
      initialLocale={initial && isLocale(initial) ? initial : undefined}
      onLocaleChange={onLocaleChange}
    >
      {children}
    </LocaleProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <LocaleBridge>
          <Shell />
        </LocaleBridge>
      </AppProvider>
    </ThemeProvider>
  );
}
