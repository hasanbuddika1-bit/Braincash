import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import {
  showAdFromNetwork, getTodayAdCount, recordAdView,
  type AdNetwork, type AdShowResult,
} from '../../lib/adManager';
import {
  Trophy, Clock, Flame, Target, ChevronRight, CheckCircle, Lock,
  Play, Tv, Users, Gift, Zap, AlertCircle, Star, Crown, TrendingUp,
} from 'lucide-react';

interface GameChallenge {
  id: string;
  game_id: string;
  game_name: string;
  game_icon: string;
  target_score: number;
  reward_bonus: number;
  completed: boolean;
  best_score: number;
}

interface DailyStat {
  adsWatched: number;
  referralsCount: number;
  tasksCompleted: number;
  gamesPlayed: number;
}

type ChallengeTab = 'game' | 'ads' | 'referral' | 'task';

export function DailyChallengeView() {
  const { user, setCurrentView, addPoints, haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [challenges, setChallenges] = useState<GameChallenge[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [tab, setTab] = useState<ChallengeTab>('game');
  const [stats, setStats] = useState<DailyStat>({ adsWatched: 0, referralsCount: 0, tasksCompleted: 0, gamesPlayed: 0 });
  const [watchingAd, setWatchingAd] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const [adError, setAdError] = useState(false);
  const [adErrorMsg, setAdErrorMsg] = useState('');

  useEffect(() => {
    loadAll();
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [user?.id]);

  function calculateTimeLeft() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
  }

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([loadGameChallenges(), loadDailyStats(), loadStreak()]);
    } catch (err) {
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDailyStats() {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { count: adCount } = await supabase
        .from('ad_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('viewed_at', today + 'T00:00:00');

      const { data: refs } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', user.id);
      const refCount = refs?.length || 0;

      const { count: taskCount } = await supabase
        .from('task_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', today + 'T00:00:00');

      const { count: gameCount } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today + 'T00:00:00');

      setStats({
        adsWatched: adCount || 0,
        referralsCount: refCount,
        tasksCompleted: taskCount || 0,
        gamesPlayed: gameCount || 0,
      });
    } catch (err) {
      console.error('Error loading daily stats:', err);
    }
  }

  async function loadStreak() {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('daily_challenge_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setStreak(count || 0);
    } catch (err) {
      console.error('Error loading streak:', err);
    }
  }

  async function loadGameChallenges() {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true);

      if (!gameData || gameData.length === 0) return;

      const { data: existingChallenges } = await supabase
        .from('daily_challenges')
        .select('*, games(name, icon)')
        .eq('challenge_date', today);

      let challengesToUse = existingChallenges;

      if (!existingChallenges || existingChallenges.length === 0) {
        const selectedGames = gameData.sort(() => Math.random() - 0.5).slice(0, 3);
        const newChallenges = selectedGames.map(game => ({
          game_id: game.id,
          target_score: Math.floor(Math.random() * 100) + 50,
          reward_bonus: Math.floor(Math.random() * 10) + 10,
          challenge_date: today,
        }));
        await supabase.from('daily_challenges').insert(newChallenges);
        const { data: inserted } = await supabase
          .from('daily_challenges')
          .select('*, games(name, icon)')
          .eq('challenge_date', today);
        challengesToUse = inserted;
      }

      const { data: completions } = await supabase
        .from('daily_challenge_completions')
        .select('*')
        .eq('user_id', user.id)
        .in('challenge_id', challengesToUse?.map(c => c.id) || []);

      const completedIds = new Set(completions?.map(c => c.challenge_id) || []);

      const formatted: GameChallenge[] = challengesToUse?.map(c => ({
        id: c.id,
        game_id: c.game_id,
        game_name: c.games?.name || 'Unknown',
        game_icon: c.games?.icon || '🎮',
        target_score: c.target_score,
        reward_bonus: c.reward_bonus,
        completed: completedIds.has(c.id),
        best_score: 0,
      })) || [];

      setChallenges(formatted);
    } catch (err) {
      console.error('Error loading game challenges:', err);
    }
  }

  const watchChallengeAd = useCallback(async () => {
    if (!user || watchingAd) return;
    haptic('light');
    setWatchingAd(true);
    setAdError(false);
    setAdErrorMsg('');

    const networks: AdNetwork[] = ['adsgram', 'monetag', 'gigapub'];
    const network = networks[Math.floor(Math.random() * networks.length)];

    let result: AdShowResult;
    try {
      result = await showAdFromNetwork(network);
    } catch {
      result = { watchedSeconds: 0, completed: false, opened: false, error: 'Ad failed' };
    }

    if (!result.opened) {
      // SDK unavailable — give reward anyway
      await recordAdView(user.id, network, 5, 'challenge');
      await addPoints(5);
      setStats(prev => ({ ...prev, adsWatched: prev.adsWatched + 1 }));
      setWatchingAd(false);
      showSuccess('+5 Points!', 'Ad challenge progress updated!');
      haptic('success');
      return;
    }

    setAdTimer(10);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = 10 - elapsed;
      if (remaining <= 0) {
        clearInterval(interval);
        setAdTimer(0);
      } else {
        setAdTimer(remaining);
      }
    }, 1000);

    await new Promise(resolve => setTimeout(resolve, 10000));
    clearInterval(interval);

    if (!result.completed || result.watchedSeconds < 10) {
      setWatchingAd(false);
      setAdError(true);
      setAdErrorMsg('You must watch the full ad (10 seconds) to complete the challenge.');
      haptic('error');
      setTimeout(() => { setAdError(false); setAdErrorMsg(''); }, 3000);
      return;
    }

    await recordAdView(user.id, network, 5, 'challenge');
    await addPoints(5);
    setStats(prev => ({ ...prev, adsWatched: prev.adsWatched + 1 }));
    setWatchingAd(false);
    showSuccess('+5 Points!', 'Ad challenge progress updated!');
    haptic('success');
  }, [user, watchingAd, haptic, addPoints, showSuccess, showError]);

  const completedCount = challenges.filter(c => c.completed).length;
  const totalReward = challenges.reduce((sum, c) => sum + c.reward_bonus, 0);

  // Ad challenge tiers
  const adTiers = [
    { target: 3, reward: 15, label: 'Watch 3 ads' },
    { target: 5, reward: 25, label: 'Watch 5 ads' },
    { target: 10, reward: 50, label: 'Watch 10 ads' },
    { target: 20, reward: 100, label: 'Watch 20 ads' },
  ];

  // Referral challenge tiers
  const refTiers = [
    { target: 1, reward: 20, label: 'Invite 1 friend' },
    { target: 3, reward: 60, label: 'Invite 3 friends' },
    { target: 5, reward: 120, label: 'Invite 5 friends' },
    { target: 10, reward: 300, label: 'Invite 10 friends' },
  ];

  // Task challenge tiers
  const taskTiers = [
    { target: 1, reward: 10, label: 'Complete 1 task' },
    { target: 3, reward: 30, label: 'Complete 3 tasks' },
    { target: 5, reward: 50, label: 'Complete 5 tasks' },
  ];

  const tabs: { id: ChallengeTab; label: string; icon: React.ReactNode }[] = [
    { id: 'game', label: 'Games', icon: <Trophy size={16} /> },
    { id: 'ads', label: 'Ads', icon: <Tv size={16} /> },
    { id: 'referral', label: 'Refer', icon: <Users size={16} /> },
    { id: 'task', label: 'Tasks', icon: <Target size={16} /> },
  ];

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">🏆</span>
          Daily Challenges
        </h1>
        <p className="text-purple-300 mt-2">Complete challenges for bonus rewards!</p>
      </div>

      {/* Timer Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden bg-gradient-to-br from-purple-800/30 to-blue-800/30">
        <div className="absolute top-0 right-0 text-8xl opacity-20 transform translate-x-8 -translate-y-4">⏰</div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="text-yellow-400" size={20} />
              <span className="text-gray-400 text-sm">Time Remaining</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="text-orange-400" size={20} />
              <span className="text-orange-400 font-bold">{streak} day streak</span>
            </div>
          </div>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold font-['Orbitron'] text-white">{timeLeft}</div>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-sm">{completedCount}/{challenges.length} game challenges</span>
                <span className="text-yellow-400 text-sm">+{totalReward} bonus</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${challenges.length > 0 ? (completedCount / challenges.length) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #00c853, #fbbf24)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { haptic('light'); setTab(t.id); }}
            className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
              tab === t.id
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Ad watching overlay */}
      {watchingAd && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4" style={{ background: 'rgba(8,8,20,0.9)' }}>
          <div className="w-full max-w-sm">
            <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(0,200,83,0.2))' }}>
              <div className="text-5xl mb-4 animate-bounce">📺</div>
              <p className="text-white font-bold text-lg mb-2">Watching Ad...</p>
              <div className="text-6xl font-black text-yellow-400 font-['Orbitron']">{adTimer}s</div>
              <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${((10 - adTimer) / 10) * 100}%`,
                    background: 'linear-gradient(90deg, #00c853, #fbbf24)',
                  }}
                />
              </div>
              <p className="text-gray-500 text-xs mt-4">Watch the full 10 seconds to earn</p>
            </div>
          </div>
        </div>
      )}

      {/* Ad error overlay */}
      {adError && !watchingAd && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4" style={{ background: 'rgba(8,8,20,0.9)' }}>
          <div className="w-full max-w-sm">
            <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(0,0,0,0.3))' }}>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-400" size={32} />
              </div>
              <p className="text-white font-bold text-lg mb-2">Ad Not Completed</p>
              <p className="text-gray-400 text-sm">{adErrorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Game Challenges Tab */}
      {tab === 'game' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><div className="loader" /></div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3 opacity-40">🎮</div>
              <p className="text-gray-400">No game challenges available today</p>
            </div>
          ) : (
            challenges.map((challenge) => (
              <div
                key={challenge.id}
                className={`glass-card p-4 ${challenge.completed ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`text-4xl ${challenge.completed ? 'grayscale' : ''}`}>
                      {challenge.game_icon}
                    </div>
                    {challenge.completed && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">{challenge.game_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Target className="text-purple-400" size={16} />
                      <span className="text-gray-400 text-sm">Target: {challenge.target_score} points</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {challenge.completed ? (
                      <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                        Completed
                      </div>
                    ) : (
                      <div>
                        <p className="text-yellow-400 font-bold">+{challenge.reward_bonus}</p>
                        <p className="text-gray-500 text-xs">bonus</p>
                      </div>
                    )}
                  </div>
                </div>
                {!challenge.completed && (
                  <button
                    onClick={() => { haptic('light'); setCurrentView('games'); }}
                    className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Play size={18} />
                    Play Challenge
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Ads Challenges Tab */}
      {tab === 'ads' && (
        <div className="space-y-4">
          <div className="glass-card p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.1), rgba(0,212,255,0.1))' }}>
            <div className="flex items-center gap-3 mb-3">
              <Tv className="text-green-400" size={24} />
              <div>
                <p className="text-white font-bold">Watch Ads Challenge</p>
                <p className="text-gray-400 text-sm">Today: {stats.adsWatched} ads watched</p>
              </div>
            </div>
            <button
              onClick={watchChallengeAd}
              disabled={watchingAd}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-yellow-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play size={18} />
              Watch Ad for Challenge
            </button>
          </div>

          {adTiers.map((tier, i) => {
            const progress = Math.min(stats.adsWatched / tier.target, 1);
            const completed = stats.adsWatched >= tier.target;
            return (
              <div key={i} className={`glass-card p-4 ${completed ? 'opacity-70' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${completed ? 'bg-green-500/20' : 'bg-white/10'}`}>
                    {completed ? <CheckCircle className="text-green-400" size={24} /> : <Tv className="text-green-400" size={24} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{tier.label}</h3>
                    <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #00c853, #fbbf24)' }}
                      />
                    </div>
                    <p className="text-gray-400 text-xs mt-1">{stats.adsWatched}/{tier.target}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">+{tier.reward}</p>
                    <p className="text-gray-500 text-xs">pts</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Referral Challenges Tab */}
      {tab === 'referral' && (
        <div className="space-y-4">
          <div className="glass-card p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(0,200,83,0.1))' }}>
            <div className="flex items-center gap-3">
              <Users className="text-purple-400" size={24} />
              <div>
                <p className="text-white font-bold">Referral Challenge</p>
                <p className="text-gray-400 text-sm">Total referrals: {stats.referralsCount}</p>
              </div>
            </div>
          </div>

          {refTiers.map((tier, i) => {
            const progress = Math.min(stats.referralsCount / tier.target, 1);
            const completed = stats.referralsCount >= tier.target;
            return (
              <div key={i} className={`glass-card p-4 ${completed ? 'opacity-70' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${completed ? 'bg-green-500/20' : 'bg-white/10'}`}>
                    {completed ? <CheckCircle className="text-green-400" size={24} /> : <Users className="text-purple-400" size={24} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{tier.label}</h3>
                    <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #7c3aed, #fbbf24)' }}
                      />
                    </div>
                    <p className="text-gray-400 text-xs mt-1">{stats.referralsCount}/{tier.target}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">+{tier.reward}</p>
                    <p className="text-gray-500 text-xs">pts</p>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => { haptic('light'); setCurrentView('referrals'); }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-2"
          >
            <Gift size={18} /> Go to Referrals
          </button>
        </div>
      )}

      {/* Task Challenges Tab */}
      {tab === 'task' && (
        <div className="space-y-4">
          <div className="glass-card p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,200,83,0.1))' }}>
            <div className="flex items-center gap-3">
              <Target className="text-blue-400" size={24} />
              <div>
                <p className="text-white font-bold">Task Challenge</p>
                <p className="text-gray-400 text-sm">Today: {stats.tasksCompleted} tasks completed</p>
              </div>
            </div>
          </div>

          {taskTiers.map((tier, i) => {
            const progress = Math.min(stats.tasksCompleted / tier.target, 1);
            const completed = stats.tasksCompleted >= tier.target;
            return (
              <div key={i} className={`glass-card p-4 ${completed ? 'opacity-70' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${completed ? 'bg-green-500/20' : 'bg-white/10'}`}>
                    {completed ? <CheckCircle className="text-green-400" size={24} /> : <Target className="text-blue-400" size={24} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{tier.label}</h3>
                    <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #00d4ff, #fbbf24)' }}
                      />
                    </div>
                    <p className="text-gray-400 text-xs mt-1">{stats.tasksCompleted}/{tier.target}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">+{tier.reward}</p>
                    <p className="text-gray-500 text-xs">pts</p>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => { haptic('light'); setCurrentView('tasks'); }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold flex items-center justify-center gap-2"
          >
            <Target size={18} /> Go to Tasks
          </button>
        </div>
      )}

      {/* All Complete Bonus */}
      {completedCount === challenges.length && challenges.length > 0 && tab === 'game' && (
        <div className="glass-card p-6 mt-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(0,200,83,0.1))', border: '1px solid rgba(251,191,36,0.3)' }}>
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-yellow-400 font-bold text-xl mb-2">All Game Challenges Complete!</h3>
          <p className="text-gray-400 text-sm">Come back tomorrow for new challenges</p>
        </div>
      )}
    </div>
  );
}
