import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import {
  showAdsgramAd, showMonetagAd, showGigapubAd,
  getTodayAdCount, loadAdSettings, recordAdView,
  type AdNetwork, type AdNetworkConfig,
} from '../../lib/adManager';
import {
  Play, Clock, CheckCircle, Gift, Zap, TrendingUp, Award,
  Flame, ChevronRight, Lock, AlertCircle,
} from 'lucide-react';

const REWARD_BLOCK_ID = '35762';
const REWARD_AD_SECONDS = 30;
const NETWORK_AD_SECONDS = 15;

export function AdsView() {
  const { user, haptic, addPoints, setCurrentView } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [configs, setConfigs] = useState<Record<AdNetwork, AdNetworkConfig> | null>(null);
  const [adCounts, setAdCounts] = useState<Record<AdNetwork, number>>({
    adsgram: 0, monetag: 0, gigapub: 0,
  });
  const [watching, setWatching] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const [adType, setAdType] = useState<'reward' | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<AdNetwork | null>(null);
  const [totalEarnedToday, setTotalEarnedToday] = useState(0);
  const [adError, setAdError] = useState(false);

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
    } catch (err) {
      console.error('Error loading ad data:', err);
    }
  }

  const watchRewardedAd = useCallback(async () => {
    if (!user || !configs || watching) return;
    haptic('light');

    const cfg = configs.adsgram;
    if (adCounts.adsgram >= cfg.dailyLimit) {
      showError('Daily Limit', `You've reached the daily limit of ${cfg.dailyLimit} Adsgram ads.`);
      return;
    }

    setWatching(true);
    setAdType('reward');
    setCurrentNetwork('adsgram');
    setAdError(false);
    setAdTimer(REWARD_AD_SECONDS);

    let adClosedEarly = false;
    let adCompleted = false;

    // Start countdown immediately when ad opens
    const timerPromise = new Promise<void>((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = REWARD_AD_SECONDS - elapsed;
        if (remaining <= 0) {
          clearInterval(interval);
          setAdTimer(0);
          resolve();
        } else {
          setAdTimer(remaining);
        }
      }, 1000);
    });

    // Show ad concurrently — promise resolves when ad is closed
    const adPromise = showAdsgramAd(REWARD_BLOCK_ID)
      .then((result) => {
        adCompleted = result?.completed === true;
        // If timer hasn't finished yet, ad was closed early
        if (adTimer > 0) {
          adClosedEarly = true;
        }
      })
      .catch(() => {
        adClosedEarly = true;
      });

    // Wait for both: timer finishes AND ad closes
    await Promise.race([timerPromise, adPromise]);

    // If timer finished first, wait for ad to close
    if (!adClosedEarly && adTimer <= 0) {
      await adPromise;
    }

    // Determine outcome
    if (adClosedEarly || !adCompleted) {
      setAdError(true);
      haptic('error');
      setTimeout(() => {
        setWatching(false);
        setAdType(null);
        setCurrentNetwork(null);
        setAdError(false);
      }, 2500);
      return;
    }

    // Success — give reward
    const reward = cfg.pointsPerAd;
    recordAdView(user.id, 'adsgram', reward, 'rewarded');
    addPoints(reward);
    setAdCounts(prev => ({ ...prev, adsgram: prev.adsgram + 1 }));
    setTotalEarnedToday(prev => prev + reward);
    showSuccess(`+${reward} Points!`, 'Rewarded ad completed!');
    haptic('success');
    setWatching(false);
    setAdType(null);
    setCurrentNetwork(null);
  }, [user, configs, watching, adCounts, haptic, addPoints, showSuccess, showError]);

  const watchNetworkAd = useCallback(async (network: AdNetwork) => {
    if (!user || !configs || watching) return;
    haptic('light');

    const cfg = configs[network];
    if (adCounts[network] >= cfg.dailyLimit) {
      showError('Daily Limit', `You've reached the daily limit of ${cfg.dailyLimit} ${cfg.name} ads.`);
      return;
    }

    setWatching(true);
    setAdType('reward');
    setCurrentNetwork(network);
    setAdError(false);
    setAdTimer(NETWORK_AD_SECONDS);

    let adClosedEarly = false;

    // Start countdown immediately
    const timerPromise = new Promise<void>((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = NETWORK_AD_SECONDS - elapsed;
        if (remaining <= 0) {
          clearInterval(interval);
          setAdTimer(0);
          resolve();
        } else {
          setAdTimer(remaining);
        }
      }, 1000);
    });

    // Show ad concurrently
    const adPromise = (async () => {
      try {
        if (network === 'adsgram') await showAdsgramAd(REWARD_BLOCK_ID);
        else if (network === 'monetag') await showMonetagAd('11230846');
        else await showGigapubAd('7151');
      } catch {
        adClosedEarly = true;
      }
    })();

    // Race: if ad closes before timer, it was early
    await Promise.race([timerPromise, adPromise]);

    // If timer finished first, wait for ad to close
    if (!adClosedEarly && adTimer <= 0) {
      await adPromise;
    }

    if (adClosedEarly) {
      setAdError(true);
      haptic('error');
      setTimeout(() => {
        setWatching(false);
        setAdType(null);
        setCurrentNetwork(null);
        setAdError(false);
      }, 2500);
      return;
    }

    // Success
    const reward = cfg.pointsPerAd;
    recordAdView(user.id, network, reward, 'rewarded');
    addPoints(reward);
    setAdCounts(prev => ({ ...prev, [network]: prev[network] + 1 }));
    setTotalEarnedToday(prev => prev + reward);
    showSuccess(`+${reward} Points!`, `${cfg.name} ad completed!`);
    haptic('success');
    setWatching(false);
    setAdType(null);
    setCurrentNetwork(null);
  }, [user, configs, watching, adCounts, haptic, addPoints, showSuccess, showError]);

  // Ad watching overlay
  if (watching && adType) {
    const seconds = currentNetwork === 'adsgram' && adType === 'reward' ? REWARD_AD_SECONDS : NETWORK_AD_SECONDS;
    const networkName = currentNetwork === 'adsgram' ? 'Adsgram AI' : currentNetwork === 'monetag' ? 'Monetag' : 'Gigapub';

    if (adError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4">
          <div className="w-full max-w-sm">
            <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(0,0,0,0.3))' }}>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-400" size={32} />
              </div>
              <p className="text-white font-bold text-lg mb-2">Ad Closed Too Early</p>
              <p className="text-gray-400 text-sm">You must watch the full ad to earn rewards. Please try again.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4">
        <div className="w-full max-w-sm">
          <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(0,200,83,0.2))' }}>
            <div className="text-5xl mb-4 animate-bounce-slow">
              {adType === 'reward' ? '🎁' : '📺'}
            </div>
            <p className="text-white font-bold text-lg mb-2">
              {adType === 'reward' ? 'Rewarded Ad' : 'Interstitial Ad'}
            </p>
            <p className="text-gray-400 text-sm mb-4">{networkName}</p>
            <div className="text-6xl font-black text-gold-400 font-['Orbitron']">{adTimer}s</div>
            <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${((seconds - adTimer) / seconds) * 100}%`,
                  background: 'linear-gradient(90deg, #00c853, #fbbf24)',
                }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-4">Please wait for the ad to finish...</p>
          </div>
        </div>
      </div>
    );
  }

  const networks: { id: AdNetwork; name: string; logo: string; blockId: string }[] = [
    { id: 'adsgram', name: 'Adsgram AI', logo: '🤖', blockId: REWARD_BLOCK_ID },
    { id: 'monetag', name: 'Monetag', logo: '📊', blockId: '11230846' },
    { id: 'gigapub', name: 'Gigapub', logo: '🚀', blockId: '7151' },
  ];

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">📺</span>
          Watch Ads
        </h1>
        <p className="text-purple-300 mt-2">Earn points by watching ads!</p>
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

      {/* Rewarded Ad Block (30s) */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden" style={{ border: '2px solid rgba(0,200,83,0.3)' }}>
        <div className="absolute top-0 right-0 text-6xl opacity-10">🎁</div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <Gift className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Rewarded Ad</h3>
              <p className="text-gray-400 text-sm flex items-center gap-1">
                <Clock size={12} /> {REWARD_AD_SECONDS}s watch time
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white/5">
            <span className="text-gray-400 text-sm">Reward: <span className="text-gold-400 font-bold">+{configs?.adsgram.pointsPerAd || 10} pts</span></span>
            <span className="text-gray-400 text-sm">Watched: <span className="text-white font-bold">{adCounts.adsgram}/{configs?.adsgram.dailyLimit || 10}</span></span>
          </div>
          <button
            onClick={watchRewardedAd}
            disabled={adCounts.adsgram >= (configs?.adsgram.dailyLimit || 10)}
            className={`btn-neon-gold w-full flex items-center justify-center gap-2 ${(adCounts.adsgram >= (configs?.adsgram.dailyLimit || 10)) ? 'opacity-50' : ''}`}
          >
            {adCounts.adsgram >= (configs?.adsgram.dailyLimit || 10) ? (
              <><Lock size={20} /> Daily Limit Reached</>
            ) : (
              <><Play size={20} /> Watch Rewarded Ad ({REWARD_AD_SECONDS}s)</>
            )}
          </button>
        </div>
      </div>

      {/* All Networks */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Zap className="text-purple-400" size={20} />
          All Ad Networks
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
                  <p className="text-gray-400 text-xs">+{cfg?.pointsPerAd || 5} pts per ad</p>
                  <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(count / limit) * 100}%`, background: 'linear-gradient(90deg, #00c853, #fbbf24)' }} />
                  </div>
                </div>
                {reached ? (
                  <span className="text-xs text-gray-500 font-semibold flex items-center gap-1"><CheckCircle size={14} /> Max</span>
                ) : (
                  <button
                    onClick={() => watchNetworkAd(n.id)}
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
              Watch ads to earn points. Rewarded ads give more points but have a daily limit.
              Points can be used to play games and withdraw as crypto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
