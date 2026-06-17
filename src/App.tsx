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

function App() {
  const { loading, currentView, selectedGame } = useApp();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen text-white relative">
      <AnimatedBackground />

      {/* Main Content */}
      <main className="relative z-10">
        {currentView === 'home' && <HomeView />}
        {currentView === 'games' && <GamesView />}
        {currentView === 'game' && selectedGame && <GamePlayView />}
        {currentView === 'tasks' && <TasksView />}
        {currentView === 'ads' && <AdsView />}
        {currentView === 'referrals' && <ReferralsView />}
        {currentView === 'withdraw' && <WithdrawView />}
        {currentView === 'admin' && <AdminView />}
        {currentView === 'challenge' && <DailyChallengeView />}
        {currentView === 'history' && <HistoryView />}
        {currentView === 'payment' && <PaymentView />}
      </main>

      {/* Tab Bar */}
      {currentView !== 'game' && currentView !== 'challenge' && currentView !== 'history' && currentView !== 'payment' && <TabBar />}
    </div>
  );
}

export default App;
