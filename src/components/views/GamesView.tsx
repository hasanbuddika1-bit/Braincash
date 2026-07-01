import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Trophy, HelpCircle, X, Star, Zap, Heart, Play, Target, Award, CheckCircle } from 'lucide-react';

const MAX_CHANCES = 5;
const AD_PROVIDERS = [
  { id: 'adgamer', name: 'AdGamer', logo: '🎮' },
  { id: 'monetag', name: 'Monetag', logo: '📊' },
  { id: 'gigapub', name: 'Gigapub', logo: '🚀' },
  { id: 'monetix', name: 'Monetix', logo: '💰' },
];

const GAME_CHALLENGE_TIERS = [
  { rounds: 10, reward: 10 },
  { rounds: 20, reward: 25 },
  { rounds: 50, reward: 100 },
  { rounds: 100, reward: 500 },
];

// ── Reward claim popup ──────────────────────────────────────────────────────

interface RewardPopupProps {
  reward: number;
  score?: number | string;
  onClaim: () => void;
  gameIcon?: string;
}

function RewardPopup({ reward, score, onClaim, gameIcon = '🎮' }: RewardPopupProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 animate-fade-in">
      <div className="mx-4 w-full max-w-sm rounded-3xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0a0d1a 0%, #1a0a2e 100%)',
        border: '1px solid rgba(0,200,83,0.4)',
        boxShadow: '0 0 40px rgba(0,200,83,0.3)',
      }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24, #7c3aed)' }} />
        <div className="p-8 text-center">
          <div className="text-6xl mb-4 animate-bounce-slow">{gameIcon}</div>
          <div className="mb-3">
            <div className="text-2xl font-black text-white mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Level Complete!
            </div>
            {score !== undefined && (
              <p className="text-gray-400 text-sm">Score: <span className="text-white font-bold">{score}</span></p>
            )}
          </div>
          <div className="my-6 p-4 rounded-2xl" style={{ background: 'rgba(0,200,83,0.15)', border: '1px solid rgba(0,200,83,0.3)' }}>
            <p className="text-gray-400 text-sm mb-1">You earned</p>
            <div className="flex items-center justify-center gap-2">
              <Star className="text-gold-400" size={24} />
              <span className="text-4xl font-black text-gold-400">+{reward}</span>
              <span className="text-gold-400 text-xl font-bold">pts</span>
            </div>
          </div>
          <button
            onClick={onClaim}
            className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95"
            style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814', boxShadow: '0 0 20px rgba(0,200,83,0.5)' }}
          >
            Claim Reward!
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tutorial overlay ────────────────────────────────────────────────────────

const TUTORIALS: Record<string, { title: string; steps: string[]; icon: string }> = {
  memory: { icon: '🧠', title: 'Memory Match', steps: ['Flip cards to reveal emojis', 'Find matching pairs', 'Match all pairs to win!', 'Fewer moves = better score'] },
  connect: { icon: '🔗', title: 'Tile Connect', steps: ['Tap a tile to select it', 'Tap another tile with the same emoji', 'Match all pairs to win!', 'Connect them all quickly!'] },
  color: { icon: '🎨', title: 'Color Match', steps: ['Read the color name shown', 'Tap the matching color box', 'Score as many as possible in 30s', 'Wrong tap costs nothing!'] },
  wordguess: { icon: '🔤', title: 'Word Guess', steps: ['Guess the hidden 5-letter word', 'Type a letter to guess', 'Green = correct position', 'Yellow = wrong position', '6 attempts allowed!'] },
  numberguess: { icon: '#️⃣', title: 'Number Guess', steps: ['Guess the secret number 1-100', 'You will get hints: Higher/Lower', 'Keep guessing until you find it!', 'Fewer guesses = better score!'] },
  wordtype: { icon: '⌨️', title: 'Word Type', steps: ['A word appears on screen', 'Type it correctly before time runs out!', 'Faster typing = more points', 'Complete all words to win!'] },
  math: { icon: '🔢', title: 'Math Master', steps: ['Solve math problems quickly!', 'Type the correct answer', 'Each correct answer = +1 score', '30 seconds to solve as many as you can!'] },
  drawing: { icon: '✏️', title: 'Drawing Match', steps: ['A shape will appear on screen', 'Draw it on the canvas!', 'Match the shape to win', 'Use the clear button to restart'] },
};

function TutorialOverlay({ gameType, onClose }: { gameType: string; onClose: () => void }) {
  const tutorial = TUTORIALS[gameType];
  if (!tutorial) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 animate-fade-in">
      <div className="mx-4 w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0d1a 0%, #0d0a18 100%)', border: '1px solid rgba(124,58,237,0.4)' }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="text-4xl">{tutorial.icon}</div>
            <div>
              <h3 className="text-white font-black text-xl" style={{ fontFamily: "'Orbitron', sans-serif" }}>{tutorial.title}</h3>
              <p className="text-purple-300 text-sm">How to play</p>
            </div>
            <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white"><X size={24} /></button>
          </div>
          <div className="space-y-3 mb-6">
            {tutorial.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00c853, #fbbf24)', color: '#080814' }}>{i + 1}</div>
                <p className="text-white text-sm">{step}</p>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-white transition-all" style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }}>Start Playing!</button>
        </div>
      </div>
    </div>
  );
}

// ── GamesView ───────────────────────────────────────────────────────────────

export function GamesView() {
  const { games, setCurrentView, setSelectedGame, haptic, user } = useApp();
  const [gameChances, setGameChances] = useState<Record<string, number>>({});
  const [totalRounds, setTotalRounds] = useState(0);
  const [claimedTiers, setClaimedTiers] = useState<number[]>([]);

  useEffect(() => {
    loadChancesAndChallenges();
  }, [user?.id]);

  async function loadChancesAndChallenges() {
    if (!user) return;
    try {
      // Load chances for all games
      const { data: chances } = await supabase
        .from('game_chances')
        .select('game_id, chances_left, last_refill_date')
        .eq('user_id', user.id);

      const today = new Date().toISOString().split('T')[0];
      const chancesMap: Record<string, number> = {};
      (chances || []).forEach(c => {
        // Reset if new day
        chancesMap[c.game_id] = c.last_refill_date !== today ? MAX_CHANCES : c.chances_left;
      });
      setGameChances(chancesMap);

      // Load total rounds today
      const { data: rounds } = await supabase
        .from('game_round_counts')
        .select('rounds_played, last_reset_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (rounds) {
        setTotalRounds(rounds.last_reset_date !== today ? 0 : rounds.rounds_played);
      }

      // Load claimed challenge tiers today
      const { data: claims } = await supabase
        .from('game_challenge_claims')
        .select('tier')
        .eq('user_id', user.id)
        .eq('claim_date', today);

      setClaimedTiers((claims || []).map(c => c.tier));
    } catch (err) {
      console.error('Error loading game data:', err);
    }
  }

  const handleGameClick = (game: typeof games[0]) => {
    haptic('light');
    const chances = gameChances[game.id] ?? MAX_CHANCES;
    if (chances <= 0) {
      haptic('error');
      return;
    }
    setSelectedGame(game);
    setCurrentView('game');
  };

  const SUPPORTED_TYPES = ['memory', 'connect', 'color', 'wordguess', 'numberguess', 'wordtype', 'math', 'drawing'];
  const availableGames = games.filter(g => SUPPORTED_TYPES.includes(g.game_type));

  async function claimGameChallenge(tier: typeof GAME_CHALLENGE_TIERS[0]) {
    if (!user || claimedTiers.includes(tier.rounds) || totalRounds < tier.rounds) return;
    haptic('light');
    try {
      await supabase.from('game_challenge_claims').insert({
        user_id: user.id,
        tier: tier.rounds,
      });
      // Add points
      const { error } = await supabase.rpc('add_points', { user_id: user.id, amount: tier.reward });
      if (error) {
        await supabase.from('users').update({ points: user.points + tier.reward, total_earned: user.total_earned + tier.reward }).eq('id', user.id);
      }
      setClaimedTiers([...claimedTiers, tier.rounds]);
      showGameSuccess(`+${tier.reward} Points!`, `Game challenge (${tier.rounds} rounds) claimed!`);
      haptic('success');
    } catch (err) {
      console.error('Error claiming challenge:', err);
    }
  }

  const { success: showGameSuccess } = useToast();

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">🎮</span>
          Play & Earn
        </h1>
        <p className="text-green-400 mt-2">Play games to earn points! 5 chances per game per day.</p>
      </div>

      {/* Daily Game Challenge */}
      <div className="glass-card p-4 mb-6" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.1) 0%, rgba(124,58,237,0.1) 100%)', border: '1px solid rgba(0,200,83,0.2)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="text-gold-400" size={24} />
          <div>
            <p className="text-white font-bold">Daily Game Challenge</p>
            <p className="text-gray-400 text-sm">Play games to reach round milestones!</p>
          </div>
        </div>

        {/* Total rounds progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Rounds played today</span>
            <span className="text-gold-400 font-bold">{totalRounds}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((totalRounds / 100) * 100, 100)}%`,
                background: 'linear-gradient(90deg, #00c853, #fbbf24, #7c3aed)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite',
              }}
            />
          </div>
        </div>

        {/* Challenge tiers */}
        <div className="grid grid-cols-2 gap-3">
          {GAME_CHALLENGE_TIERS.map((tier) => {
            const reached = totalRounds >= tier.rounds;
            const claimed = claimedTiers.includes(tier.rounds);
            return (
              <div
                key={tier.rounds}
                className={`p-3 rounded-xl border-2 transition-all ${
                  claimed ? 'bg-green-500/10 border-green-500/30' :
                  reached ? 'bg-gold-400/10 border-gold-400/50' :
                  'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-bold text-sm">{tier.rounds} Rounds</span>
                  {claimed && <CheckCircle className="text-green-400" size={16} />}
                </div>
                <p className="text-gold-400 text-sm font-semibold mb-2">+{tier.reward} pts</p>
                {claimed ? (
                  <p className="text-green-400 text-xs text-center">Claimed</p>
                ) : reached ? (
                  <button
                    onClick={() => claimGameChallenge(tier)}
                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-gold-500 text-white text-xs font-bold"
                  >
                    Claim
                  </button>
                ) : (
                  <p className="text-gray-500 text-xs text-center">{tier.rounds - totalRounds} more</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 gap-4">
        {availableGames.map((game) => {
          const chances = gameChances[game.id] ?? MAX_CHANCES;
          return (
            <div
              key={game.id}
              onClick={() => handleGameClick(game)}
              className={`glass-card p-5 flex flex-col items-center gap-3 cursor-pointer transition-all hover:scale-105 active:scale-95 ${chances <= 0 ? 'opacity-50' : ''}`}
              style={{ border: '1px solid rgba(0,200,83,0.2)' }}
            >
              <div className="text-5xl">{game.icon}</div>
              <h3 className="text-white font-bold text-center text-sm">{game.name}</h3>
              <p className="text-gray-400 text-xs text-center leading-relaxed">{game.description}</p>
              {/* Chances (hearts) */}
              <div className="flex items-center gap-1">
                {Array.from({ length: MAX_CHANCES }).map((_, i) => (
                  <Heart
                    key={i}
                    size={14}
                    className={i < chances ? 'text-red-400 fill-red-400' : 'text-gray-600'}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 mt-1 px-3 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <Zap className="text-gold-400" size={12} />
                <span className="text-gold-400 text-sm font-bold">{game.reward_range_min}-{game.reward_range_max} pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GamePlayView ─────────────────────────────────────────────────────────────

export function GamePlayView() {
  const { selectedGame, setCurrentView, haptic, user } = useApp();
  const [showTutorial, setShowTutorial] = useState(true);
  const [chancesLeft, setChancesLeft] = useState(MAX_CHANCES);
  const [showAdRefill, setShowAdRefill] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const [adPlaying, setAdPlaying] = useState(false);
  const [currentAdIdx, setCurrentAdIdx] = useState(0);
  const [roundCompleted, setRoundCompleted] = useState(false);

  useEffect(() => {
    if (user && selectedGame) {
      loadChances();
    }
  }, [user?.id, selectedGame?.id]);

  async function loadChances() {
    if (!user || !selectedGame) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('game_chances')
        .select('chances_left, last_refill_date')
        .eq('user_id', user.id)
        .eq('game_id', selectedGame.id)
        .maybeSingle();

      if (data) {
        setChancesLeft(data.last_refill_date !== today ? MAX_CHANCES : data.chances_left);
      } else {
        setChancesLeft(MAX_CHANCES);
      }
    } catch {}
  }

  async function consumeChance() {
    if (!user || !selectedGame) return;
    const newChances = chancesLeft - 1;
    setChancesLeft(newChances);
    setRoundCompleted(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      // Upsert game chances
      const { data: existing } = await supabase
        .from('game_chances')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_id', selectedGame.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('game_chances')
          .update({ chances_left: newChances, last_refill_date: today })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('game_chances')
          .insert({ user_id: user.id, game_id: selectedGame.id, chances_left: newChances, last_refill_date: today });
      }

      // Increment total rounds
      const { data: roundsData } = await supabase
        .from('game_round_counts')
        .select('id, rounds_played, last_reset_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roundsData) {
        const newRounds = roundsData.last_reset_date !== today ? 1 : roundsData.rounds_played + 1;
        await supabase
          .from('game_round_counts')
          .update({ rounds_played: newRounds, last_reset_date: today })
          .eq('id', roundsData.id);
      } else {
        await supabase
          .from('game_round_counts')
          .insert({ user_id: user.id, rounds_played: 1, last_reset_date: today });
      }
    } catch (err) {
      console.error('Error consuming chance:', err);
    }
  }

  function startAdRefill() {
    haptic('light');
    setAdPlaying(true);
    setAdTimer(5);
  }

  useEffect(() => {
    if (adPlaying && adTimer > 0) {
      const t = setTimeout(() => setAdTimer(at => at - 1), 1000);
      return () => clearTimeout(t);
    } else if (adPlaying && adTimer === 0) {
      setAdPlaying(false);
      // Refill 1 chance
      const newChances = chancesLeft + 1;
      setChancesLeft(newChances);
      setShowAdRefill(false);
      haptic('success');
      // Save to DB
      if (user && selectedGame) {
        const today = new Date().toISOString().split('T')[0];
        supabase
          .from('game_chances')
          .update({ chances_left: newChances, last_refill_date: today })
          .eq('user_id', user.id)
          .eq('game_id', selectedGame.id)
          .then();
      }
      setCurrentAdIdx((currentAdIdx + 1) % AD_PROVIDERS.length);
    }
  }, [adPlaying, adTimer]);

  if (!selectedGame) {
    setCurrentView('games');
    return null;
  }

  // No chances left - show ad refill prompt
  if (chancesLeft <= 0 && !showAdRefill) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #080814 0%, #0a0d1a 100%)' }}>
        <div className="text-6xl mb-4">💔</div>
        <h2 className="text-white font-bold text-xl mb-2">No Chances Left!</h2>
        <p className="text-gray-400 text-center mb-6">You've used all your chances for this game today. Watch an ad to get 1 more chance!</p>
        <button onClick={() => setShowAdRefill(true)} className="btn-neon-gold w-full max-w-xs flex items-center justify-center gap-2">
          <Play size={20} /> Watch Ad for +1 Chance
        </button>
        <button onClick={() => { haptic('light'); setCurrentView('games'); }} className="mt-4 text-gray-400 text-sm">
          Back to Games
        </button>
      </div>
    );
  }

  // Ad refill overlay
  if (showAdRefill) {
    const currentAd = AD_PROVIDERS[currentAdIdx];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4">
        <div className="w-full max-w-sm">
          {!adPlaying ? (
            <div className="glass-card p-8 text-center">
              <div className="text-5xl mb-4">{currentAd.logo}</div>
              <p className="text-white font-bold text-lg mb-2">{currentAd.name}</p>
              <p className="text-gray-400 text-sm mb-6">Watch this ad to get +1 chance</p>
              <button onClick={startAdRefill} className="btn-neon-gold w-full flex items-center justify-center gap-2">
                <Play size={20} /> Watch Ad
              </button>
              <button onClick={() => setShowAdRefill(false)} className="w-full mt-4 py-3 rounded-xl bg-white/10 text-gray-400 font-semibold">
                Cancel
              </button>
            </div>
          ) : (
            <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(0,212,255,0.2))' }}>
              <div className="text-5xl mb-4 animate-bounce-slow">{currentAd.logo}</div>
              <p className="text-white font-bold text-lg mb-2">{currentAd.name}</p>
              <p className="text-gray-400 text-sm mb-4">Ad playing...</p>
              <div className="text-6xl font-black text-gold-400 font-['Orbitron']">{adTimer}s</div>
              <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${((5 - adTimer) / 5) * 100}%`, background: 'linear-gradient(90deg, #00c853, #fbbf24)' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #080814 0%, #0a0d1a 100%)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={() => { haptic('light'); setCurrentView('games'); }} className="p-2 rounded-full bg-white/10 text-white">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-3xl">{selectedGame.icon}</span>
          <div>
            <h2 className="text-white font-bold leading-none">{selectedGame.name}</h2>
            <p className="text-green-400 text-xs">+{selectedGame.reward_range_min}-{selectedGame.reward_range_max} pts per level</p>
          </div>
        </div>
        {/* Chances display */}
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_CHANCES }).map((_, i) => (
            <Heart key={i} size={16} className={i < chancesLeft ? 'text-red-400 fill-red-400' : 'text-gray-600'} />
          ))}
        </div>
        <button onClick={() => setShowTutorial(true)} className="p-2 rounded-full bg-white/10 text-gray-400">
          <HelpCircle size={20} />
        </button>
      </div>

      {/* Game Area */}
      <div className="flex-1 overflow-auto">
        {selectedGame.game_type === 'memory'      && <GameMemory onRoundComplete={consumeChance} />}
        {selectedGame.game_type === 'connect'     && <GameTileConnect onRoundComplete={consumeChance} />}
        {selectedGame.game_type === 'color'       && <GameColorMatch onRoundComplete={consumeChance} />}
        {selectedGame.game_type === 'wordguess'   && <GameWordGuess onRoundComplete={consumeChance} />}
        {selectedGame.game_type === 'numberguess' && <GameNumberGuess onRoundComplete={consumeChance} />}
        {selectedGame.game_type === 'wordtype'    && <GameWordType onRoundComplete={consumeChance} />}
        {selectedGame.game_type === 'math'        && <GameMath onRoundComplete={consumeChance} />}
        {selectedGame.game_type === 'drawing'     && <GameDrawing onRoundComplete={consumeChance} />}
      </div>

      {showTutorial && <TutorialOverlay gameType={selectedGame.game_type} onClose={() => setShowTutorial(false)} />}
    </div>
  );
}

// ── useGameReward hook ───────────────────────────────────────────────────────

function useGameReward(onRoundComplete?: () => void) {
  const { user, addPoints, haptic } = useApp();
  const { success: showSuccess } = useToast();
  const [pendingReward, setPendingReward] = useState<number | null>(null);
  const [pendingScore, setPendingScore] = useState<number | string | undefined>(undefined);

  const completeLevel = useCallback(async (score?: number | string) => {
    const reward = Math.floor(Math.random() * 5) + 4;

    if (user && user.id !== 'demo') {
      try {
        await supabase.from('game_sessions').insert({
          user_id: user.id,
          game_id: user.id,
          score: typeof score === 'number' ? score : 0,
          reward,
        });
      } catch {}
    }

    setPendingScore(score);
    setPendingReward(reward);
    haptic('success');
    onRoundComplete?.();
  }, [user, haptic, onRoundComplete]);

  const claimReward = useCallback(async () => {
    if (pendingReward !== null) {
      await addPoints(pendingReward);
      showSuccess(`+${pendingReward} Points!`, 'Reward claimed!');
      setPendingReward(null);
      setPendingScore(undefined);
    }
  }, [pendingReward, addPoints, showSuccess]);

  return { completeLevel, claimReward, pendingReward, pendingScore };
}

// ── GameMemory ───────────────────────────────────────────────────────────────

function GameMemory({ onRoundComplete }: { onRoundComplete?: () => void }) {
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward, pendingScore } = useGameReward(onRoundComplete);

  const emojis = ['🧠', '💎', '💰', '🎮', '🏆', '⭐', '🚀', '💫'];

  useEffect(() => { initializeGame(); }, []);

  function initializeGame() {
    const pairs = [...emojis, ...emojis];
    setCards(pairs.sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  }

  function handleCardClick(index: number) {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;
    haptic('light');
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setTimeout(() => {
        if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
          const newMatched = [...matched, ...newFlipped];
          setMatched(newMatched);
          haptic('success');
          if (newMatched.length === cards.length) {
            completeLevel(moves + 1 + ' moves');
          }
        }
        setFlipped([]);
      }, 500);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="flex items-center gap-6">
        <div className="text-center"><p className="text-gray-400 text-xs">Moves</p><p className="text-2xl font-bold text-gold-400">{moves}</p></div>
        <div className="text-center"><p className="text-gray-400 text-xs">Matched</p><p className="text-2xl font-bold text-green-400">{matched.length / 2}/{emojis.length}</p></div>
      </div>
      <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
        {cards.map((emoji, index) => (
          <button key={index} onClick={() => handleCardClick(index)}
            className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-200 ${
              flipped.includes(index) || matched.includes(index) ? 'bg-gradient-to-br from-purple-600 to-blue-600 scale-95' : 'bg-white/10 hover:bg-white/15'
            } ${matched.includes(index) ? 'opacity-40' : ''}`}>
            {(flipped.includes(index) || matched.includes(index)) ? emoji : '?'}
          </button>
        ))}
      </div>
      <button onClick={initializeGame} className="text-gray-500 text-sm mt-2">Restart</button>
      {pendingReward !== null && <RewardPopup reward={pendingReward} score={pendingScore} gameIcon="🧠" onClaim={() => { claimReward(); initializeGame(); }} />}
    </div>
  );
}

// ── GameTileConnect ──────────────────────────────────────────────────────────

function GameTileConnect({ onRoundComplete }: { onRoundComplete?: () => void }) {
  const [tiles, setTiles] = useState<{ id: number; emoji: string; matched: boolean }[]>([]);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward, pendingScore } = useGameReward(onRoundComplete);

  const emojis = ['💎', '💰', '🧠', '⚡', '🚀', '⭐', '🎮', '🏆'];

  useEffect(() => { initializeGame(); }, []);

  function initializeGame() {
    const pairs = [...emojis, ...emojis];
    setTiles(pairs.sort(() => Math.random() - 0.5).map((emoji, index) => ({ id: index, emoji, matched: false })));
    setScore(0);
    setSelectedTile(null);
  }

  function handleTileClick(id: number) {
    if (tiles[id].matched) return;
    haptic('light');
    if (selectedTile === null) { setSelectedTile(id); }
    else if (selectedTile === id) { setSelectedTile(null); }
    else {
      if (tiles[selectedTile].emoji === tiles[id].emoji) {
        const newTiles = tiles.map((tile, index) => index === selectedTile || index === id ? { ...tile, matched: true } : tile);
        setTiles(newTiles);
        setScore(s => s + 10);
        haptic('success');
        if (newTiles.every(t => t.matched)) { completeLevel(score + 10); }
      }
      setSelectedTile(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="text-center"><p className="text-gray-400 text-xs">Score</p><p className="text-2xl font-bold text-gold-400">{score}</p></div>
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((tile) => (
          <button key={tile.id} onClick={() => handleTileClick(tile.id)}
            className={`w-16 h-16 rounded-xl text-3xl flex items-center justify-center transition-all ${
              tile.matched ? 'opacity-25 bg-green-500/20' :
              selectedTile === tile.id ? 'bg-gradient-to-br from-purple-500 to-blue-500 scale-110' :
              'bg-white/10 hover:bg-white/15 active:scale-95'
            }`}>
            {tile.emoji}
          </button>
        ))}
      </div>
      {pendingReward !== null && <RewardPopup reward={pendingReward} score={pendingScore} gameIcon="🔗" onClaim={() => { claimReward(); initializeGame(); }} />}
    </div>
  );
}

// ── GameColorMatch ───────────────────────────────────────────────────────────

function GameColorMatch({ onRoundComplete }: { onRoundComplete?: () => void }) {
  const colors = [
    { name: 'Red', hex: '#ef4444' }, { name: 'Orange', hex: '#f97316' }, { name: 'Yellow', hex: '#eab308' },
    { name: 'Green', hex: '#22c55e' }, { name: 'Blue', hex: '#3b82f6' }, { name: 'Purple', hex: '#a855f7' }, { name: 'Pink', hex: '#ec4899' },
  ];
  const [targetColor, setTargetColor] = useState(colors[0]);
  const [options, setOptions] = useState<typeof colors>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward(onRoundComplete);

  useEffect(() => { newRound(); }, []);
  useEffect(() => {
    if (timeLeft > 0 && !gameOver) { const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000); return () => clearTimeout(t); }
    else if (timeLeft === 0 && !gameOver) { setGameOver(true); completeLevel(score); }
  }, [timeLeft, gameOver]);

  function newRound() {
    const target = colors[Math.floor(Math.random() * colors.length)];
    setTargetColor(target);
    const shuffled = [...colors].sort(() => Math.random() - 0.5).slice(0, 4);
    if (!shuffled.find(c => c.hex === target.hex)) shuffled[0] = target;
    setOptions(shuffled.sort(() => Math.random() - 0.5));
  }

  function handleAnswer(color: typeof colors[0]) {
    if (gameOver) return;
    if (color.hex === targetColor.hex) { haptic('success'); setScore(s => s + 1); setFlash('correct'); setTimeout(() => { setFlash(null); newRound(); }, 200); }
    else { haptic('error'); setFlash('wrong'); setTimeout(() => setFlash(null), 300); }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="flex justify-between w-full max-w-xs">
        <div className="text-center"><p className="text-gray-400 text-xs">Time</p><p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</p></div>
        <div className="text-center"><p className="text-gray-400 text-xs">Score</p><p className="text-2xl font-bold text-gold-400">{score}</p></div>
      </div>
      {!gameOver && (
        <>
          <div className={`text-center py-4 px-8 rounded-2xl transition-all ${flash === 'correct' ? 'bg-green-500/30' : flash === 'wrong' ? 'bg-red-500/30' : 'bg-white/5'}`}>
            <p className="text-gray-400 text-sm mb-1">Find this color:</p>
            <p className="text-4xl font-black text-white">{targetColor.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            {options.map((color, index) => (
              <button key={index} onClick={() => handleAnswer(color)} className="aspect-square rounded-2xl transition-all active:scale-95 hover:scale-105" style={{ backgroundColor: color.hex, boxShadow: `0 4px 20px ${color.hex}60` }} />
            ))}
          </div>
        </>
      )}
      {pendingReward !== null && <RewardPopup reward={pendingReward} score={`${score} correct`} gameIcon="🎨" onClaim={() => { claimReward(); setScore(0); setTimeLeft(30); setGameOver(false); newRound(); }} />}
    </div>
  );
}

// ── GameWordGuess ─────────────────────────────────────────────────────────────

const WORD_LIST = ['BRAIN', 'MONEY', 'GAMES', 'POINT', 'EARNS', 'COINS', 'SMART', 'BONUS', 'PRIZE', 'TOKEN', 'SPEED', 'QUICK', 'LUCKY', 'POWER', 'LIGHT', 'TRACK', 'SCORE', 'QUEST', 'FLASH', 'GLOBE'];

function GameWordGuess({ onRoundComplete }: { onRoundComplete?: () => void }) {
  const [target, setTarget] = useState(() => WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const MAX_GUESSES = 6;
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward(onRoundComplete);

  const keyboard = ['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), ['⌫', ...'ZXCVBNM'.split(''), '↵']];

  function getLetterState(letter: string, position: number, word: string): 'correct' | 'present' | 'absent' | 'none' {
    if (word[position] === letter) return 'correct';
    if (word.includes(letter)) return 'present';
    return 'absent';
  }

  function handleKey(key: string) {
    if (gameOver) return;
    if (key === '⌫') { setCurrent(c => c.slice(0, -1)); }
    else if (key === '↵') {
      if (current.length !== 5) return;
      const newGuesses = [...guesses, current];
      setGuesses(newGuesses);
      haptic('light');
      if (current === target) { setWon(true); setGameOver(true); completeLevel(`${newGuesses.length}/${MAX_GUESSES}`); }
      else if (newGuesses.length >= MAX_GUESSES) { setGameOver(true); completeLevel(`0/${MAX_GUESSES}`); }
      setCurrent('');
    } else if (current.length < 5) { setCurrent(c => c + key); }
  }

  const usedLetters: Record<string, 'correct' | 'present' | 'absent'> = {};
  guesses.forEach(guess => { guess.split('').forEach((letter, i) => { const state = getLetterState(letter, i, target); if (!usedLetters[letter] || state === 'correct') { usedLetters[letter] = state; } }); });

  return (
    <div className="flex flex-col items-center p-3 gap-3 h-full">
      <div className="grid gap-1.5">
        {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
          const guess = guesses[rowIdx] || (rowIdx === guesses.length ? current : '');
          const isSubmitted = rowIdx < guesses.length;
          return (
            <div key={rowIdx} className="flex gap-1.5">
              {Array.from({ length: 5 }).map((_, colIdx) => {
                const letter = guess[colIdx] || '';
                const state = isSubmitted ? getLetterState(letter, colIdx, target) : 'none';
                return (
                  <div key={colIdx} className={`w-11 h-11 rounded-lg flex items-center justify-center text-white font-black text-lg border-2 transition-all ${
                    state === 'correct' ? 'bg-green-600 border-green-400' :
                    state === 'present' ? 'bg-yellow-600 border-yellow-400' :
                    state === 'absent' ? 'bg-gray-700 border-gray-600' :
                    letter ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/10'
                  }`}>{letter}</div>
                );
              })}
            </div>
          );
        })}
      </div>
      {gameOver && !pendingReward && <p className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>{won ? 'Correct!' : `Answer: ${target}`}</p>}
      <div className="space-y-1.5 w-full max-w-xs">
        {keyboard.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-1">
            {row.map((key) => {
              const state = usedLetters[key];
              return (
                <button key={key} onClick={() => handleKey(key)} className={`h-10 rounded-lg font-bold text-xs flex items-center justify-center transition-all active:scale-95 ${key === '⌫' || key === '↵' ? 'px-2 text-sm' : 'w-8'} ${
                  state === 'correct' ? 'bg-green-600 text-white' : state === 'present' ? 'bg-yellow-600 text-white' : state === 'absent' ? 'bg-gray-700 text-gray-400' : 'bg-white/15 text-white'
                }`}>{key}</button>
              );
            })}
          </div>
        ))}
      </div>
      {pendingReward !== null && <RewardPopup reward={pendingReward} score={won ? `Found in ${guesses.length} tries` : 'Better luck next time!'} gameIcon="🔤" onClaim={() => { claimReward(); setTarget(WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]); setGuesses([]); setCurrent(''); setGameOver(false); setWon(false); }} />}
    </div>
  );
}

// ── GameNumberGuess ─────────────────────────────────────────────────────────────

function GameNumberGuess({ onRoundComplete }: { onRoundComplete?: () => void }) {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState('');
  const [guesses, setGuesses] = useState<number[]>([]);
  const [hint, setHint] = useState<'higher' | 'lower' | 'correct' | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward(onRoundComplete);

  function handleGuess() {
    const num = parseInt(guess);
    if (isNaN(num) || num < 1 || num > 100) return;
    haptic('light');
    const newGuesses = [...guesses, num];
    setGuesses(newGuesses);
    if (num === target) { setHint('correct'); setGameOver(true); haptic('success'); completeLevel(`${newGuesses.length} guesses`); }
    else if (num < target) { setHint('higher'); } else { setHint('lower'); }
    setGuess('');
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="text-center"><p className="text-gray-400 text-sm">Guess the number</p><p className="text-white text-xl font-bold">1 - 100</p></div>
      <div className="flex flex-wrap gap-2 justify-center max-w-xs">
        {guesses.map((g, i) => (
          <span key={i} className={`px-3 py-1 rounded-full text-sm font-bold ${g === target ? 'bg-green-500/30 text-green-400' : g < target ? 'bg-blue-500/30 text-blue-400' : 'bg-orange-500/30 text-orange-400'}`}>{g}</span>
        ))}
      </div>
      {hint && !gameOver && (
        <div className={`text-center py-3 px-6 rounded-xl ${hint === 'higher' ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
          <p className={`text-xl font-bold ${hint === 'higher' ? 'text-blue-400' : 'text-orange-400'}`}>{hint === 'higher' ? '⬆️ Go Higher!' : '⬇️ Go Lower!'}</p>
        </div>
      )}
      {!gameOver && (
        <div className="flex gap-2 w-full max-w-xs">
          <input type="number" value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGuess()} placeholder="Your guess" min="1" max="100" className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white text-center font-bold text-xl focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <button onClick={handleGuess} className="px-6 py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }}>Guess</button>
        </div>
      )}
      <div className="text-center"><p className="text-gray-400 text-sm">Attempts: {guesses.length}</p></div>
      {pendingReward !== null && <RewardPopup reward={pendingReward} score={`${guesses.length} guesses`} gameIcon="#️⃣" onClaim={() => { claimReward(); setTarget(Math.floor(Math.random() * 100) + 1); setGuesses([]); setGuess(''); setHint(null); setGameOver(false); }} />}
    </div>
  );
}

// ── GameWordType ────────────────────────────────────────────────────────────────

const TYPE_WORDS = ['brain', 'cash', 'money', 'games', 'points', 'earn', 'play', 'bonus', 'prize', 'fast', 'quick', 'type', 'word', 'game', 'win', 'score', 'reward', 'token', 'speed', 'power', 'light', 'smart', 'level', 'quest'];

function GameWordType({ onRoundComplete }: { onRoundComplete?: () => void }) {
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward(onRoundComplete);

  useEffect(() => { const shuffled = [...TYPE_WORDS].sort(() => Math.random() - 0.5).slice(0, 10); setWords(shuffled); }, []);
  useEffect(() => {
    if (timeLeft > 0 && !gameOver) { const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000); return () => clearTimeout(t); }
    else if (timeLeft === 0 && !gameOver) { setGameOver(true); completeLevel(`${score}/${words.length}`); }
  }, [timeLeft, gameOver]);
  useEffect(() => { inputRef.current?.focus(); }, [currentWordIndex]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toLowerCase();
    setInput(value);
    if (words[currentWordIndex] && value === words[currentWordIndex].toLowerCase()) {
      haptic('success'); setScore(s => s + 1); setFlash('correct');
      setTimeout(() => { setFlash(null); setInput(''); if (currentWordIndex < words.length - 1) { setCurrentWordIndex(i => i + 1); } else { setGameOver(true); completeLevel(`${score + 1}/${words.length}`); } }, 200);
    }
  }

  const currentWord = words[currentWordIndex] || '';

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="flex justify-between w-full max-w-xs">
        <div className="text-center"><p className="text-gray-400 text-xs">Time</p><p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</p></div>
        <div className="text-center"><p className="text-gray-400 text-xs">Word</p><p className="text-2xl font-bold text-gold-400">{currentWordIndex + 1}/{words.length || 10}</p></div>
        <div className="text-center"><p className="text-gray-400 text-xs">Score</p><p className="text-2xl font-bold text-green-400">{score}</p></div>
      </div>
      {!gameOver && currentWord && (
        <div className={`text-center py-4 px-8 rounded-2xl transition-all ${flash === 'correct' ? 'bg-green-500/30' : 'bg-white/5'}`}>
          <p className="text-3xl font-black text-white uppercase tracking-wider">{currentWord}</p>
        </div>
      )}
      {!gameOver && (
        <input ref={inputRef} type="text" value={input} onChange={handleInput} placeholder="Type the word..." className="w-full max-w-xs py-4 px-4 rounded-xl bg-white/10 text-white text-center font-bold text-xl focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
      )}
      {gameOver && !pendingReward && <p className="text-green-400 font-bold">Completed!</p>}
      {pendingReward !== null && <RewardPopup reward={pendingReward} score={`${score}/${words.length} correct`} gameIcon="⌨️" onClaim={() => { claimReward(); }} />}
    </div>
  );
}

// ── GameMath ───────────────────────────────────────────────────────────────────

function GameMath({ onRoundComplete }: { onRoundComplete?: () => void }) {
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+' as '+' | '-' | '×', answer: 0 });
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward(onRoundComplete);

  useEffect(() => { newProblem(); }, []);
  useEffect(() => {
    if (timeLeft > 0 && !gameOver) { const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000); return () => clearTimeout(t); }
    else if (timeLeft === 0 && !gameOver) { setGameOver(true); completeLevel(score); }
  }, [timeLeft, gameOver]);
  useEffect(() => { inputRef.current?.focus(); }, [problem]);

  function newProblem() {
    const ops: ('+' | '-' | '×')[] = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = 0, b = 0, answer = 0;
    if (op === '+') { a = Math.floor(Math.random() * 50) + 1; b = Math.floor(Math.random() * 50) + 1; answer = a + b; }
    else if (op === '-') { a = Math.floor(Math.random() * 50) + 10; b = Math.floor(Math.random() * a); answer = a - b; }
    else { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; answer = a * b; }
    setProblem({ a, b, op, answer });
    setInput('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (gameOver) return;
    const userAnswer = parseInt(input);
    if (isNaN(userAnswer)) return;
    if (userAnswer === problem.answer) { haptic('success'); setScore(s => s + 1); setFlash('correct'); setTimeout(() => { setFlash(null); newProblem(); }, 150); }
    else { haptic('error'); setFlash('wrong'); setTimeout(() => setFlash(null), 300); }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="flex justify-between w-full max-w-xs">
        <div className="text-center"><p className="text-gray-400 text-xs">Time</p><p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</p></div>
        <div className="text-center"><p className="text-gray-400 text-xs">Score</p><p className="text-2xl font-bold text-gold-400">{score}</p></div>
      </div>
      {!gameOver && (
        <>
          <div className={`text-center py-6 px-8 rounded-2xl transition-all ${flash === 'correct' ? 'bg-green-500/30' : flash === 'wrong' ? 'bg-red-500/30' : 'bg-white/5'}`}>
            <p className="text-4xl font-black text-white">{problem.a} {problem.op} {problem.b} = ?</p>
          </div>
          <form onSubmit={handleSubmit} className="w-full max-w-xs">
            <input ref={inputRef} type="number" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Your answer" className="w-full py-4 px-4 rounded-xl bg-white/10 text-white text-center font-bold text-2xl focus:outline-none focus:ring-2 focus:ring-purple-500" autoComplete="off" />
            <button type="submit" className="w-full mt-3 py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }}>Submit</button>
          </form>
        </>
      )}
      {pendingReward !== null && <RewardPopup reward={pendingReward} score={`${score} correct`} gameIcon="🔢" onClaim={() => { claimReward(); setScore(0); setTimeLeft(30); setGameOver(false); newProblem(); }} />}
    </div>
  );
}

// ── GameDrawing ─────────────────────────────────────────────────────────────────

const SHAPES = ['Circle', 'Square', 'Triangle', 'Star', 'Heart', 'Smiley'];

function GameDrawing({ onRoundComplete }: { onRoundComplete?: () => void }) {
  const [targetShape, setTargetShape] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward(onRoundComplete);

  useEffect(() => { newShape(); }, []);

  function newShape() {
    setTargetShape(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
    setGameOver(false);
    setHasDrawn(false);
    clearCanvas();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0a0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    setDrawing(true);
    setHasDrawn(true);
    draw(e);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.fillStyle = '#00c853';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function stopDraw() { setDrawing(false); }

  function handleSubmit() {
    haptic('success');
    setGameOver(true);
    completeLevel(targetShape);
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="text-center">
        <p className="text-gray-400 text-sm">Draw a:</p>
        <p className="text-3xl font-black text-gold-400">{targetShape}</p>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="rounded-2xl border-2 border-white/20 touch-none cursor-crosshair"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      {!gameOver && (
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={clearCanvas} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold">Clear</button>
          <button onClick={handleSubmit} disabled={!hasDrawn} className={`flex-1 py-3 rounded-xl font-bold text-white ${hasDrawn ? '' : 'opacity-50'}`} style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)' }}>Submit Drawing</button>
        </div>
      )}
      {pendingReward !== null && <RewardPopup reward={pendingReward} score={targetShape} gameIcon="✏️" onClaim={() => { claimReward(); newShape(); }} />}
    </div>
  );
}
