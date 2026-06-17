import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { Trophy, Clock, Flame, Target, ChevronRight, CheckCircle, Lock } from 'lucide-react';

interface DailyChallenge {
  id: string;
  game_id: string;
  game_name: string;
  game_icon: string;
  target_score: number;
  reward_bonus: number;
  completed: boolean;
  best_score: number;
}

export function DailyChallengeView() {
  const { user, setCurrentView, addPoints, haptic } = useApp();
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    loadChallenges();
    calculateTimeLeft();

    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

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

  async function loadChallenges() {
    if (!user) return;

    setLoading(true);
    try {
      // Get today's challenges
      const today = new Date().toISOString().split('T')[0];

      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true);

      if (!gameData || gameData.length === 0) {
        setLoading(false);
        return;
      }

      // Create challenges for today if they don't exist
      const { data: existingChallenges } = await supabase
        .from('daily_challenges')
        .select('*, games(name, icon)')
        .eq('challenge_date', today);

      let challengesToUse = existingChallenges;

      if (!existingChallenges || existingChallenges.length === 0) {
        // Generate new daily challenges
        const selectedGames = gameData
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

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

      // Check user completions
      const { data: completions } = await supabase
        .from('daily_challenge_completions')
        .select('*')
        .eq('user_id', user.id)
        .in('challenge_id', challengesToUse?.map(c => c.id) || []);

      const completedIds = new Set(completions?.map(c => c.challenge_id) || []);

      // Get best scores from game_sessions
      const formatted = challengesToUse?.map(c => ({
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

      // Calculate streak
      const { count } = await supabase
        .from('daily_challenge_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStreak(count || 0);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  }

  const completedCount = challenges.filter(c => c.completed).length;
  const totalReward = challenges.reduce((sum, c) => sum + c.reward_bonus, 0);

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">🏆</span>
          Daily Challenges
        </h1>
        <p className="text-purple-300 mt-2">Complete all challenges for bonus rewards!</p>
      </div>

      {/* Timer Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden bg-gradient-to-br from-purple-800/30 to-blue-800/30">
        <div className="absolute top-0 right-0 text-8xl opacity-20 transform translate-x-8 -translate-y-4">
          ⏰
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="text-gold-400" size={20} />
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
                <span className="text-gray-400 text-sm">{completedCount}/{challenges.length} completed</span>
                <span className="text-gold-400 text-sm">+{totalReward} bonus</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(completedCount / challenges.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Challenges List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="loader" />
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge) => (
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
                    <span className="text-gray-400 text-sm">
                      Target: {challenge.target_score} points
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {challenge.completed ? (
                    <div className="badge bg-green-500/30 text-green-400">
                      Completed
                    </div>
                  ) : (
                    <div>
                      <p className="text-gold-400 font-bold">+{challenge.reward_bonus}</p>
                      <p className="text-gray-500 text-xs">bonus</p>
                    </div>
                  )}
                </div>
              </div>

              {!challenge.completed && (
                <button
                  onClick={() => {
                    haptic('light');
                    // Navigate to game
                    setCurrentView('games');
                  }}
                  className="btn-neon w-full mt-4 flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" />
                  Play Challenge
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* All Complete Bonus */}
      {completedCount === challenges.length && challenges.length > 0 && (
        <div className="glass-card p-6 mt-6 text-center bg-gradient-to-br from-gold-500/20 to-gold-600/20 border-gold-500/30">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-gold-400 font-bold text-xl mb-2">All Challenges Complete!</h3>
          <p className="text-gray-400 text-sm">Come back tomorrow for new challenges</p>
        </div>
      )}
    </div>
  );
}

function PlayCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
