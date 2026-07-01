import { Loader2 } from 'lucide-react';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { ResumeBanner } from './components/ResumeBanner';
import { Toast } from './components/Toast';
import { useApp } from './hooks/useApp';
import { RouterProvider, useRouter } from './hooks/useRouter';
import { AppProvider } from './store/AppProvider';
import { ThemeProvider } from './hooks/useTheme';
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
  const { ready, token } = useApp();

  if (!ready) {
    return (
      <div className="boot-splash">
        <Loader2 className="spin" size={28} />
        <span>Loading ComeUp…</span>
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
      <Toast />
    </RouterProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ThemeProvider>
  );
}
