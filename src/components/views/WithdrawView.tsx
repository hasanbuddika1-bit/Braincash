import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import {
  Wallet, ArrowUpRight, Clock, CheckCircle, XCircle, ExternalLink, Info,
  Lock, Play, AlertCircle, ChevronRight, Heart, Zap, TrendingUp, Users, Target,
} from 'lucide-react';
import type { Withdrawal } from '../../types';

const POINTS_TO_USD = 0.0001;
const FIRST_WITHDRAW_POINTS = 500;
const FIRST_WITHDRAW_USD = 0.05;
const SECOND_WITHDRAW_USD = 0.10;
const MAX_WITHDRAW_USD = 0.20;
const WITHDRAW_FEE = 0.01;
const WITHDRAW_FEE_PERCENT = 5;
const REQUIRED_DAILY_ADS = 20;
const REQUIRED_ACTIVE_REFERRALS = 2;
const ADS_TO_WATCH_FOR_WITHDRAW = 3;

const AD_PROVIDERS = [
  { id: 'adgamer', name: 'AdGamer', logo: '🎮' },
  { id: 'monetag', name: 'Monetag', logo: '📊' },
  { id: 'gigapub', name: 'Gigapub', logo: '🚀' },
  { id: 'monetix', name: 'Monetix', logo: '💰' },
];

export function WithdrawView() {
  const { user, withdrawals, refreshWithdrawals, refreshUser, haptic, setCurrentView } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USDT' | 'TON'>('USDT');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [tonPrice, setTonPrice] = useState(7.5);
  const [usdtPrice, setUsdtPrice] = useState(1);
  const [showAdFlow, setShowAdFlow] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);
  const [currentAdIdx, setCurrentAdIdx] = useState(0);
  const [adTimer, setAdTimer] = useState(0);
  const [adPlaying, setAdPlaying] = useState(false);
  const [requirements, setRequirements] = useState({
    dailyAdsWatched: 0,
    activeReferrals: 0,
    mainTasksCompleted: false,
    partnerTasksCompleted: false,
  });
  const [pendingWithdrawal, setPendingWithdrawal] = useState(false);

  useEffect(() => {
    fetchPrices();
    loadRequirements();
    checkPendingWithdrawal();
  }, [user?.id]);

  async function fetchPrices() {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,the-open-network&vs_currencies=usd');
      const data = await response.json();
      setUsdtPrice(data.tether?.usd || 1);
      setTonPrice(data['the-open-network']?.usd || 7.5);
    } catch {}
  }

  async function loadRequirements() {
    if (!user || !supabase) return;
    try {
      // Get today's ad views count
      const today = new Date().toISOString().split('T')[0];
      const { count: adCount } = await supabase
        .from('ad_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('viewed_at', today + 'T00:00:00');

      // Get active referrals count
      const { data: refs } = await supabase
        .from('referrals')
        .select('referred_id, referred_ad_count, referred_task_count, task_bonus')
        .eq('referrer_id', user.id);

      const activeRefs = (refs || []).filter(r =>
        (r.referred_ad_count || 0) >= 10 && (r.referred_task_count || 0) > 0
      ).length;

      // Check main tasks completed
      const { data: mainCompletions } = await supabase
        .from('task_completions')
        .select('task_id, tasks!inner(task_section)')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const mainDone = (mainCompletions || []).filter(c => {
        const task = c.tasks as unknown as { task_section: string };
        return task?.task_section === 'main';
      }).length;

      // Check partner tasks completed
      const partnerDone = (mainCompletions || []).filter(c => {
        const task = c.tasks as unknown as { task_section: string };
        return task?.task_section === 'partner';
      }).length;

      // Get total main and partner tasks
      const { data: mainTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('task_section', 'main')
        .eq('is_active', true);
      const { data: partnerTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('task_section', 'partner')
        .eq('is_active', true);

      const mainTasksCompleted = mainTasks && mainTasks.length > 0 ? mainDone >= mainTasks.length : true;
      const partnerTasksCompleted = partnerTasks && partnerTasks.length > 0 ? partnerDone >= partnerTasks.length : true;

      setRequirements({
        dailyAdsWatched: adCount || 0,
        activeReferrals: activeRefs,
        mainTasksCompleted,
        partnerTasksCompleted,
      });
    } catch (err) {
      console.error('Error loading requirements:', err);
    }
  }

  async function checkPendingWithdrawal() {
    if (!user) return;
    const hasPending = withdrawals.some(w => w.status === 'pending' || w.status === 'approved');
    setPendingWithdrawal(hasPending);
  }

  const userPoints = user?.points || 0;
  const usdValue = userPoints * POINTS_TO_USD;
  const withdrawCount = user?.withdraw_count || 0;

  // Determine minimum withdraw amount based on withdraw count
  const minWithdrawUSD = withdrawCount === 0 ? FIRST_WITHDRAW_USD : SECOND_WITHDRAW_USD;
  const minWithdrawPoints = withdrawCount === 0 ? FIRST_WITHDRAW_POINTS : Math.round(SECOND_WITHDRAW_USD / POINTS_TO_USD);

  function calculateNet(usdAmount: number) {
    const fee = WITHDRAW_FEE + (usdAmount * WITHDRAW_FEE_PERCENT / 100);
    return usdAmount - fee;
  }

  const inputAmount = parseFloat(amount) || 0;
  const inputUSD = amount ? inputAmount * POINTS_TO_USD : 0;
  const fee = inputUSD ? WITHDRAW_FEE + (inputUSD * WITHDRAW_FEE_PERCENT / 100) : 0;
  const netAmount = inputUSD ? inputUSD - fee : 0;

  // Check all requirements
  const allRequirementsMet =
    requirements.dailyAdsWatched >= REQUIRED_DAILY_ADS &&
    requirements.activeReferrals >= REQUIRED_ACTIVE_REFERRALS &&
    requirements.mainTasksCompleted &&
    requirements.partnerTasksCompleted;

  const hasMinPoints = userPoints >= minWithdrawPoints;
  const withinMax = inputUSD <= MAX_WITHDRAW_USD;
  const isValid = inputUSD >= minWithdrawUSD && netAmount > 0 && walletAddress.length > 10 && withinMax;

  function handleCashOutClick() {
    haptic('light');
    if (pendingWithdrawal) {
      showError('Pending Withdrawal', 'You have a pending withdrawal. Wait for it to be approved.');
      return;
    }
    if (!allRequirementsMet) {
      showError('Requirements Not Met', 'Complete all requirements before withdrawing.');
      return;
    }
    if (!hasMinPoints) {
      showError('Insufficient Points', `You need at least ${minWithdrawPoints} points to withdraw.`);
      return;
    }
    setShowAdFlow(true);
    setAdsWatched(0);
    setCurrentAdIdx(0);
  }

  function startAdWatch() {
    haptic('light');
    setAdPlaying(true);
    setAdTimer(5);
  }

  useEffect(() => {
    if (adPlaying && adTimer > 0) {
      const t = setTimeout(() => setAdTimer(at => at - 1), 1000);
      return () => clearTimeout(t);
    } else if (adPlaying && adTimer === 0) {
      // Ad finished
      setAdPlaying(false);
      const newCount = adsWatched + 1;
      setAdsWatched(newCount);
      haptic('success');

      if (newCount >= ADS_TO_WATCH_FOR_WITHDRAW) {
        // All ads watched, proceed to withdraw form
        setShowAdFlow(false);
        showSuccess('Ads Watched!', 'You can now make a withdrawal request.');
      } else {
        setCurrentAdIdx((currentAdIdx + 1) % AD_PROVIDERS.length);
      }
    }
  }, [adPlaying, adTimer]);

  async function handleWithdraw() {
    if (!user || !isValid || loading) return;

    haptic('light');
    setLoading(true);

    try {
      const pointsToDeduct = Math.round(inputAmount);
      const currencyAmount = currency === 'USDT' ? netAmount : netAmount / tonPrice;
      const newWithdrawNumber = withdrawCount + 1;

      // Create withdrawal request
      const { error: withdrawError } = await supabase.from('withdrawals').insert({
        user_id: user.id,
        amount: netAmount,
        fee,
        net_amount: currencyAmount,
        currency,
        wallet_address: walletAddress,
        status: 'pending',
        withdraw_number: newWithdrawNumber,
      });

      if (withdrawError) throw withdrawError;

      // Deduct points and update withdraw count
      const { error: updateError } = await supabase
        .from('users')
        .update({
          points: user.points - pointsToDeduct,
          total_withdrawn: user.total_withdrawn + netAmount,
          withdraw_count: newWithdrawNumber,
          first_withdraw_done: withdrawCount === 0,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Withdrawal Requested',
        message: `Your withdrawal #${newWithdrawNumber} of $${netAmount.toFixed(4)} ${currency} is pending review.`,
        type: 'withdrawal',
      });

      // Send notification to admin
      const { data: admin } = await supabase
        .from('users')
        .select('id')
        .eq('is_admin', true)
        .limit(1)
        .maybeSingle();

      if (admin) {
        await supabase.from('notifications').insert({
          user_id: admin.id,
          title: 'New Withdrawal Request',
          message: `User ${user.first_name || user.username || user.telegram_id} requested $${netAmount.toFixed(4)} ${currency}. Withdraw #${newWithdrawNumber}`,
          type: 'withdrawal',
        });
      }

      // Refresh
      await refreshWithdrawals();
      await refreshUser();

      // Reset form
      setAmount('');
      setWalletAddress('');

      showSuccess('Withdrawal Requested', `Your withdrawal #${newWithdrawNumber} of $${netAmount.toFixed(4)} ${currency} is pending review.`);
      haptic('success');
    } catch (error) {
      console.error('Withdrawal error:', error);
      showError('Withdrawal Failed', 'Could not create withdrawal. Please try again.');
      haptic('error');
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400',
    approved: 'text-blue-400',
    rejected: 'text-red-400',
    completed: 'text-green-400',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="text-yellow-400" size={16} />,
    approved: <CheckCircle className="text-blue-400" size={16} />,
    rejected: <XCircle className="text-red-400" size={16} />,
    completed: <CheckCircle className="text-green-400" size={16} />,
  };

  // ── Ad watching flow overlay ──
  if (showAdFlow) {
    const currentAd = AD_PROVIDERS[currentAdIdx];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4">
        <div className="w-full max-w-sm">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">Watch Ads to Withdraw</span>
              <span className="text-gold-400 font-bold">{adsWatched}/{ADS_TO_WATCH_FOR_WITHDRAW}</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(adsWatched / ADS_TO_WATCH_FOR_WITHDRAW) * 100}%`,
                  background: 'linear-gradient(90deg, #00c853, #fbbf24, #00c853)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s linear infinite',
                }}
              />
            </div>
          </div>

          {/* Ad blocks */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {Array.from({ length: ADS_TO_WATCH_FOR_WITHDRAW }).map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${
                  i < adsWatched
                    ? 'bg-green-500/20 border-green-500/50'
                    : i === adsWatched
                    ? 'bg-purple-500/20 border-purple-500/50 animate-pulse'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {i < adsWatched ? (
                  <CheckCircle className="text-green-400" size={32} />
                ) : (
                  <Play className={i === adsWatched ? 'text-purple-400' : 'text-gray-500'} size={32} />
                )}
                <span className={`text-xs mt-1 ${i < adsWatched ? 'text-green-400' : 'text-gray-500'}`}>
                  Ad {i + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Ad player area */}
          {!adPlaying && adsWatched < ADS_TO_WATCH_FOR_WITHDRAW && (
            <div className="glass-card p-8 text-center">
              <div className="text-5xl mb-4">{currentAd.logo}</div>
              <p className="text-white font-bold text-lg mb-2">{currentAd.name}</p>
              <p className="text-gray-400 text-sm mb-6">Watch this ad to continue</p>
              <button
                onClick={startAdWatch}
                className="btn-neon-gold w-full flex items-center justify-center gap-2"
              >
                <Play size={20} />
                Watch Ad ({currentAd.name})
              </button>
            </div>
          )}

          {/* Ad playing */}
          {adPlaying && (
            <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(0,212,255,0.2))' }}>
              <div className="text-5xl mb-4 animate-bounce-slow">{currentAd.logo}</div>
              <p className="text-white font-bold text-lg mb-2">{currentAd.name}</p>
              <p className="text-gray-400 text-sm mb-4">Ad playing...</p>
              <div className="text-6xl font-black text-gold-400 font-['Orbitron']">{adTimer}s</div>
              <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${((5 - adTimer) / 5) * 100}%`,
                    background: 'linear-gradient(90deg, #00c853, #fbbf24)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Cancel button */}
          <button
            onClick={() => { haptic('light'); setShowAdFlow(false); }}
            className="w-full mt-4 py-3 rounded-xl bg-white/10 text-gray-400 font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">💸</span>
          Withdraw
        </h1>
        <p className="text-purple-300 mt-2">Convert your points to crypto!</p>
      </div>

      {/* Balance Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 text-8xl opacity-10 transform translate-x-4 -translate-y-4">💰</div>
        <div className="relative z-10">
          <p className="text-gray-400 text-sm mb-1">Your Balance</p>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-4xl font-bold font-['Orbitron'] text-white">{userPoints.toLocaleString()}</h2>
            <span className="text-gold-400 font-semibold text-lg">pts</span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-400 text-sm">≈</span>
            <span className="text-2xl font-bold text-gold-400">${usdValue.toFixed(2)}</span>
            <span className="text-gray-400 text-sm">USD</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Info className="text-blue-400" size={14} />
            <span className="text-gray-400">
              {withdrawCount === 0 ? 'First withdraw: 500 pts ($0.05)' : `Min: ${minWithdrawPoints} pts ($${minWithdrawUSD})`}
              {' • Max: $${MAX_WITHDRAW_USD}'}
            </span>
          </div>
        </div>
      </div>

      {/* Requirements Card */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Lock className="text-gold-400" size={20} />
          Withdraw Requirements
        </h3>

        <div className="space-y-3">
          {/* Daily ads */}
          <RequirementRow
            icon={<TrendingUp size={18} />}
            label={`Watch ${REQUIRED_DAILY_ADS} daily ads`}
            value={`${requirements.dailyAdsWatched}/${REQUIRED_DAILY_ADS}`}
            done={requirements.dailyAdsWatched >= REQUIRED_DAILY_ADS}
          />
          {/* Active referrals */}
          <RequirementRow
            icon={<Users size={18} />}
            label={`Get ${REQUIRED_ACTIVE_REFERRALS} active referrals`}
            value={`${requirements.activeReferrals}/${REQUIRED_ACTIVE_REFERRALS}`}
            done={requirements.activeReferrals >= REQUIRED_ACTIVE_REFERRALS}
          />
          {/* Main tasks */}
          <RequirementRow
            icon={<Target size={18} />}
            label="Complete all main tasks"
            value={requirements.mainTasksCompleted ? 'Done' : 'Pending'}
            done={requirements.mainTasksCompleted}
          />
          {/* Partner tasks */}
          <RequirementRow
            icon={<Target size={18} />}
            label="Complete all partner tasks"
            value={requirements.partnerTasksCompleted ? 'Done' : 'Pending'}
            done={requirements.partnerTasksCompleted}
          />
        </div>

        {/* Processing bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs">Overall Progress</span>
            <span className="text-gold-400 text-xs font-bold">
              {[
                requirements.dailyAdsWatched >= REQUIRED_DAILY_ADS,
                requirements.activeReferrals >= REQUIRED_ACTIVE_REFERRALS,
                requirements.mainTasksCompleted,
                requirements.partnerTasksCompleted,
              ].filter(Boolean).length}/4
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${([
                  requirements.dailyAdsWatched >= REQUIRED_DAILY_ADS,
                  requirements.activeReferrals >= REQUIRED_ACTIVE_REFERRALS,
                  requirements.mainTasksCompleted,
                  requirements.partnerTasksCompleted,
                ].filter(Boolean).length / 4) * 100}%`,
                background: 'linear-gradient(90deg, #00c853, #fbbf24, #7c3aed)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* Pending withdrawal warning */}
      {pendingWithdrawal && (
        <div className="glass-card p-4 mb-6" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle className="text-yellow-400" size={24} />
            <div>
              <p className="text-yellow-400 font-semibold">Pending Withdrawal</p>
              <p className="text-gray-400 text-sm">You have a pending withdrawal. Wait for it to be approved before requesting another.</p>
            </div>
          </div>
        </div>
      )}

      {/* Cash Out Button (gated) */}
      {!pendingWithdrawal && (
        <button
          onClick={handleCashOutClick}
          disabled={!allRequirementsMet || !hasMinPoints}
          className={`btn-neon-gold w-full mb-6 ${(!allRequirementsMet || !hasMinPoints) ? 'opacity-50' : ''}`}
        >
          {allRequirementsMet && hasMinPoints ? (
            <span className="flex items-center justify-center gap-2">
              <Zap size={20} />
              Cash Out (Watch {ADS_TO_WATCH_FOR_WITHDRAW} Ads)
            </span>
          ) : !allRequirementsMet ? (
            'Complete Requirements First'
          ) : (
            `Need ${minWithdrawPoints} pts minimum`
          )}
        </button>
      )}

      {/* Withdrawal Form (only shown after ad flow) */}
      {adsWatched >= ADS_TO_WATCH_FOR_WITHDRAW && !pendingWithdrawal && (
        <div className="glass-card p-4 mb-6 animate-fade-in" style={{ border: '1px solid rgba(0,200,83,0.3)' }}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Wallet className="text-neon-blue" size={20} />
            Withdrawal Request
          </h3>

          {/* Points Input */}
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">Points to Withdraw</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter points"
                className="w-full py-3 px-4 rounded-xl bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                max={Math.min(userPoints, Math.round(MAX_WITHDRAW_USD / POINTS_TO_USD))}
              />
              <button
                onClick={() => setAmount(Math.min(userPoints, Math.round(MAX_WITHDRAW_USD / POINTS_TO_USD)).toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-400 text-sm font-semibold"
              >
                MAX
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Min: {minWithdrawPoints} pts (${minWithdrawUSD}) • Max: {Math.round(MAX_WITHDRAW_USD / POINTS_TO_USD)} pts (${MAX_WITHDRAW_USD})
            </p>
          </div>

          {/* Currency Selection with logos */}
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">Currency</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { haptic('light'); setCurrency('USDT'); }}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                  currency === 'USDT' ? 'border-gold-400 bg-gold-400/10' : 'border-white/10 bg-white/5'
                }`}
              >
                {/* USDT BEP20 logo */}
                <div className="w-10 h-10 rounded-full mb-2 flex items-center justify-center" style={{ background: '#26A17B' }}>
                  <span className="text-white font-black text-sm">₮</span>
                </div>
                <p className="text-white font-semibold">USDT</p>
                <p className="text-gray-400 text-xs">BEP20</p>
              </button>
              <button
                onClick={() => { haptic('light'); setCurrency('TON'); }}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                  currency === 'TON' ? 'border-blue-400 bg-blue-400/10' : 'border-white/10 bg-white/5'
                }`}
              >
                {/* TON logo */}
                <div className="w-10 h-10 rounded-full mb-2 flex items-center justify-center" style={{ background: '#0098EA' }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 4.5l5.5 2.75v5.5L12 17.5l-5.5-2.75v-5.5L12 6.5z"/>
                  </svg>
                </div>
                <p className="text-white font-semibold">TON / GRAM</p>
                <p className="text-gray-400 text-xs">${tonPrice.toFixed(2)}</p>
              </button>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={`Enter your ${currency} wallet address`}
              className="w-full py-3 px-4 rounded-xl bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
            />
          </div>

          {/* Fee Breakdown */}
          {inputUSD > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-white/5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">USD Value</span>
                <span className="text-white">${inputUSD.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Withdraw Fee (${WITHDRAW_FEE} + {WITHDRAW_FEE_PERCENT}%)</span>
                <span className="text-red-400">-${fee.toFixed(4)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                <span className="text-white font-semibold">Net (after fee)</span>
                <span className="text-gold-400 font-bold">${netAmount.toFixed(4)}</span>
              </div>
              <div className="text-center text-gray-500 text-xs">
                ≈ {currency === 'USDT' ? netAmount.toFixed(4) : (netAmount / tonPrice).toFixed(4)} {currency}
                {currency === 'TON' && ' (GRAM)'}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleWithdraw}
            disabled={!isValid || loading}
            className={`btn-neon-gold w-full ${(!isValid || loading) ? 'opacity-50' : ''}`}
          >
            {loading ? 'Processing...' : `Withdraw ${currency === 'TON' ? 'TON (GRAM)' : 'USDT BEP20'}`}
          </button>
        </div>
      )}

      {/* History */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ArrowUpRight className="text-neon-purple" size={20} />
          Withdrawal History
        </h3>

        {withdrawals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 opacity-50">💸</div>
            <p className="text-gray-400">No withdrawals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  w.status === 'completed' ? 'bg-green-500/20' :
                  w.status === 'rejected' ? 'bg-red-500/20' :
                  'bg-yellow-500/20'
                }`}>
                  {w.currency === 'USDT' ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#26A17B' }}>
                      <span className="text-white font-black text-xs">₮</span>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#0098EA' }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                        <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">
                    ${w.amount.toFixed(4)} {w.currency}
                    {w.withdraw_number && <span className="text-gray-500 text-xs ml-2">#{w.withdraw_number}</span>}
                  </p>
                  <p className="text-gray-400 text-sm truncate max-w-[150px]">
                    {w.wallet_address.slice(0, 8)}...{w.wallet_address.slice(-6)}
                  </p>
                  {w.reject_reason && (
                    <p className="text-red-400 text-xs mt-1">Reason: {w.reject_reason}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {statusIcons[w.status]}
                    <span className={`text-sm ${statusColors[w.status]} capitalize`}>{w.status}</span>
                  </div>
                  <p className="text-gray-500 text-xs">{new Date(w.created_at).toLocaleDateString()}</p>
                </div>
                {w.tx_id && (
                  <a
                    href={`https://${w.currency === 'USDT' ? 'bscscan.com' : 'tonviewer.com'}/tx/${w.tx_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment channel & mini app buttons */}
      <div className="mt-6 space-y-3">
        <button
          onClick={() => {
            haptic('light');
            window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/braincash') || window.open('https://t.me/braincash', '_blank');
          }}
          className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2"
        >
          <ExternalLink size={18} />
          View Payment Channel
        </button>
        <button
          onClick={() => {
            haptic('light');
            window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/braincash_bot/app') || window.open('https://t.me/braincash_bot/app', '_blank');
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-2"
        >
          <Zap size={18} />
          Open Mini App
        </button>
      </div>
    </div>
  );
}

function RequirementRow({ icon, label, value, done }: { icon: React.ReactNode; label: string; value: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${done ? 'bg-green-500/20' : 'bg-white/10'}`}>
        {done ? <CheckCircle className="text-green-400" size={20} /> : <span className={done ? 'text-green-400' : 'text-gray-400'}>{icon}</span>}
      </div>
      <div className="flex-1">
        <p className={`text-sm ${done ? 'text-green-400' : 'text-gray-300'}`}>{label}</p>
      </div>
      <span className={`text-sm font-bold ${done ? 'text-green-400' : 'text-yellow-400'}`}>{value}</span>
    </div>
  );
}
