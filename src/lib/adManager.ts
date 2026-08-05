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

// SDK loaded flags
let adsgramLoaded = false;
let adsgramController: any = null;
let monetagLoaded = false;
let gigapubLoaded = false;

declare global {
  interface Window {
    Adsgram?: any;
    show_11230846?: (options?: { type?: string }) => Promise<void>;
    showGiga?: () => Promise<void>;
  }
}

let cachedAdsgramBlockId = '35762';

export function getAdsgramBlockId(): string {
  return cachedAdsgramBlockId;
}

export async function loadAdSettings(): Promise<Record<AdNetwork, AdNetworkConfig>> {
  const { data } = await supabase.from('settings').select('key, value').in('key', [
    'adsgram_block_id', 'adsgram_daily_limit', 'adsgram_points_per_ad', 'adsgram_cooldown_seconds',
    'monetag_zone_id', 'monetag_daily_limit', 'monetag_points_per_ad', 'monetag_cooldown_seconds',
    'gigapub_script_id', 'gigapub_daily_limit', 'gigapub_points_per_ad', 'gigapub_cooldown_seconds',
  ]);

  const map: Record<string, string> = {};
  (data || []).forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
  if (map.adsgram_block_id) cachedAdsgramBlockId = map.adsgram_block_id;

  return {
    adsgram: {
      network: 'adsgram',
      name: 'Adsgram AI',
      logo: '🤖',
      dailyLimit: parseInt(map.adsgram_daily_limit || '10'),
      pointsPerAd: parseInt(map.adsgram_points_per_ad || '5'),
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

// ── SDK Loaders ──────────────────────────────────────────────────────────

function loadScript(src: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load: ${src}`)));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = () => { s.setAttribute('data-loaded', 'true'); resolve(); };
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureAdsgram(blockId: string): Promise<boolean> {
  let tries = 0;
  while (!window.Adsgram && tries < 50) {
    await new Promise(r => setTimeout(r, 100));
    tries++;
  }
  if (!window.Adsgram) {
    try {
      await loadScript('https://sad.adsgram.ai/js/sad.min.js');
      let waitTries = 0;
      while (!window.Adsgram && waitTries < 30) {
        await new Promise(r => setTimeout(r, 100));
        waitTries++;
      }
    } catch {
      return false;
    }
  }
  if (!window.Adsgram) return false;
  if (!adsgramController) {
    try {
      adsgramController = window.Adsgram.init({ blockId });
    } catch {
      return false;
    }
  }
  return adsgramController != null;
}

async function ensureMonetag(zoneId: string): Promise<boolean> {
  let tries = 0;
  while (!window[`show_${zoneId}`] && tries < 50) {
    await new Promise(r => setTimeout(r, 100));
    tries++;
  }
  if (!window[`show_${zoneId}`]) {
    try {
      await loadScript('https://libtl.com/sdk.js', {
        'data-zone': zoneId,
        'data-sdk': `show_${zoneId}`,
      });
      tries = 0;
      while (!window[`show_${zoneId}`] && tries < 30) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }
    } catch {
      return false;
    }
  }
  return window[`show_${zoneId}`] != null;
}

async function ensureGigapub(scriptId: string): Promise<boolean> {
  let tries = 0;
  while (!window.showGiga && tries < 50) {
    await new Promise(r => setTimeout(r, 100));
    tries++;
  }
  if (!window.showGiga) {
    try {
      await loadScript(`https://ad.gigapub.tech/script?id=${scriptId}`);
      tries = 0;
      while (!window.showGiga && tries < 30) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }
    } catch {
      return false;
    }
  }
  return window.showGiga != null;
}

// ── Ad Show Functions ────────────────────────────────────────────────────
// Returns { completed: boolean, watchedSeconds: number, opened: boolean }
// If ad didn't open (SDK failure), opened = false and completed = false

export interface AdShowResult {
  watchedSeconds: number;
  completed: boolean;
  opened: boolean;
  error?: string;
}

export async function showAdsgramAd(blockId: string): Promise<AdShowResult> {
  const sdkReady = await ensureAdsgram(blockId);
  if (!sdkReady || !adsgramController) {
    return { watchedSeconds: 0, completed: false, opened: false, error: 'Adsgram SDK not available' };
  }

  const startTime = Date.now();
  let completed = false;
  let adError: string | null = null;

  await new Promise<void>((resolve) => {
    adsgramController.show().then((result: any) => {
      completed = result?.done === true;
      if (result?.error) adError = result?.description || 'Ad show failed';
      resolve();
    }).catch((result: any) => {
      adError = result?.description || result?.message || 'Ad show failed';
      resolve();
    });
    setTimeout(() => resolve(), 120000);
  });

  const watchedSeconds = Math.floor((Date.now() - startTime) / 1000);
  return { watchedSeconds, completed, opened: true, error: adError || undefined };
}

export async function showMonetagAd(zoneId: string): Promise<AdShowResult> {
  const sdkReady = await ensureMonetag(zoneId);
  const fn = window[`show_${zoneId}`];
  if (!sdkReady || !fn) {
    return { watchedSeconds: 0, completed: false, opened: false, error: 'Monetag SDK not available' };
  }

  const startTime = Date.now();
  let completed = false;
  let adError: string | null = null;

  await new Promise<void>((resolve) => {
    fn().then(() => {
      completed = true;
      resolve();
    }).catch((err: any) => {
      adError = err?.message || 'Ad show failed';
      resolve();
    });
    setTimeout(() => resolve(), 120000);
  });

  const watchedSeconds = Math.floor((Date.now() - startTime) / 1000);
  return { watchedSeconds, completed: completed && !adError, opened: true, error: adError || undefined };
}

export async function showGigapubAd(scriptId: string): Promise<AdShowResult> {
  const sdkReady = await ensureGigapub(scriptId);
  if (!sdkReady || !window.showGiga) {
    return { watchedSeconds: 0, completed: false, opened: false, error: 'Gigapub SDK not available' };
  }

  const startTime = Date.now();
  let completed = false;
  let adError: string | null = null;

  await new Promise<void>((resolve) => {
    window.showGiga().then(() => {
      completed = true;
      resolve();
    }).catch((err: any) => {
      adError = err?.message || 'Ad show failed';
      resolve();
    });
    setTimeout(() => resolve(), 120000);
  });

  const watchedSeconds = Math.floor((Date.now() - startTime) / 1000);
  return { watchedSeconds, completed: completed && !adError, opened: true, error: adError || undefined };
}

// ── Record Ad View ──────────────────────────────────────────────────────

export async function recordAdView(userId: string, network: AdNetwork, reward: number, adType: string = 'rewarded'): Promise<void> {
  await supabase.from('ad_views').insert({
    user_id: userId,
    ad_provider: network,
    ad_type: adType,
    reward,
  });
  // Also increment referred_ad_count for referral tracking
  try {
    await supabase.rpc('increment_referred_ad_count', { watcher_user_id: userId });
  } catch (e) { console.error('increment_referred_ad_count failed:', e); }
}

export function pickRandomNetwork(exclude?: AdNetwork): AdNetwork {
  const all: AdNetwork[] = ['adsgram', 'monetag', 'gigapub'];
  const pool = exclude ? all.filter(n => n !== exclude) : all;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Show a random ad from any of the 3 networks - returns result with opened flag
export async function showRandomAd(): Promise<{ network: AdNetwork; result: AdShowResult }> {
  const network = pickRandomNetwork();
  let result: AdShowResult;
  if (network === 'adsgram') {
    result = await showAdsgramAd(getAdsgramBlockId());
  } else if (network === 'monetag') {
    result = await showMonetagAd('11230846');
  } else {
    result = await showGigapubAd('7151');
  }
  return { network, result };
}

// Show ad from a specific network - returns AdShowResult
export async function showAdFromNetwork(network: AdNetwork): Promise<AdShowResult> {
  if (network === 'adsgram') return showAdsgramAd(getAdsgramBlockId());
  if (network === 'monetag') return showMonetagAd('11230846');
  return showGigapubAd('7151');
}

// Show a rewarded Adsgram ad
export async function showRewardedAd(): Promise<AdShowResult> {
  return showAdsgramAd(getAdsgramBlockId());
}

// Get the block ID for a network
export function getNetworkBlockId(network: AdNetwork): string {
  if (network === 'adsgram') return getAdsgramBlockId();
  if (network === 'monetag') return '11230846';
  return '7151';
}
