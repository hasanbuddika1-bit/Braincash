import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { PlayCircle, Gift, Zap, Clock, Tv } from 'lucide-react';

const AD_PROVIDERS = [
  { id: 'adgamer', name: 'AdGamer', logo: '🎮' },
  { id: 'monetag', name: 'Monetag', logo: '📊' },
  { id: 'gigapub', name: 'Gigapub', logo: '🚀' },
];

export function AdsView() {
  const { user, addPoints, haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [watching, setWatching] = useState(false);
  const [currentAd, setCurrentAd] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [lastReward, setLastReward] = useState<number | null>(null);

  const watchAd = async (provider: string, adType: 'rewarded' | 'interstitial') => {
    if (watching || !user) return;

    haptic('light');
    setWatching(true);
    setCurrentAd(provider);

    // Simulate ad watching (in production, integrate real ad SDK)
    const adDuration = adType === 'rewarded' ? 15 : 5;
    setCountdown(adDuration);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Wait for ad to complete
    setTimeout(async () => {
      try {
        // Calculate reward (4-8 points)
        const reward = Math.floor(Math.random() * 5) + 4;

        // Record ad view
        await supabase.from('ad_views').insert({
          user_id: user.id,
          ad_provider: provider,
          ad_type: adType,
          reward,
        });

        // Add points
        await addPoints(reward);
        setLastReward(reward);
        showSuccess(`+${reward} Points Earned!`, 'Ad reward added to your balance.');
        haptic('success');
      } catch (error) {
        console.error('Error recording ad view:', error);
        showError('Failed', 'Could not record ad. Please try again.');
        haptic('error');
      } finally {
        setWatching(false);
        setCurrentAd(null);
      }
    }, adDuration * 1000);
  };

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">📺</span>
          Watch & Earn
        </h1>
        <p className="text-purple-300 mt-2">Watch ads to earn 4-8 points instantly!</p>
      </div>

      {/* Stats Card */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-3xl">
            💰
          </div>
          <div>
            <p className="text-gray-400 text-sm">Your Earnings Today</p>
            <p className="text-2xl font-bold text-gold-400">{user?.points || 0} pts</p>
            <p className="text-gray-500 text-xs">~${((user?.points || 0) * 0.01).toFixed(2)} USDT</p>
          </div>
        </div>
      </div>

      {/* Last Reward Animation */}
      {lastReward && (
        <div className="glass-card p-4 mb-6 text-center animate-scale-in bg-gradient-to-r from-green-500/20 to-blue-500/20">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-green-400 font-bold text-xl">+{lastReward} Points Earned!</p>
          <button
            onClick={() => setLastReward(null)}
            className="text-gray-400 text-sm mt-2"
          >
            Close
          </button>
        </div>
      )}

      {/* Rewarded Video Ads */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="text-neon-gold" size={20} />
          <h2 className="text-white font-semibold">Rewarded Video Ads</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">Watch a short video to earn points instantly</p>

        <div className="grid grid-cols-1 gap-3">
          {AD_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => watchAd(provider.id, 'rewarded')}
              disabled={watching}
              className={`glass-card p-4 flex items-center gap-4 transition-all ${
                watching && currentAd === provider.id
                  ? 'bg-purple-600/30'
                  : watching
                  ? 'opacity-50'
                  : 'hover:border-gold-500/50'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-purple-700/50 flex items-center justify-center text-3xl">
                {provider.logo}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-bold">{provider.name}</h3>
                <p className="text-grey-400 text-sm">Watch Video</p>
              </div>
              <div className="text-right">
                {watching && currentAd === provider.id ? (
                  <div className="flex items-center gap-2">
                    <Clock className="text-gold-400 animate-pulse" size={20} />
                    <span className="text-gold-400 font-bold">{countdown}s</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PlayCircle className="text-neon-blue" size={28} />
                    <div>
                      <p className="text-gold-400 font-bold">+4-8</p>
                      <p className="text-gray-500 text-xs">pts</p>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Interstitial Ads */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="text-neon-blue" size={20} />
          <h2 className="text-white font-semibold">Quick Ads</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">Watch a short ad for instant points</p>

        <div className="grid grid-cols-3 gap-3">
          {AD_PROVIDERS.map((provider) => (
            <button
              key={`quick-${provider.id}`}
              onClick={() => watchAd(provider.id, 'interstitial')}
              disabled={watching}
              className={`glass-card p-4 flex flex-col items-center gap-2 transition-all ${
                watching ? 'opacity-50' : 'hover:border-blue-500/50'
              }`}
            >
              <div className="text-3xl">{provider.logo}</div>
              <p className="text-white text-sm font-semibold">{provider.name}</p>
              <p className="text-gold-400 text-xs font-bold">+4-8 pts</p>
            </button>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <span className="text-xl">💡</span>
          How it works
        </h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Watch a short video ad (5-15 seconds)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Earn 4-8 points per ad watched
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Watch as many ads as you want
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            100 points = $0.01 USDT
          </li>
        </ul>
      </div>

      {/* Watching Modal */}
      {watching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
          <div className="glass-card p-8 text-center max-w-sm w-[90%]">
            <div className="text-6xl mb-4 animate-pulse">📺</div>
            <h3 className="text-xl font-bold text-white mb-2">Watch Ad</h3>
            <p className="text-gray-400 mb-4">Please wait while the ad plays...</p>
            <div className="w-full h-4 rounded-full bg-white/10 overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                style={{ width: `${((15 - countdown) / 15) * 100}%` }}
              />
            </div>
            <p className="text-gold-400 font-bold text-2xl">{countdown}s</p>
          </div>
        </div>
      )}
    </div>
  );
}
