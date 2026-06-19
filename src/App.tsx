import { useApp } from './contexts/AppContext';
import { AnimatedBackground } from './components/AnimatedBackground';
import { LoadingScreen } from './components/LoadingScreen';
import { TabBar } from './components/TabBar';
import { HomeView } from './components/views/HomeView';
import { GamesView, GamePlayView } from './components/views/GamesView';
import { TasksView } from './components/views/TasksView';
import { AdsView } from './components/views/AdsView';
import { ReferralsView } from './components/views/ReferralsView';
import { WithdrawView } from './components/views/WithdrawView';
import { AdminView } from './components/views/AdminView';
import { DailyChallengeView } from './components/views/DailyChallengeView';
import { HistoryView } from './components/views/HistoryView';
import { PaymentView } from './components/views/PaymentView';
import { ProfileView } from './components/views/ProfileView';
import { ArrowLeft } from 'lucide-react';
import { VIEW_LABELS, type ViewType } from './types';

// Views where the tab bar is intentionally hidden (full-screen game/challenge)
const HIDE_TAB_VIEWS = new Set(['game', 'challenge']);

// Views that show the back button
const SHOW_BACK_VIEWS: Set<ViewType> = new Set(['games', 'ads', 'referrals', 'withdraw', 'admin', 'challenge', 'history', 'payment', 'profile', 'tasks', 'game']);

function App() {
  const { loading, currentView, selectedGame, goBack, canGoBack, haptic } = useApp();

  if (loading) {
    return <LoadingScreen />;
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
        {currentView === 'ads'       && <AdsView />}
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
