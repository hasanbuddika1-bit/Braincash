import { supabase } from './supabase';

export type AdNetwork = 'adsgram' | 'monetag' | 'gigapub';

export interface AdNetworkConfig {
  network: AdNetwork;
  name: string;
  logo: string;
  dailyLimit: number;
  pointsPerAd: number;
  cooldownSeconds: number;
  enabled: boolean;
}

export interface AdViewResult {
  success: boolean;
  reward?: number;
  error?: string;
  network: AdNetwork;
}

let adsgramLoaded = false;
let monetagLoaded = false;
let gigapubLoaded = false;

declare global {
  interface Window {
    show_11230846?: (options?: { type?: string }) => Promise<void>;
    showGiga?: () => Promise<void>;
    ADSGRAM?: unknown;
    adsgramQueue?: ((ad: { done: () => void; error: (e: string) => void }) => void)[];
  }
}

export async function loadAdSettings(): Promise<Record<AdNetwork, AdNetworkConfig>> {
  const { data } = await supabase.from('settings').select('key, value').in('key', [
    'adsgram_block_id', 'adsgram_daily_limit', 'adsgram_points_per_ad', 'adsgram_cooldown_seconds',
    'monetag_zone_id', 'monetag_daily_limit', 'monetag_points_per_ad', 'monetag_cooldown_seconds',
    'gigapub_script_id', 'gigapub_daily_limit', 'gigapub_points_per_ad', 'gigapub_cooldown_seconds',
  ]);

  const map: Record<string, string> = {};
  (data || []).forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });

  return {
    adsgram: {
      network: 'adsgram',
      name: 'Adsgram AI',
      logo: '🤖',
      dailyLimit: parseInt(map.adsgram_daily_limit || '10'),
      pointsPerAd: parseInt(map.adsgram_points_per_ad || '10'),
      cooldownSeconds: parseInt(map.adsgram_cooldown_seconds || '5'),
      enabled: true,
    },
    monetag: {
      network: 'monetag',
      name: 'Monetag',
      logo: '📊',
      dailyLimit: parseInt(map.monetag_daily_limit || '10'),
      pointsPerAd: parseInt(map.monetag_points_per_ad || '5'),
      cooldownSeconds: parseInt(map.monetag_cooldown_seconds || '5'),
      enabled: true,
    },
    gigapub: {
      network: 'gigapub',
      name: 'Gigapub',
      logo: '🚀',
      dailyLimit: parseInt(map.gigapub_daily_limit || '10'),
      pointsPerAd: parseInt(map.gigapub_points_per_ad || '5'),
      cooldownSeconds: parseInt(map.gigapub_cooldown_seconds || '5'),
      enabled: true,
    },
  };
}

export async function getTodayAdCount(userId: string, network: AdNetwork): Promise<number> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const { count } = await supabase
    .from('ad_views')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('ad_provider', network)
    .gte('viewed_at', startOfDay);
  return count || 0;
}

export async function canWatchAd(userId: string, network: AdNetwork, config: AdNetworkConfig): Promise<{ canWatch: boolean; reason?: string; watchedToday: number }> {
  const watchedToday = await getTodayAdCount(userId, network);
  if (watchedToday >= config.dailyLimit) {
    return { canWatch: false, reason: `Daily limit reached (${config.dailyLimit} ads/day)`, watchedToday };
  }
  return { canWatch: true, watchedToday };
}

function loadAdsgramScript(blockId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (adsgramLoaded) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://lib.adsgram.io/js/sdk/adsgram.js';
    s.async = true;
    s.onload = () => {
      adsgramLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load Adsgram SDK'));
    document.head.appendChild(s);
  });
}

function loadMonetagScript(zoneId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (monetagLoaded) { resolve(); return; }
    const s = document.createElement('script');
    s.src = '//libtl.com/sdk.js';
    s.async = true;
    s.setAttribute('data-zone', zoneId);
    s.setAttribute('data-sdk', `show_${zoneId}`);
    s.onload = () => {
      monetagLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load Monetag SDK'));
    document.head.appendChild(s);
  });
}

function loadGigapubScript(scriptId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gigapubLoaded) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://ad.gigapub.tech/script?id=${scriptId}`;
    s.async = true;
    s.onload = () => {
      gigapubLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load Gigapub SDK'));
    document.head.appendChild(s);
  });
}

export async function showAdsgramAd(blockId: string): Promise<void> {
  await loadAdsgramScript(blockId);
  const sdk = window.ADSGRAM;
  if (!sdk) throw new Error('Adsgram SDK not initialized');
  const ad = await sdk.init({ blockId });
  await ad.show();
}

export async function showMonetagAd(zoneId: string): Promise<void> {
  await loadMonetagScript(zoneId);
  const fn = (window as unknown as Record<string, unknown>)[`show_${zoneId}`] as ((opts?: { type?: string }) => Promise<void>) | undefined;
  if (!fn) throw new Error('Monetag SDK not initialized');
  await fn({ type: 'interstitial' });
}

export async function showGigapubAd(scriptId: string): Promise<void> {
  await loadGigapubScript(scriptId);
  if (!window.showGiga) throw new Error('Gigapub SDK not initialized');
  await window.showGiga();
}

export async function recordAdView(userId: string, network: AdNetwork, reward: number, adType: string = 'rewarded'): Promise<void> {
  await supabase.from('ad_views').insert({
    user_id: userId,
    ad_provider: network,
    ad_type: adType,
    reward,
  });
}

export function pickRandomNetwork(exclude?: AdNetwork): AdNetwork {
  const all: AdNetwork[] = ['adsgram', 'monetag', 'gigapub'];
  const pool = exclude ? all.filter(n => n !== exclude) : all;
  return pool[Math.floor(Math.random() * pool.length)];
}
