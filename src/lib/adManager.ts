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

// ── SDK Loaders ──────────────────────────────────────────────────────────

function loadScript(src: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
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

async function ensureAdsgram(blockId: string): Promise<void> {
  // Wait for SDK to be available (loaded via index.html script tag)
  let tries = 0;
  while (!window.Adsgram && tries < 50) {
    await new Promise(r => setTimeout(r, 100));
    tries++;
  }
  if (!window.Adsgram) {
    // Fallback: load dynamically
    await loadScript('https://sad.adsgram.ai/js/sad.min.js');
  }
  if (!adsgramController && window.Adsgram) {
    adsgramController = window.Adsgram.init({ blockId });
  }
}

async function ensureMonetag(zoneId: string): Promise<void> {
  // Wait for SDK to be available (loaded via index.html script tag)
  let tries = 0;
  while (!window[`show_${zoneId}`] && tries < 50) {
    await new Promise(r => setTimeout(r, 100));
    tries++;
  }
  if (!window[`show_${zoneId}`]) {
    // Fallback: load dynamically
    await loadScript('https://libtl.com/sdk.js', {
      'data-zone': zoneId,
      'data-sdk': `show_${zoneId}`,
    });
    // Wait for function to appear
    tries = 0;
    while (!window[`show_${zoneId}`] && tries < 30) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
  }
}

async function ensureGigapub(scriptId: string): Promise<void> {
  // Wait for SDK to be available (loaded via index.html script tag)
  let tries = 0;
  while (!window.showGiga && tries < 50) {
    await new Promise(r => setTimeout(r, 100));
    tries++;
  }
  if (!window.showGiga) {
    // Fallback: load dynamically
    await loadScript(`https://ad.gigapub.tech/script?id=${scriptId}`);
    tries = 0;
    while (!window.showGiga && tries < 30) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
  }
}

// ── Ad Show Functions ────────────────────────────────────────────────────

export async function showAdsgramAd(blockId: string): Promise<void> {
  await ensureAdsgram(blockId);
  if (!adsgramController) throw new Error('Adsgram SDK not initialized');
  await adsgramController.show();
}

export async function showMonetagAd(zoneId: string): Promise<void> {
  await ensureMonetag(zoneId);
  const fn = window[`show_${zoneId}`];
  if (!fn) throw new Error('Monetag SDK not initialized');
  await fn();
}

export async function showGigapubAd(scriptId: string): Promise<void> {
  await ensureGigapub(scriptId);
  if (!window.showGiga) throw new Error('Gigapub SDK not initialized');
  await window.showGiga();
}

// ── Record Ad View ──────────────────────────────────────────────────────

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
