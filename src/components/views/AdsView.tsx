import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import {
  loadAdSettings, canWatchAd, recordAdView,
  showAdsgramAd, showMonetagAd, showGigapubAd,
  type AdNetworkConfig, type AdNetwork,
} from '../../lib/adManager';
import {
  PlayCircle, Gift, Clock, Tv, Target, CheckCircle, ChevronRight, Flame, X, AlertCircle, Zap,
} from 'lucide-react';

const INITIAL_TASKS_SHOWN = 4;
const COOLDOWN_KEY = 'brain_cash_ad_cooldowns';

interface CooldownState { [network: string]: number }

function getCooldowns(): CooldownState {
  try { return JSON.parse(localStorage.getItem(COOLDOWN_KEY) || '{}'); } catch { return {}; }
}
function setCooldown(network: string, seconds: number) {
  const c = getCooldowns();
  c[network] = Date.now() + seconds * 1000;
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify(c));
}
function isOnCooldown(network: string): boolean {
  const c = getCooldowns();
  return c[network] && c[network] > Date.now();
}
function remainingCooldown(network: string): number {
  const c = getCooldowns();
  if (!c[network] || c[network] <= Date.now()) return 0;
  return Math.ceil((c[network] - Date.now()) / 1000);
}

// ── VerifyPopup ──────────────────────────────────────────────────────────
function VerifyPopup({ task, onVerify, onClose, isVerifying, verificationStatus }: {
  task: { id: string; title: string; link?: string; reward_points: number; icon_emoji?: string; image_url?: string; task_type: string; verification_method?: string };
  onVerify: () => void; onClose: () => void;
  isVerifying: boolean; verificationStatus: 'pending' | 'success' | 'failed' | null;
}) {
  const taskIcons: Record<string, string> = { channel: '📢', group: '👥', bot: '🤖', post: '📰', partner: '🤝' };
  const isBotVerify = task.verification_method === 'bot_verify';
  const isTrustVerify = task.verification_method === 'trust_verify';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
      <div className="mx-4 w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0d1a 0%, #1a0a2e 100%)', border: '1px solid rgba(124,58,237,0.4)' }}>
        <div className="p-6 text-center">
          {task.image_url ? <img src={task.image_url} alt={task.title} className="w-20 h-20 mx-auto mb-4 rounded-xl object-cover" /> : <div className="text-5xl mb-4">{task.icon_emoji || taskIcons[task.task_type] || '📋'}</div>}
          <h3 className="text-white font-bold text-lg mb-2">{task.title}</h3>
          <p className="text-gold-400 font-bold mb-4">+{task.reward_points} pts</p>
          {verificationStatus === null && (
            <>
              {isTrustVerify ? (
                <>
                  <p className="text-gray-400 text-sm mb-6">Click the button below to open the link. Your completion will be manually verified.</p>
                  {task.link && <button onClick={() => { window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank'); }} className="w-full py-3 rounded-xl font-bold mb-3" style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)', color: 'white' }}>Open Link</button>}
                  <button onClick={onVerify} disabled={isVerifying} className="w-full py-3 rounded-xl font-bold" style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814' }}>{isVerifying ? 'Submitting...' : 'Mark as Done'}</button>
                </>
              ) : isBotVerify ? (
                <>
                  <p className="text-gray-400 text-sm mb-6">Open the channel/group, then click "Check" to verify your membership.</p>
                  {task.link && <button onClick={() => { window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank'); }} className="w-full py-3 rounded-xl font-bold mb-3" style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)', color: 'white' }}>Open {task.task_type === 'channel' ? 'Channel' : 'Group'}</button>}
                  <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 text-gray-400 font-bold">Cancel</button>
                    <button onClick={onVerify} disabled={isVerifying} className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814' }}>{isVerifying ? 'Checking...' : 'Check'}</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-6">Click the button below to complete this task.</p>
                  {task.link && <button onClick={() => { window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank'); }} className="w-full py-3 rounded-xl font-bold mb-3" style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)', color: 'white' }}>Open Link</button>}
                  <button onClick={onVerify} disabled={isVerifying} className="w-full py-3 rounded-xl font-bold" style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814' }}>{isVerifying ? 'Completing...' : 'Complete Task'}</button>
                </>
              )}
            </>
          )}
          {verificationStatus === 'success' && <div className="py-4"><div className="text-4xl mb-3 animate-bounce">✅</div><p className="text-green-400 font-bold mb-4">Task completed!</p></div>}
          {verificationStatus === 'failed' && <div className="py-4"><AlertCircle className="text-yellow-400 w-12 h-12 mx-auto mb-3" />{isBotVerify ? <><p className="text-yellow-400 font-bold mb-2">You haven't joined yet!</p><p className="text-gray-400 text-sm mb-4">Please join first, then try again.</p><button onClick={onVerify} className="w-full py-3 rounded-xl font-bold" style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814' }}>Check Again</button></> : <p className="text-yellow-400 font-bold mb-4">Please try again later.</p>}</div>}
        </div>
      </div>
    </div>
  );
}

// ── AdCard ──────────────────────────────────────────────────────────────
function AdCard({ config, watchedToday, onWatch, busy }: {
  config: AdNetworkConfig;
  watchedToday: number;
  onWatch: () => void;
  busy: boolean;
}) {
  const [cd, setCd] = useState(0);
  const remaining = Math.max(0, config.dailyLimit - watchedToday);
  const cdRem = remainingCooldown(config.network);

  useEffect(() => {
    if (cdRem <= 0) { setCd(0); return; }
    setCd(cdRem);
    const t = setInterval(() => {
      const r = remainingCooldown(config.network);
      if (r <= 0) { setCd(0); clearInterval(t); }
      else setCd(r);
    }, 1000);
    return () => clearInterval(t);
  }, [cdRem]);

  const disabled = busy || remaining <= 0 || cd > 0;

  return (
    <div className={`glass-card p-4 flex items-center gap-4 transition-all ${disabled ? 'opacity-60' : 'hover:border-gold-500/50'}`}>
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-700/50 to-blue-700/50 flex items-center justify-center text-3xl">{config.logo}</div>
      <div className="flex-1">
        <h3 className="text-white font-bold">{config.name}</h3>
        <p className="text-gray-400 text-sm">
          {remaining > 0 ? `${remaining}/${config.dailyLimit} remaining today` : 'Daily limit reached'}
        </p>
      </div>
      <div className="text-right">
        {cd > 0 ? (
          <div className="flex items-center gap-2">
            <Clock className="text-gold-400 animate-pulse" size={20} />
            <span className="text-gold-400 font-bold">{cd}s</span>
          </div>
        ) : (
          <button onClick={onWatch} disabled={disabled} className="px-4 py-2 rounded-xl font-bold" style={{ background: disabled ? 'rgba(255,255,255,0.1)' : 'linear-gradient(90deg, #00c853, #fbbf24)', color: disabled ? '#666' : '#080814' }}>
            <div className="flex items-center gap-2">
              <PlayCircle size={18} />
              <div>
                <p className="font-bold leading-none">+{config.pointsPerAd}</p>
                <p className="text-xs opacity-80">pts</p>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ── AdsView ─────────────────────────────────────────────────────────────
export function AdsView() {
  const { user, tasks, refreshTasks, addPoints, haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [configs, setConfigs] = useState<Record<AdNetwork, AdNetworkConfig> | null>(null);
  const [watchedCounts, setWatchedCounts] = useState<Record<AdNetwork, number>>({ adsgram: 0, monetag: 0, gigapub: 0 });
  const [busy, setBusy] = useState<AdNetwork | null>(null);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const [visibleTasks, setVisibleTasks] = useState(INITIAL_TASKS_SHOWN);
  const [showVerifyPopup, setShowVerifyPopup] = useState<typeof tasks[0] | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    const c = await loadAdSettings();
    setConfigs(c);
    if (user) {
      const [a, m, g] = await Promise.all([
        canWatchAd(user.id, 'adsgram', c.adsgram),
        canWatchAd(user.id, 'monetag', c.monetag),
        canWatchAd(user.id, 'gigapub', c.gigapub),
      ]);
      setWatchedCounts({ adsgram: a.watchedToday, monetag: m.watchedToday, gigapub: g.watchedToday });
    }
  }, [user]);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const allIncompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const displayedTasks = allIncompleteTasks.slice(0, visibleTasks);
  const hasMoreTasks = allIncompleteTasks.length > visibleTasks;

  const handleTaskComplete = () => {
    refreshTasks();
    if (allIncompleteTasks.length > visibleTasks) setVisibleTasks(prev => prev + 1);
  };

  const completeTask = async (task: typeof tasks[0]) => {
    if (!user) return;
    const verificationMethod = task.verification_method || 'auto';

    if (verificationMethod === 'trust_verify') {
      setIsVerifying(true); setVerificationStatus(null);
      try {
        const { error: completionError } = await supabase.from('task_completions').insert({ user_id: user.id, task_id: task.id, status: 'pending' });
        setIsVerifying(false);
        if (completionError) {
          if (completionError.message?.includes('duplicate')) { showError('Already Submitted', 'This task is pending approval.'); }
          else throw completionError;
        } else {
          setVerificationStatus('success'); haptic('success');
          showSuccess('Task Submitted', 'Your completion is pending admin approval.');
          setTimeout(() => { setShowVerifyPopup(null); setVerificationStatus(null); }, 1500);
        }
      } catch { setIsVerifying(false); setVerificationStatus('failed'); showError('Submission Failed', 'Could not submit task.'); }
      return;
    }

    if (verificationMethod === 'bot_verify' && task.link) {
      setIsVerifying(true); setVerificationStatus(null);
      try {
        const chatId = task.link.replace('https://t.me/', '').replace('@', '').replace('/', '');
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_membership', user_id: user.telegram_id, chat_id: chatId }),
        });
        const data = await response.json();
        setIsVerifying(false);
        if (data.is_member) { setVerificationStatus('success'); haptic('success'); await completeTaskRecord(task); }
        else { setVerificationStatus('failed'); haptic('error'); }
      } catch { setIsVerifying(false); setVerificationStatus('failed'); showError('Verification Failed', 'Could not verify membership.'); }
      return;
    }

    setIsVerifying(true); setVerificationStatus(null);
    try { await completeTaskRecord(task); setVerificationStatus('success'); setIsVerifying(false); }
    catch { setIsVerifying(false); setVerificationStatus('failed'); showError('Failed', 'Could not complete task.'); }
  };

  const completeTaskRecord = async (task: typeof tasks[0]) => {
    const { error: completionError } = await supabase.from('task_completions').insert({ user_id: user!.id, task_id: task.id, status: 'completed' });
    if (completionError) throw completionError;
    await addPoints(task.reward_points);
    const { data: referral } = await supabase.from('referrals').select('referrer_id, task_bonus, join_bonus').eq('referred_id', user!.id).maybeSingle();
    if (referral && referral.task_bonus === 0 && task.task_section === 'main') {
      await supabase.rpc('add_points', { user_id: referral.referrer_id, amount: 40 });
      await supabase.from('referrals').update({ task_bonus: 40, total_commission: 40 + (referral.join_bonus || 20) }).eq('referred_id', user!.id);
    }
    await handleTaskComplete();
    showSuccess(`+${task.reward_points} Points!`, 'Task completed.');
    setTimeout(() => { setShowVerifyPopup(null); setVerificationStatus(null); }, 1500);
  };

  const handleTaskClick = async (task: typeof tasks[0]) => {
    if (task.completed || !user || completingTaskId) return;
    haptic('light');
    const verificationMethod = task.verification_method || 'auto';
    if (verificationMethod === 'bot_verify' || verificationMethod === 'trust_verify') { setShowVerifyPopup(task); return; }
    if (task.link) { window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank'); }
    setCompletingTaskId(task.id);
    setTimeout(async () => {
      try {
        const { error: completionError } = await supabase.from('task_completions').insert({ user_id: user.id, task_id: task.id, status: 'completed' });
        if (completionError) throw completionError;
        await addPoints(task.reward_points);
        const { data: referral } = await supabase.from('referrals').select('referrer_id, task_bonus, join_bonus').eq('referred_id', user.id).maybeSingle();
        if (referral && referral.task_bonus === 0 && task.task_section === 'main') {
          await supabase.rpc('add_points', { user_id: referral.referrer_id, amount: 40 });
          await supabase.from('referrals').update({ task_bonus: 40, total_commission: 40 + (referral.join_bonus || 20) }).eq('referred_id', user.id);
        }
        await handleTaskComplete();
        showSuccess(`+${task.reward_points} Points!`, 'Task completed.');
        haptic('success');
      } catch { showError('Task Failed', 'Could not complete task.'); haptic('error'); }
      finally { setCompletingTaskId(null); }
    }, 2000);
  };

  const watchAd = async (network: AdNetwork) => {
    if (!user || !configs || busy) return;
    const config = configs[network];
    const check = await canWatchAd(user.id, network, config);
    if (!check.canWatch) { showError('Limit Reached', check.reason || 'Daily limit reached'); return; }
    if (isOnCooldown(network)) { showError('Cooldown', `Wait ${remainingCooldown(network)}s before watching another ad`); return; }

    haptic('light');
    setBusy(network);

    try {
      if (network === 'adsgram') {
        await showAdsgramAd('35763');
      } else if (network === 'monetag') {
        await showMonetagAd('11230846');
      } else if (network === 'gigapub') {
        await showGigapubAd('7151');
      }

      await recordAdView(user.id, network, config.pointsPerAd);
      await addPoints(config.pointsPerAd);

      // Referral ad bonus at 10 ads
      const { count } = await supabase.from('ad_views').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      if (count && count % 10 === 0) {
        const { data: referral } = await supabase.from('referrals').select('referrer_id, referred_ad_count').eq('referred_id', user.id).maybeSingle();
        if (referral) {
          const newAdCount = (referral.referred_ad_count || 0) + 10;
          await supabase.from('referrals').update({ referred_ad_count: newAdCount }).eq('referred_id', user.id);
          if (newAdCount === 10) {
            await supabase.rpc('add_points', { user_id: referral.referrer_id, amount: 70 });
          }
        }
      }

      setCooldown(network, config.cooldownSeconds);
      setWatchedCounts(prev => ({ ...prev, [network]: prev[network] + 1 }));
      setLastReward(config.pointsPerAd);
      showSuccess(`+${config.pointsPerAd} Points!`, `${config.name} ad reward added.`);
      haptic('success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ad failed to load';
      showError('Ad Error', msg);
      haptic('error');
    } finally {
      setBusy(null);
    }
  };

  const taskIcons: Record<string, string> = { channel: '📢', group: '👥', bot: '🤖', post: '📰', partner: '🤝' };

  if (!configs) {
    return <div className="px-4 pb-24 pt-4"><div className="loader mx-auto" /></div>;
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3"><span className="text-4xl">📺</span>Watch & Earn</h1>
        <p className="text-green-400 mt-2">Watch ads from our partners to earn points!</p>
      </div>

      {/* Balance Card */}
      <div className="glass-card p-4 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.15) 0%, rgba(251,191,36,0.1) 100%)' }}>
        <div className="absolute top-0 right-0 text-6xl opacity-20 transform translate-x-2 -translate-y-2">💰</div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-600 to-green-brand flex items-center justify-center text-2xl">💎</div>
          <div className="flex-1">
            <p className="text-gray-400 text-sm">Your Balance</p>
            <p className="text-2xl font-bold text-green-400">{user?.points?.toLocaleString() || 0} pts</p>
            <p className="text-gray-500 text-xs">~${((user?.points || 0) * 0.0001).toFixed(2)} USDT</p>
          </div>
          <Flame className="text-orange-400" size={32} />
        </div>
      </div>

      {/* Tasks Section */}
      {displayedTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="text-green-400" size={20} />
            <h2 className="text-white font-semibold">Quick Tasks</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{allIncompleteTasks.length} available</span>
          </div>
          <div className="space-y-3">
            {displayedTasks.map((task) => (
              <button key={task.id} onClick={() => handleTaskClick(task)} disabled={completingTaskId === task.id}
                className="glass-card p-3 w-full text-left border border-green-500/30 bg-gradient-to-r from-green-500/10 to-green-600/5 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-xl overflow-hidden">
                    {task.image_url ? <img src={task.image_url} alt={task.title} className="w-full h-full object-cover" /> : task.icon_emoji || taskIcons[task.task_type] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{task.title}</p>
                    <p className="text-green-400 text-xs font-bold">+{task.reward_points} pts</p>
                  </div>
                  {completingTaskId === task.id ? <div className="loader w-5 h-5 !border-2 !border-t-green-brand" /> : <ChevronRight className="text-gray-500" size={20} />}
                </div>
              </button>
            ))}
          </div>
          {hasMoreTasks && <button onClick={() => setVisibleTasks(prev => prev + INITIAL_TASKS_SHOWN)} className="w-full mt-3 py-2 text-center text-green-400 text-sm font-semibold">Load {allIncompleteTasks.length - visibleTasks} more tasks</button>}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="text-green-400" size={16} /><span className="text-gray-400 text-sm">{completedTasks.length} tasks completed</span></div>
        </div>
      )}

      {lastReward && (
        <div className="glass-card p-4 mb-6 text-center animate-scale-in bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-green-400 font-bold text-xl">+{lastReward} Points Earned!</p>
          <button onClick={() => setLastReward(null)} className="text-gray-400 text-sm mt-2">Close</button>
        </div>
      )}

      {/* Ad Networks */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3"><Gift className="text-gold-400" size={20} /><h2 className="text-white font-semibold">Watch Ads & Earn</h2></div>
        <p className="text-gray-400 text-sm mb-4">Each network has a daily limit. Watch one ad at a time.</p>
        <div className="grid grid-cols-1 gap-3">
          {(['adsgram', 'monetag', 'gigapub'] as AdNetwork[]).map(net => (
            <AdCard key={net} config={configs[net]} watchedToday={watchedCounts[net]} onWatch={() => watchAd(net)} busy={busy !== null && busy !== net} />
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><span className="text-xl">💡</span>How it works</h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li className="flex items-start gap-2"><span className="text-green-400">✓</span>Choose an ad network and click watch</li>
          <li className="flex items-start gap-2"><span className="text-green-400">✓</span>Wait 5s cooldown after each ad</li>
          <li className="flex items-start gap-2"><span className="text-green-400">✓</span>10 ads per network per day</li>
          <li className="flex items-start gap-2"><span className="text-green-400">✓</span>500 points = $0.05 USDT</li>
        </ul>
      </div>

      {/* Busy Overlay */}
      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
          <div className="glass-card p-8 text-center max-w-sm w-[90%]">
            <div className="text-6xl mb-4 animate-pulse">{configs[busy].logo}</div>
            <h3 className="text-xl font-bold text-white mb-2">{configs[busy].name}</h3>
            <p className="text-gray-400 mb-4">Loading ad...</p>
            <div className="w-full h-4 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: 'linear-gradient(90deg, #00c853, #fbbf24)' }} />
            </div>
            <button onClick={() => setBusy(null)} className="text-gray-400 text-sm"><X size={20} className="mx-auto" /></button>
          </div>
        </div>
      )}

      {showVerifyPopup && (
        <VerifyPopup task={showVerifyPopup} onVerify={() => completeTask(showVerifyPopup)} onClose={() => { setShowVerifyPopup(null); setVerificationStatus(null); }} isVerifying={isVerifying} verificationStatus={verificationStatus} />
      )}
    </div>
  );
}

// ── Interstitial Ad hook (for app open & home page) ───────────────────────
let lastInterstitial = 0;
const INTERSTITIAL_COOLDOWN = 2000;

export async function showInterstitialOnOpen(): Promise<void> {
  const now = Date.now();
  if (now - lastInterstitial < INTERSTITIAL_COOLDOWN) return;
  lastInterstitial = now;
  try {
    await showAdsgramAd('35763');
  } catch {
    // Silent fail for interstitials
  }
}

export function useInterstitialOnHome() {
  const { user } = useApp();
  const lastHomeAd = useRef(0);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (now - lastHomeAd.current < 3000) return;
    lastHomeAd.current = now;
    // Show Adsgram interstitial after 2-3s on home page
    const timer = setTimeout(() => {
      showAdsgramAd('35763').catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, [user?.id]);
}
