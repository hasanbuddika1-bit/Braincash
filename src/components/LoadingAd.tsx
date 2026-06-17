import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Loader2, Gift } from 'lucide-react';

interface LoadingAdProps {
  onComplete: (earnedPoints: number) => void;
  duration?: number;
}

export function LoadingAd({ onComplete, duration = 5000 }: LoadingAdProps) {
  const { user, haptic } = useApp();
  const [progress, setProgress] = useState(0);
  const [reward, setReward] = useState(0);

  useEffect(() => {
    // Generate random reward
    const randomReward = Math.floor(Math.random() * 5) + 4;
    setReward(randomReward);

    // Animate progress
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min((elapsed / duration) * 100, 100);
      setProgress(percent);

      if (percent >= 100) {
        clearInterval(interval);
      }
    }, 50);

    // Complete after duration
    const timer = setTimeout(async () => {
      if (user) {
        try {
          await supabase.from('ad_views').insert({
            user_id: user.id,
            ad_provider: 'loading',
            ad_type: 'loading',
            reward: randomReward,
          });
        } catch {
          // Ignore errors
        }
      }
      haptic('success');
      onComplete(randomReward);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [duration, user, onComplete, haptic]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
      <div className="glass-card p-8 text-center max-w-sm w-[90%]">
        {/* Ad content */}
        <div className="mb-6">
          <div className="text-6xl animate-bounce-slow mb-4">📺</div>
          <p className="text-gray-400 text-sm">Loading ad...</p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #bf00ff, #00d4ff, #ffd700)',
            }}
          />
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-gray-400 text-sm">
            {Math.max(0, Math.ceil((duration * (100 - progress)) / 100000))}s remaining
          </span>
        </div>

        {/* Reward preview */}
        <div className="flex items-center justify-center gap-2">
          <Gift className="text-gold-400" size={20} />
          <span className="text-gold-400 font-bold">+{reward} pts</span>
        </div>
      </div>
    </div>
  );
}

// Loading Ad Overlay with sponsor
export function LoadingAdOverlay({
  sponsor = 'Sponsored',
  message = 'Thanks for supporting us!',
  onComplete
}: {
  sponsor?: string;
  message?: string;
  onComplete: () => void;
}) {
  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState(0);

  useEffect(() => {
    const randomReward = Math.floor(Math.random() * 5) + 4;
    setReward(randomReward);

    const timer = setTimeout(() => {
      setShowReward(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    onComplete();
  };

  if (showReward) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
        <div className="glass-card p-8 text-center max-w-sm w-[90%] animate-scale-in">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h3 className="text-xl font-bold text-white mb-2">You Earned!</h3>
          <p className="text-3xl font-bold text-gold-400 mb-4">+{reward} Points</p>
          <p className="text-gray-400 text-sm mb-6">{message}</p>
          <button onClick={handleContinue} className="btn-neon-gold w-full">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
      <div className="glass-card p-8 text-center max-w-sm w-[90%]">
        <div className="text-sm text-gray-500 mb-4">{sponsor}</div>

        {/* Ad content area */}
        <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center mb-6">
          <div className="text-center">
            <div className="text-5xl mb-3 animate-pulse">🎮</div>
            <p className="text-white font-semibold">Play & Earn Rewards!</p>
            <p className="text-gray-400 text-sm">Brain Cash</p>
          </div>
        </div>

        {/* Loading progress */}
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, #bf00ff, #00d4ff, #ffd700, #bf00ff)',
              backgroundSize: '300% 100%',
              animation: 'shimmer 1.5s linear infinite',
            }}
          />
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      </div>
    </div>
  );
}
