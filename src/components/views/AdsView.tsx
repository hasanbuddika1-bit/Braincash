import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import {
  showAdFromNetwork, getTodayAdCount, loadAdSettings, recordAdView,
  type AdNetwork, type AdNetworkConfig, type AdShowResult,
} from '../../lib/adManager';
import {
  Play, Clock, CheckCircle, Gift, Zap, TrendingUp, Award,
  Flame, ChevronRight, Lock, AlertCircle, Shield, Tv,
} from 'lucide-react';

const REWARD_BLOCK_ID = '35762';
const MIN_WATCH_SECONDS = 10;

export function AdsView() {
  const { user, haptic, addPoints } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [configs, setConfigs] = useState<Record<AdNetwork, AdNetworkConfig> | null>(null);
  const [adCounts, setAdCounts] = useState<Record<AdNetwork, number>>({
    adsgram: 0, monetag: 0, gigapub: 0,
  });
  const [watching, setWatching] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const [adError, setAdError] = useState(false);
  const [adErrorMsg, setAdErrorMsg] = useState('');
  const [showVpnPopup, setShowVpnPopup] = useState(false);
  const [totalEarnedToday, setTotalEarnedToday] = useState(0);
  const [currentNetwork, setCurrentNetwork] = useState<AdNetwork | null>(null);
  const [adStreak, setAdStreak] = useState(0);
  const [streakBonus, setStreakBonus] = useState(0);
  const [totalAdsWatched, setTotalAdsWatched] = useState(0);

  useEffect(() => {
    if (user) loadData();
  }, [user?.id]);

  async function loadData() {
    if (!user) return;
    try {
      const cfgs = await loadAdSettings();
      setConfigs(cfgs);
      const [adsgramCount, monetagCount, gigapubCount] = await Promise.all([
        getTodayAdCount(user.id, 'adsgram'),
        getTodayAdCount(user.id, 'monetag'),
        getTodayAdCount(user.id, 'gigapub'),
      ]);
      setAdCounts({
        adsgram: adsgramCount,
        monetag: monetagCount,
        gigapub: gigapubCount,
      });
      const total = adsgramCount * (cfgs.adsgram.pointsPerAd || 10) +
        monetagCount * (cfgs.monetag.pointsPerAd || 5) +
        gigapubCount * (cfgs.gigapub.pointsPerAd || 5);
      setTotalEarnedToday(total);

      // Load ad streak
      const totalAds = adsgramCount + monetagCount + gigapubCount;
      setTotalAdsWatched(totalAds);
      // Streak bonus: +1 pt per 5 ads watched today (compounding)
      const streak = Math.floor(totalAds / 5);
      setAdStreak(streak);
      setStreakBonus(streak * 2);
    } catch (err) {
      console.error('Error loading ad data:', err);
    }
  }

  const watchAd = useCallback(async (network: AdNetwork) => {
    if (!user || !configs || watching) return;
    haptic('light');

    const cfg = configs[network];
    if (adCounts[network] >= cfg.dailyLimit) {
      showError('Daily Limit', `You've reached the daily limit of ${cfg.dailyLimit} ${cfg.name} ads.`);
      return;
    }

    setWatching(true);
    setAdError(false);
    setAdErrorMsg('');
    setCurrentNetwork(network);

    // Show the ad first - no timer until we know the ad opened
    let adResult: AdShowResult;
    try {
      adResult = await showAdFromNetwork(network);
    } catch {
      adResult = { watchedSeconds: 0, completed: false, opened: false, error: 'Ad failed to show' };
    }

    // If ad didn't open at all (SDK not available) — show VPN popup for Adsgram, error for others
    if (!adResult.opened) {
      setWatching(false);
      setCurrentNetwork(null);
      if (network === 'adsgram') {
        setShowVpnPopup(true);
        haptic('warning');
      } else {
        setAdError(true);
        setAdErrorMsg(`${cfg.name} ads are not available right now. Please try again later.`);
        haptic('error');
        setTimeout(() => {
          setAdError(false);
          setAdErrorMsg('');
        }, 3000);
      }
      return;
    }

    // Ad opened successfully — start the countdown timer
    setAdTimer(MIN_WATCH_SECONDS);
    let timerFinished = false;
    const timerPromise = new Promise<void>((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = MIN_WATCH_SECONDS - elapsed;
        if (remaining <= 0) {
          clearInterval(interval);
          timerFinished = true;
          setAdTimer(0);
          resolve();
        } else {
          setAdTimer(remaining);
        }
      }, 1000);
    });

    // Wait for timer to finish
    await timerPromise;

    // Check if ad was completed and watched for minimum seconds
    if (!adResult.completed || adResult.watchedSeconds < MIN_WATCH_SECONDS) {
      setAdError(true);
      setAdErrorMsg('You must watch the full ad (10 seconds) to earn rewards. Please try again.');
      haptic('error');
      setTimeout(() => {
        setWatching(false);
        setCurrentNetwork(null);
        setAdError(false);
        setAdErrorMsg('');
      }, 3000);
      return;
    }

    // Success — give reward
    const reward = cfg.pointsPerAd;
    await recordAdView(user.id, network, reward, 'rewarded');
    await addPoints(reward);
    setAdCounts(prev => ({ ...prev, [network]: prev[network] + 1 }));
    setTotalEarnedToday(prev => prev + reward);
    // Check for streak bonus (every 5 ads)
    const newTotal = totalAdsWatched + 1;
    if (newTotal % 5 === 0) {
      const bonus = (newTotal / 5) * 2;
      await addPoints(bonus);
      showSuccess(`+${reward + bonus} Points!`, `${cfg.name} ad + ${bonus} streak bonus!`);
      setStreakBonus(prev => prev + bonus);
    } else {
      showSuccess(`+${reward} Points!`, `${cfg.name} ad completed!`);
    }
    setTotalAdsWatched(newTotal);
    setAdStreak(Math.floor(newTotal / 5));
    haptic('success');
    setWatching(false);
    setCurrentNetwork(null);
  }, [user, configs, watching, adCounts, haptic, addPoints, showSuccess, showError]);

  // VPN popup when Adsgram unavailable
  if (showVpnPopup) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4">
        <div className="w-full max-w-sm">
          <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(0,0,0,0.3))' }}>
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="text-blue-400" size={32} />
            </div>
            <p className="text-white font-bold text-lg mb-2">Adsgram AI Not Available</p>
            <p className="text-gray-400 text-sm mb-6">
              Adsgram AI ads are not available in your region. Please use a VPN to watch rewarded ads and earn more points.
            </p>
            <button
              onClick={() => {
                haptic('light');
                setShowVpnPopup(false);
              }}
              className="btn-neon-gold w-full mb-3"
            >
              Got it
            </button>
            <button
              onClick={() => {
                haptic('light');
                setShowVpnPopup(false);
                // Try Monetag or Gigapub instead
                watchAd('monetag');
              }}
              className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold"
            >
              Try Other Ad Network
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ad watching overlay
  if (watching) {
    const networkName = currentNetwork === 'adsgram' ? 'Adsgram AI' : currentNetwork === 'monetag' ? 'Monetag' : 'Gigapub';
    const networkLogo = currentNetwork === 'adsgram' ? '🤖' : currentNetwork === 'monetag' ? '📊' : '🚀';

    if (adError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4">
          <div className="w-full max-w-sm">
            <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(0,0,0,0.3))' }}>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-400" size={32} />
              </div>
              <p className="text-white font-bold text-lg mb-2">Ad Not Completed</p>
              <p className="text-gray-400 text-sm">{adErrorMsg || 'You must watch the full ad to earn rewards. Please try again.'}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4">
        <div className="w-full max-w-sm">
          <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(0,200,83,0.2))' }}>
            <div className="text-5xl mb-4 animate-bounce-slow">{networkLogo}</div>
            <p className="text-white font-bold text-lg mb-2">{networkName}</p>
            <p className="text-gray-400 text-sm mb-4">Watching ad...</p>
            <div className="text-6xl font-black text-gold-400 font-['Orbitron']">{adTimer}s</div>
            <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${((MIN_WATCH_SECONDS - adTimer) / MIN_WATCH_SECONDS) * 100}%`,
                  background: 'linear-gradient(90deg, #00c853, #fbbf24)',
                }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-4">Please watch the full {MIN_WATCH_SECONDS} seconds to earn rewards.</p>
          </div>
        </div>
      </div>
    );
  }

  const networks: { id: AdNetwork; name: string; logo: string }[] = [
    { id: 'adsgram', name: 'Adsgram AI', logo: '🤖' },
    { id: 'monetag', name: 'Monetag', logo: '📊' },
    { id: 'gigapub', name: 'Gigapub', logo: '🚀' },
  ];

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">📺</span>
          Watch Ads
        </h1>
        <p className="text-purple-300 mt-2">Earn points by watching ads! ({MIN_WATCH_SECONDS}s minimum)</p>
      </div>

      {/* Today's Earnings */}
      <div className="glass-card p-4 mb-6 relative overflow-hidden bg-gradient-to-br from-green-900/30 to-purple-900/30">
        <div className="absolute top-0 right-0 text-7xl opacity-10">💰</div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-400" size={20} />
            <p className="text-white font-semibold">Today's Earnings</p>
          </div>
          <p className="text-3xl font-black text-gold-400 font-['Orbitron']">+{totalEarnedToday} pts</p>
        </div>
      </div>

      {/* Ad Streak Bonus */}
      <div className="glass-card p-4 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(0,200,83,0.1))' }}>
        <div className="flex items-center gap-3 mb-3">
          <Flame className="text-orange-400" size={24} />
          <div>
            <p className="text-white font-bold">Ad Streak Bonus</p>
            <p className="text-gray-400 text-sm">Every 5 ads = +2 bonus pts!</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const mod = totalAdsWatched % 5;
            const filled = totalAdsWatched > 0 && i < mod;
            const current = totalAdsWatched > 0 && i === mod;
            const cls = filled
              ? 'flex-1 h-3 rounded-full transition-all bg-gradient-to-r from-orange-500 to-yellow-500'
              : current
              ? 'flex-1 h-3 rounded-full transition-all bg-yellow-500/50 animate-pulse'
              : 'flex-1 h-3 rounded-full transition-all bg-white/10';
            return <div key={i} className={cls} />;
          })}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">Total today: {totalAdsWatched} ads</span>
          <span className="text-yellow-400 font-bold text-sm">+{streakBonus} bonus earned</span>
        </div>
      </div>

      {/* Quick Watch - Random Network */}
      <button
        onClick={() => {
          haptic('light');
          const networks: AdNetwork[] = ['adsgram', 'monetag', 'gigapub'];
          const available = networks.filter(n => (adCounts[n] || 0) < (configs?.[n]?.dailyLimit || 10));
          if (available.length === 0) {
            showError('Daily Limit', 'You have reached all daily ad limits!');
            return;
          }
          const random = available[Math.floor(Math.random() * available.length)];
          watchAd(random);
        }}
        disabled={watching}
        className="w-full mb-6 py-4 rounded-xl bg-gradient-to-r from-green-600 via-yellow-500 to-orange-500 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform"
      >
        <Zap size={24} />
        Quick Watch (Random)
      </button>

      {/* All Networks */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Zap className="text-purple-400" size={20} />
          Ad Networks
        </h3>
        <div className="space-y-3">
          {networks.map(n => {
            const cfg = configs?.[n.id];
            const count = adCounts[n.id];
            const limit = cfg?.dailyLimit || 10;
            const reached = count >= limit;
            return (
              <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="text-3xl">{n.logo}</div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{n.name}</p>
                  <p className="text-gray-400 text-xs">+{cfg?.pointsPerAd || 5} pts per ad • {MIN_WATCH_SECONDS}s watch</p>
                  <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(count / limit) * 100}%`, background: 'linear-gradient(90deg, #00c853, #fbbf24)' }} />
                  </div>
                </div>
                {reached ? (
                  <span className="text-xs text-gray-500 font-semibold flex items-center gap-1"><CheckCircle size={14} /> Max</span>
                ) : (
                  <button
                    onClick={() => watchAd(n.id)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold flex items-center gap-1"
                  >
                    <Play size={14} /> Watch
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card p-4">
        <div className="flex items-start gap-3">
          <Award className="text-gold-400 flex-shrink-0 mt-1" size={20} />
          <div>
            <p className="text-white font-semibold text-sm mb-1">How it works</p>
            <p className="text-gray-400 text-xs">
              Watch ads for at least {MIN_WATCH_SECONDS} seconds to earn points. If you close the ad early, no reward will be given.
              Points can be used to play games and withdraw as USDT.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
