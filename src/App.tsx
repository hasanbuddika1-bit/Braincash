import { useApp } from './contexts/AppContext';
import { AnimatedBackground } from './components/AnimatedBackground';
import { LoadingScreen } from './components/LoadingScreen';
import { TabBar } from './components/TabBar';
import { HomeView } from './components/views/HomeView';
import { GamesView, GamePlayView } from './components/views/GamesView';
import { TasksView } from './components/views/TasksView';
import { ReferralsView } from './components/views/ReferralsView';
import { WithdrawView } from './components/views/WithdrawView';
import { AdminView } from './components/views/AdminView';
import { DailyChallengeView } from './components/views/DailyChallengeView';
import { HistoryView } from './components/views/HistoryView';
import { PaymentView } from './components/views/PaymentView';
import { ProfileView } from './components/views/ProfileView';
import { ArrowLeft } from 'lucide-react';
import { VIEW_LABELS, type ViewType } from './types';
import { useEffect, useRef } from 'react';

// Views where the tab bar is intentionally hidden (full-screen game/challenge)
const HIDE_TAB_VIEWS = new Set(['game', 'challenge']);

// Views that show the back button
const SHOW_BACK_VIEWS: Set<ViewType> = new Set(['games', 'ads', 'referrals', 'withdraw', 'admin', 'challenge', 'history', 'payment', 'profile', 'tasks', 'game']);

function App() {
  const { loading, currentView, selectedGame, goBack, canGoBack, haptic, user, error } = useApp();
  const appAdShown = useRef(false);

  useEffect(() => {
    if (user && !appAdShown.current) {
      appAdShown.current = true;
    }
  }, [user?.id]);

  if (loading) {
    return <LoadingScreen />;
  }

  // Show error/suspended/maintenance screen
  if (error && !user) {
    const isMaintenance = error.startsWith('maintenance:');
    const message = isMaintenance ? error.replace('maintenance:', '') : error;
    return (
      <div className="min-h-screen text-white relative flex items-center justify-center px-4">
        <AnimatedBackground />
        <div className="relative z-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{isMaintenance ? '🔧' : '🚫'}</div>
          <h1 className="text-2xl font-bold font-['Orbitron'] mb-4">
            {isMaintenance ? 'Maintenance Mode' : 'Account Suspended'}
          </h1>
          <p className="text-gray-300 whitespace-pre-line">{message}</p>
          {!isMaintenance && (
            <p className="text-gray-500 text-sm mt-4">
              If you believe this is an error, please contact support.
            </p>
          )}
        </div>
      </div>
    );
  }

  const showBackButton = SHOW_BACK_VIEWS.has(currentView) && canGoBack;

  return (
    <div className="min-h-screen text-white relative">
      <AnimatedBackground />

      {/* Back Button Header - fixed at top */}
      {showBackButton && (
        <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 safe-top">
          <button
            onClick={() => {
              haptic('light');
              goBack();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass-card"
            style={{
              background: 'linear-gradient(135deg, rgba(191,0,255,0.3) 0%, rgba(0,212,255,0.3) 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <ArrowLeft size={20} className="text-gold-400" />
            <span className="text-sm font-semibold text-white">Back</span>
          </button>
        </header>
      )}

      {/* Main content — bottom padding equals tab bar height so content isn't hidden */}
      <main className={`relative z-10 pb-[72px] ${showBackButton ? 'pt-16' : ''}`}>
        {currentView === 'home'      && <HomeView />}
        {currentView === 'games'     && <GamesView />}
        {currentView === 'game'      && selectedGame && <GamePlayView />}
        {currentView === 'tasks'     && <TasksView />}
        {currentView === 'ads'       && <div className="p-4 text-center text-gray-400">Ads loading...</div>}
        {currentView === 'referrals' && <ReferralsView />}
        {currentView === 'withdraw'  && <WithdrawView />}
        {currentView === 'admin'     && <AdminView />}
        {currentView === 'challenge' && <DailyChallengeView />}
        {currentView === 'history'   && <HistoryView />}
        {currentView === 'payment'   && <PaymentView />}
        {currentView === 'profile'   && <ProfileView />}
      </main>

      {!HIDE_TAB_VIEWS.has(currentView) && <TabBar />}
    </div>
  );
}

export default App;
