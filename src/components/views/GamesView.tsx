import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Trophy, HelpCircle, X, Star, Zap } from 'lucide-react';

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
        {/* Top glow bar */}
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

          {/* Reward display */}
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
            style={{
              background: 'linear-gradient(90deg, #00c853, #fbbf24)',
              color: '#080814',
              boxShadow: '0 0 20px rgba(0,200,83,0.5)',
            }}
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
  memory: {
    icon: '🧠',
    title: 'Memory Match',
    steps: [
      'Flip cards to reveal emojis',
      'Find matching pairs',
      'Match all pairs to win!',
      'Fewer moves = better score',
    ],
  },
  connect: {
    icon: '🔗',
    title: 'Tile Connect',
    steps: [
      'Tap a tile to select it',
      'Tap another tile with the same emoji',
      'Match all pairs to win!',
      'Connect them all quickly!',
    ],
  },
  color: {
    icon: '🎨',
    title: 'Color Match',
    steps: [
      'Read the color name shown',
      'Tap the matching color box',
      'Score as many as possible in 30s',
      'Wrong tap costs nothing!',
    ],
  },
  reaction: {
    icon: '⚡',
    title: 'Reaction Time',
    steps: [
      'Wait for the green circle',
      'Tap it as fast as possible!',
      '3 rounds to complete',
      'Fastest average time wins!',
    ],
  },
  wordguess: {
    icon: '🔤',
    title: 'Word Guess',
    steps: [
      'Guess the hidden 5-letter word',
      'Type a letter to guess',
      'Green = correct position',
      'Yellow = wrong position',
      '6 attempts allowed!',
    ],
  },
  numberguess: {
    icon: '#️⃣',
    title: 'Number Guess',
    steps: [
      'Guess the secret number 1-100',
      'You will get hints: Higher/Lower',
      'Keep guessing until you find it!',
      'Fewer guesses = better score!',
    ],
  },
  wordtype: {
    icon: '⌨️',
    title: 'Word Type',
    steps: [
      'A word appears on screen',
      'Type it correctly before time runs out!',
      'Faster typing = more points',
      'Complete all words to win!',
    ],
  },
};

function TutorialOverlay({ gameType, onClose }: { gameType: string; onClose: () => void }) {
  const tutorial = TUTORIALS[gameType];
  if (!tutorial) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 animate-fade-in">
      <div className="mx-4 w-full max-w-sm rounded-3xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0a0d1a 0%, #0d0a18 100%)',
        border: '1px solid rgba(124,58,237,0.4)',
      }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="text-4xl">{tutorial.icon}</div>
            <div>
              <h3 className="text-white font-black text-xl" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {tutorial.title}
              </h3>
              <p className="text-purple-300 text-sm">How to play</p>
            </div>
            <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {tutorial.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #00c853, #fbbf24)', color: '#080814' }}>
                  {i + 1}
                </div>
                <p className="text-white text-sm">{step}</p>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-white transition-all"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }}
          >
            Start Playing!
          </button>
        </div>
      </div>
    </div>
  );
}

// ── GamesView ───────────────────────────────────────────────────────────────

export function GamesView() {
  const { games, setCurrentView, setSelectedGame, haptic } = useApp();

  const handleGameClick = (game: typeof games[0]) => {
    haptic('light');
    setSelectedGame(game);
    setCurrentView('game');
  };

  const SUPPORTED_TYPES = ['memory', 'connect', 'color', 'reaction', 'wordguess', 'numberguess', 'wordtype'];
  const availableGames = games.filter(g => SUPPORTED_TYPES.includes(g.game_type));

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">🎮</span>
          Play & Earn
        </h1>
        <p className="text-green-400 mt-2">Play games to earn 4-8 points per level!</p>
      </div>

      {/* How to earn */}
      <div className="glass-card p-4 mb-6" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.1) 0%, rgba(124,58,237,0.1) 100%)', border: '1px solid rgba(0,200,83,0.2)' }}>
        <div className="flex items-center gap-3">
          <Trophy className="text-gold-400" size={24} />
          <div>
            <p className="text-white font-bold">Complete a level → Earn points</p>
            <p className="text-gray-400 text-sm">Tap <HelpCircle size={12} className="inline" /> on any game for instructions</p>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 gap-4">
        {availableGames.map((game) => (
          <div
            key={game.id}
            onClick={() => handleGameClick(game)}
            className="glass-card p-5 flex flex-col items-center gap-3 cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{ border: '1px solid rgba(0,200,83,0.2)' }}
          >
            <div className="text-5xl">{game.icon}</div>
            <h3 className="text-white font-bold text-center text-sm">{game.name}</h3>
            <p className="text-gray-400 text-xs text-center leading-relaxed">{game.description}</p>
            <div className="flex items-center gap-1 mt-1 px-3 py-1 rounded-full"
              style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <Zap className="text-gold-400" size={12} />
              <span className="text-gold-400 text-sm font-bold">{game.reward_range_min}-{game.reward_range_max} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── GamePlayView ─────────────────────────────────────────────────────────────

export function GamePlayView() {
  const { selectedGame, setCurrentView, haptic } = useApp();
  const [showTutorial, setShowTutorial] = useState(true);

  if (!selectedGame) {
    setCurrentView('games');
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #080814 0%, #0a0d1a 100%)' }}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => { haptic('light'); setCurrentView('games'); }}
          className="p-2 rounded-full bg-white/10 text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-3xl">{selectedGame.icon}</span>
          <div>
            <h2 className="text-white font-bold leading-none">{selectedGame.name}</h2>
            <p className="text-green-400 text-xs">+{selectedGame.reward_range_min}-{selectedGame.reward_range_max} pts per level</p>
          </div>
        </div>
        <button
          onClick={() => setShowTutorial(true)}
          className="p-2 rounded-full bg-white/10 text-gray-400"
        >
          <HelpCircle size={20} />
        </button>
      </div>

      {/* Game Area */}
      <div className="flex-1 overflow-auto">
        {selectedGame.game_type === 'memory'      && <GameMemory />}
        {selectedGame.game_type === 'connect'     && <GameTileConnect />}
        {selectedGame.game_type === 'color'       && <GameColorMatch />}
        {selectedGame.game_type === 'reaction'    && <GameReactionTime />}
        {selectedGame.game_type === 'wordguess'   && <GameWordGuess />}
        {selectedGame.game_type === 'numberguess' && <GameNumberGuess />}
        {selectedGame.game_type === 'wordtype'    && <GameWordType />}
      </div>

      {/* Tutorial overlay */}
      {showTutorial && (
        <TutorialOverlay gameType={selectedGame.game_type} onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}

// ── useGameReward hook ───────────────────────────────────────────────────────

function useGameReward() {
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
          game_id: user.id, // placeholder — real game_id would come from context
          score: typeof score === 'number' ? score : 0,
          reward,
        });
      } catch {}
    }

    setPendingScore(score);
    setPendingReward(reward);
    haptic('success');
  }, [user, haptic]);

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

function GameMemory() {
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const { setCurrentView, haptic } = useApp();
  const { completeLevel, claimReward, pendingReward, pendingScore } = useGameReward();

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
        <div className="text-center">
          <p className="text-gray-400 text-xs">Moves</p>
          <p className="text-2xl font-bold text-gold-400">{moves}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-xs">Matched</p>
          <p className="text-2xl font-bold text-green-400">{matched.length / 2}/{emojis.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 w-full max-w-xs">
        {cards.map((emoji, index) => (
          <button
            key={index}
            onClick={() => handleCardClick(index)}
            className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-200 ${
              flipped.includes(index) || matched.includes(index)
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 scale-95'
                : 'bg-white/10 hover:bg-white/15'
            } ${matched.includes(index) ? 'opacity-40' : ''}`}
          >
            {(flipped.includes(index) || matched.includes(index)) ? emoji : '?'}
          </button>
        ))}
      </div>

      <button onClick={initializeGame} className="text-gray-500 text-sm mt-2">
        Restart
      </button>

      {pendingReward !== null && (
        <RewardPopup reward={pendingReward} score={pendingScore} gameIcon="🧠" onClaim={() => { claimReward(); initializeGame(); }} />
      )}
    </div>
  );
}

// ── GameTileConnect ──────────────────────────────────────────────────────────

function GameTileConnect() {
  const [tiles, setTiles] = useState<{ id: number; emoji: string; matched: boolean }[]>([]);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward, pendingScore } = useGameReward();

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

    if (selectedTile === null) {
      setSelectedTile(id);
    } else if (selectedTile === id) {
      setSelectedTile(null);
    } else {
      if (tiles[selectedTile].emoji === tiles[id].emoji) {
        const newTiles = tiles.map((tile, index) =>
          index === selectedTile || index === id ? { ...tile, matched: true } : tile
        );
        setTiles(newTiles);
        setScore(s => s + 10);
        haptic('success');
        if (newTiles.every(t => t.matched)) {
          completeLevel(score + 10);
        }
      }
      setSelectedTile(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="text-center">
        <p className="text-gray-400 text-xs">Score</p>
        <p className="text-2xl font-bold text-gold-400">{score}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            onClick={() => handleTileClick(tile.id)}
            className={`w-16 h-16 rounded-xl text-3xl flex items-center justify-center transition-all ${
              tile.matched ? 'opacity-25 bg-green-500/20' :
              selectedTile === tile.id ? 'bg-gradient-to-br from-purple-500 to-blue-500 scale-110' :
              'bg-white/10 hover:bg-white/15 active:scale-95'
            }`}
          >
            {tile.emoji}
          </button>
        ))}
      </div>

      {pendingReward !== null && (
        <RewardPopup reward={pendingReward} score={pendingScore} gameIcon="🔗" onClaim={() => { claimReward(); initializeGame(); }} />
      )}
    </div>
  );
}

// ── GameColorMatch ───────────────────────────────────────────────────────────

function GameColorMatch() {
  const colors = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Pink', hex: '#ec4899' },
  ];

  const [targetColor, setTargetColor] = useState(colors[0]);
  const [options, setOptions] = useState<typeof colors>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward();

  useEffect(() => { newRound(); }, []);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
      return () => clearTimeout(t);
    } else if (timeLeft === 0 && !gameOver) {
      setGameOver(true);
      completeLevel(score);
    }
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
    if (color.hex === targetColor.hex) {
      haptic('success');
      setScore(s => s + 1);
      setFlash('correct');
      setTimeout(() => { setFlash(null); newRound(); }, 200);
    } else {
      haptic('error');
      setFlash('wrong');
      setTimeout(() => setFlash(null), 300);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="flex justify-between w-full max-w-xs">
        <div className="text-center">
          <p className="text-gray-400 text-xs">Time</p>
          <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-xs">Score</p>
          <p className="text-2xl font-bold text-gold-400">{score}</p>
        </div>
      </div>

      {!gameOver && (
        <>
          <div className={`text-center py-4 px-8 rounded-2xl transition-all ${
            flash === 'correct' ? 'bg-green-500/30' : flash === 'wrong' ? 'bg-red-500/30' : 'bg-white/5'
          }`}>
            <p className="text-gray-400 text-sm mb-1">Find this color:</p>
            <p className="text-4xl font-black text-white">{targetColor.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            {options.map((color, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(color)}
                className="aspect-square rounded-2xl transition-all active:scale-95 hover:scale-105"
                style={{ backgroundColor: color.hex, boxShadow: `0 4px 20px ${color.hex}60` }}
              />
            ))}
          </div>
        </>
      )}

      {pendingReward !== null && (
        <RewardPopup reward={pendingReward} score={`${score} correct`} gameIcon="🎨"
          onClaim={() => { claimReward(); setScore(0); setTimeLeft(30); setGameOver(false); newRound(); }} />
      )}
    </div>
  );
}

// ── GameReactionTime ─────────────────────────────────────────────────────────

function GameReactionTime() {
  type Phase = 'waiting' | 'ready' | 'go' | 'done' | 'complete';
  const [phase, setPhase] = useState<Phase>('waiting');
  const [times, setTimes] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const [tooEarly, setTooEarly] = useState(false);
  const ROUNDS = 3;
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function startRound() {
    setPhase('ready');
    setTooEarly(false);
    const delay = 1500 + Math.random() * 2500;
    timerRef.current = setTimeout(() => {
      setPhase('go');
      setStartTime(Date.now());
    }, delay);
  }

  function handleTap() {
    if (phase === 'waiting') { startRound(); return; }
    if (phase === 'ready') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTooEarly(true);
      setPhase('waiting');
      haptic('error');
      return;
    }
    if (phase === 'go') {
      const elapsed = Date.now() - startTime;
      setLastTime(elapsed);
      const newTimes = [...times, elapsed];
      setTimes(newTimes);
      haptic('success');
      setPhase('done');
      if (newTimes.length >= ROUNDS) {
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        setTimeout(() => { setPhase('complete'); completeLevel(`${avg}ms avg`); }, 800);
      }
    }
  }

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-6" onClick={handleTap}>
      {/* Rounds progress */}
      <div className="flex gap-2">
        {Array.from({ length: ROUNDS }).map((_, i) => (
          <div key={i} className={`w-8 h-2 rounded-full ${i < times.length ? 'bg-green-400' : 'bg-white/20'}`} />
        ))}
      </div>

      {/* Main tap area */}
      <div className={`w-56 h-56 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none ${
        phase === 'go' ? 'scale-110' : 'scale-100'
      }`} style={{
        background: phase === 'go'
          ? 'radial-gradient(circle, #00c853, #16a34a)'
          : phase === 'ready'
          ? 'radial-gradient(circle, #ef4444 60%, #dc2626)'
          : 'radial-gradient(circle, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        boxShadow: phase === 'go' ? '0 0 60px rgba(0,200,83,0.6)' : phase === 'ready' ? '0 0 40px rgba(239,68,68,0.4)' : '0 0 20px rgba(255,255,255,0.1)',
        border: '2px solid rgba(255,255,255,0.1)',
      }}>
        {phase === 'waiting' && (
          <>
            <p className="text-white text-xl font-bold">⚡</p>
            <p className="text-white font-bold mt-2">{times.length === 0 ? 'Tap to Start' : 'Next Round'}</p>
          </>
        )}
        {phase === 'ready' && (
          <p className="text-white text-xl font-black">Wait...</p>
        )}
        {phase === 'go' && (
          <p className="text-white text-2xl font-black">TAP NOW!</p>
        )}
        {phase === 'done' && (
          <>
            <p className="text-gold-400 text-3xl font-black">{lastTime}ms</p>
            <p className="text-white text-sm mt-1">Tap to continue</p>
          </>
        )}
      </div>

      {tooEarly && (
        <p className="text-red-400 font-bold animate-bounce-slow">Too early! Try again</p>
      )}

      {times.length > 0 && phase !== 'go' && (
        <div className="text-center">
          <p className="text-gray-400 text-sm">Round {times.length}/{ROUNDS}</p>
          {times.length > 1 && <p className="text-white">Avg: <span className="text-gold-400 font-bold">{avg}ms</span></p>}
        </div>
      )}

      {pendingReward !== null && (
        <RewardPopup reward={pendingReward} score={`${avg}ms avg`} gameIcon="⚡"
          onClaim={() => { claimReward(); setTimes([]); setPhase('waiting'); }} />
      )}
    </div>
  );
}

// ── GameWordGuess ─────────────────────────────────────────────────────────────

const WORD_LIST = [
  'BRAIN', 'MONEY', 'GAMES', 'POINT', 'EARNS', 'COINS', 'SMART', 'BONUS',
  'PRIZE', 'TOKEN', 'SPEED', 'QUICK', 'LUCKY', 'POWER', 'LIGHT', 'TRACK',
  'SCORE', 'QUEST', 'FLASH', 'GLOBE',
];

function GameWordGuess() {
  const [target] = useState(() => WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const MAX_GUESSES = 6;
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward();

  const keyboard = [
    'QWERTYUIOP'.split(''),
    'ASDFGHJKL'.split(''),
    ['⌫', ...'ZXCVBNM'.split(''), '↵'],
  ];

  function getLetterState(letter: string, position: number, word: string): 'correct' | 'present' | 'absent' | 'none' {
    if (word[position] === letter) return 'correct';
    if (word.includes(letter)) return 'present';
    return 'absent';
  }

  function handleKey(key: string) {
    if (gameOver) return;
    if (key === '⌫') {
      setCurrent(c => c.slice(0, -1));
    } else if (key === '↵') {
      if (current.length !== 5) return;
      const newGuesses = [...guesses, current];
      setGuesses(newGuesses);
      haptic('light');

      if (current === target) {
        setWon(true);
        setGameOver(true);
        completeLevel(`${newGuesses.length}/${MAX_GUESSES}`);
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameOver(true);
        completeLevel(`0/${MAX_GUESSES}`);
      }
      setCurrent('');
    } else if (current.length < 5) {
      setCurrent(c => c + key);
    }
  }

  const usedLetters: Record<string, 'correct' | 'present' | 'absent'> = {};
  guesses.forEach(guess => {
    guess.split('').forEach((letter, i) => {
      const state = getLetterState(letter, i, target);
      if (!usedLetters[letter] || state === 'correct') {
        usedLetters[letter] = state;
      }
    });
  });

  return (
    <div className="flex flex-col items-center p-3 gap-3 h-full">
      {/* Guess grid */}
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
                  }`}>
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {gameOver && !pendingReward && (
        <p className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
          {won ? 'Correct!' : `Answer: ${target}`}
        </p>
      )}

      {/* Keyboard */}
      <div className="space-y-1.5 w-full max-w-xs">
        {keyboard.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-1">
            {row.map((key) => {
              const state = usedLetters[key];
              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className={`h-10 rounded-lg font-bold text-xs flex items-center justify-center transition-all active:scale-95 ${
                    key === '⌫' || key === '↵' ? 'px-2 text-sm' : 'w-8'
                  } ${
                    state === 'correct' ? 'bg-green-600 text-white' :
                    state === 'present' ? 'bg-yellow-600 text-white' :
                    state === 'absent' ? 'bg-gray-700 text-gray-400' :
                    'bg-white/15 text-white'
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {pendingReward !== null && (
        <RewardPopup reward={pendingReward} score={won ? `Found in ${guesses.length} tries` : 'Better luck next time!'} gameIcon="🔤"
          onClaim={() => { claimReward(); }} />
      )}
    </div>
  );
}

// ── GameNumberGuess ─────────────────────────────────────────────────────────────

function GameNumberGuess() {
  const [target] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState('');
  const [guesses, setGuesses] = useState<number[]>([]);
  const [hint, setHint] = useState<'higher' | 'lower' | 'correct' | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward();

  function handleGuess() {
    const num = parseInt(guess);
    if (isNaN(num) || num < 1 || num > 100) return;

    haptic('light');
    const newGuesses = [...guesses, num];
    setGuesses(newGuesses);

    if (num === target) {
      setHint('correct');
      setGameOver(true);
      haptic('success');
      completeLevel(`${newGuesses.length} guesses`);
    } else if (num < target) {
      setHint('higher');
    } else {
      setHint('lower');
    }

    setGuess('');
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      <div className="text-center">
        <p className="text-gray-400 text-sm">Guess the number</p>
        <p className="text-white text-xl font-bold">1 - 100</p>
      </div>

      {/* Previous guesses */}
      <div className="flex flex-wrap gap-2 justify-center max-w-xs">
        {guesses.map((g, i) => (
          <span key={i} className={`px-3 py-1 rounded-full text-sm font-bold ${
            g === target ? 'bg-green-500/30 text-green-400' :
            g < target ? 'bg-blue-500/30 text-blue-400' :
            'bg-orange-500/30 text-orange-400'
          }`}>
            {g}
          </span>
        ))}
      </div>

      {/* Hint */}
      {hint && !gameOver && (
        <div className={`text-center py-3 px-6 rounded-xl ${
          hint === 'higher' ? 'bg-blue-500/20' : 'bg-orange-500/20'
        }`}>
          <p className={`text-xl font-bold ${hint === 'higher' ? 'text-blue-400' : 'text-orange-400'}`}>
            {hint === 'higher' ? '⬆️ Go Higher!' : '⬇️ Go Lower!'}
          </p>
        </div>
      )}

      {/* Input */}
      {!gameOver && (
        <div className="flex gap-2 w-full max-w-xs">
          <input
            type="number"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
            placeholder="Your guess"
            min="1"
            max="100"
            className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white text-center font-bold text-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleGuess}
            className="px-6 py-3 rounded-xl font-bold text-white"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }}
          >
            Guess
          </button>
        </div>
      )}

      <div className="text-center">
        <p className="text-gray-400 text-sm">Attempts: {guesses.length}</p>
      </div>

      {pendingReward !== null && (
        <RewardPopup reward={pendingReward} score={`${guesses.length} guesses`} gameIcon="#️⃣"
          onClaim={() => { claimReward(); }} />
      )}
    </div>
  );
}

// ── GameWordType ────────────────────────────────────────────────────────────────

const TYPE_WORDS = [
  'brain', 'cash', 'money', 'games', 'points', 'earn', 'play', 'bonus',
  'prize', 'fast', 'quick', 'type', 'word', 'game', 'win', 'score',
  'reward', 'token', 'speed', 'power', 'light', 'smart', 'level', 'quest',
];

function GameWordType() {
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { haptic } = useApp();
  const { completeLevel, claimReward, pendingReward } = useGameReward();

  useEffect(() => {
    const shuffled = [...TYPE_WORDS].sort(() => Math.random() - 0.5).slice(0, 10);
    setWords(shuffled);
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
      return () => clearTimeout(t);
    } else if (timeLeft === 0 && !gameOver) {
      setGameOver(true);
      completeLevel(`${score}/${words.length}`);
    }
  }, [timeLeft, gameOver]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentWordIndex]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toLowerCase();
    setInput(value);

    if (words[currentWordIndex] && value === words[currentWordIndex].toLowerCase()) {
      haptic('success');
      setScore(s => s + 1);
      setFlash('correct');
      setTimeout(() => {
        setFlash(null);
        setInput('');
        if (currentWordIndex < words.length - 1) {
          setCurrentWordIndex(i => i + 1);
        } else {
          setGameOver(true);
          completeLevel(`${score + 1}/${words.length}`);
        }
      }, 200);
    }
  }

  const currentWord = words[currentWordIndex] || '';

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full gap-4">
      {/* Stats */}
      <div className="flex justify-between w-full max-w-xs">
        <div className="text-center">
          <p className="text-gray-400 text-xs">Time</p>
          <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-xs">Word</p>
          <p className="text-2xl font-bold text-gold-400">{currentWordIndex + 1}/{words.length || 10}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-xs">Score</p>
          <p className="text-2xl font-bold text-green-400">{score}</p>
        </div>
      </div>

      {/* Word display */}
      {!gameOver && currentWord && (
        <div className={`text-center py-4 px-8 rounded-2xl transition-all ${
          flash === 'correct' ? 'bg-green-500/30' : 'bg-white/5'
        }`}>
          <p className="text-3xl font-black text-white uppercase tracking-wider">{currentWord}</p>
        </div>
      )}

      {/* Input */}
      {!gameOver && (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          placeholder="Type the word..."
          className="w-full max-w-xs py-4 px-4 rounded-xl bg-white/10 text-white text-center font-bold text-xl focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      )}

      {gameOver && !pendingReward && (
        <p className="text-green-400 font-bold">Completed!</p>
      )}

      {pendingReward !== null && (
        <RewardPopup reward={pendingReward} score={`${score}/${words.length} correct`} gameIcon="⌨️"
          onClaim={() => { claimReward(); }} />
      )}
    </div>
  );
}
