import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import {
  Wallet, ArrowUpRight, Clock, CheckCircle, XCircle, ExternalLink, Info,
  Lock, AlertCircle, Zap, TrendingUp, Users, Target,
} from 'lucide-react';
import type { Withdrawal } from '../../types';

const POINTS_TO_USD = 0.0001;

interface WithdrawConfig {
  required_daily_ads: number;
  required_active_referrals: number;
  first_withdraw_points: number;
  first_withdraw_usd: number;
  second_withdraw_usd: number;
  max_withdraw: number;
  min_withdraw: number;
  withdraw_fee: number;
  withdraw_fee_percent: number;
}

const DEFAULT_CONFIG: WithdrawConfig = {
  required_daily_ads: 20,
  required_active_referrals: 2,
  first_withdraw_points: 500,
  first_withdraw_usd: 0.05,
  second_withdraw_usd: 0.10,
  max_withdraw: 0.20,
  min_withdraw: 0.05,
  withdraw_fee: 0.01,
  withdraw_fee_percent: 5,
};

export function WithdrawView() {
  const { user, withdrawals, refreshWithdrawals, refreshUser, haptic, setCurrentView } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<WithdrawConfig>(DEFAULT_CONFIG);
  const [requirements, setRequirements] = useState({
    dailyAdsWatched: 0,
    activeReferrals: 0,
    mainTasksCompleted: false,
    partnerTasksCompleted: false,
  });
  const [pendingWithdrawal, setPendingWithdrawal] = useState(false);

  useEffect(() => {
    loadConfig();
    loadRequirements();
    checkPendingWithdrawal();
  }, [user?.id]);

  async function loadConfig() {
    try {
      const { data } = await supabase.from('withdraw_requirements_config').select('*').limit(1).maybeSingle();
      if (data) {
        setConfig({
          required_daily_ads: data.required_daily_ads || 20,
          required_active_referrals: data.required_active_referrals || 2,
          first_withdraw_points: data.first_withdraw_points || 500,
          first_withdraw_usd: Number(data.first_withdraw_usd) || 0.05,
          second_withdraw_usd: Number(data.second_withdraw_usd) || 0.10,
          max_withdraw: Number(data.max_withdraw) || 0.20,
          min_withdraw: Number(data.min_withdraw) || 0.05,
          withdraw_fee: Number(data.withdraw_fee) || 0.01,
          withdraw_fee_percent: Number(data.withdraw_fee_percent) || 5,
        });
      }
    } catch (err) {
      console.error('Error loading withdraw config:', err);
    }
  }

  async function loadRequirements() {
    if (!user || !supabase) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { count: adCount } = await supabase
        .from('ad_views').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('viewed_at', today + 'T00:00:00');

      const { data: refs } = await supabase
        .from('referrals').select('referred_id, referred_ad_count, referred_task_count, task_bonus')
        .eq('referrer_id', user.id);

      const activeRefs = (refs || []).filter(r =>
        (r.referred_ad_count || 0) >= 10 && (r.referred_task_count || 0) > 0
      ).length;

      const { data: mainCompletions } = await supabase
        .from('task_completions').select('task_id, tasks!inner(task_section)')
        .eq('user_id', user.id).eq('status', 'completed');

      const mainDone = (mainCompletions || []).filter(c => {
        const task = c.tasks as unknown as { task_section: string };
        return task?.task_section === 'main';
      }).length;
      const partnerDone = (mainCompletions || []).filter(c => {
        const task = c.tasks as unknown as { task_section: string };
        return task?.task_section === 'partner';
      }).length;

      const { data: mainTasks } = await supabase.from('tasks').select('id').eq('task_section', 'main').eq('is_active', true);
      const { data: partnerTasks } = await supabase.from('tasks').select('id').eq('task_section', 'partner').eq('is_active', true);

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
    const hasPending = withdrawals.some(w => w.status === 'pending');
    setPendingWithdrawal(hasPending);
  }

  const userPoints = user?.points || 0;
  const usdValue = userPoints * POINTS_TO_USD;
  const withdrawCount = user?.withdraw_count || 0;
  const minWithdrawUSD = withdrawCount === 0 ? config.first_withdraw_usd : config.second_withdraw_usd;
  const minWithdrawPoints = withdrawCount === 0 ? config.first_withdraw_points : Math.round(config.second_withdraw_usd / POINTS_TO_USD);

  function calculateNet(usdAmount: number) {
    const fee = config.withdraw_fee + (usdAmount * config.withdraw_fee_percent / 100);
    return usdAmount - fee;
  }

  const inputAmount = parseFloat(amount) || 0;
  const inputUSD = amount ? inputAmount * POINTS_TO_USD : 0;
  const fee = inputUSD ? config.withdraw_fee + (inputUSD * config.withdraw_fee_percent / 100) : 0;
  const netAmount = inputUSD ? inputUSD - fee : 0;

  const allRequirementsMet =
    requirements.dailyAdsWatched >= config.required_daily_ads &&
    requirements.activeReferrals >= config.required_active_referrals &&
    requirements.mainTasksCompleted &&
    requirements.partnerTasksCompleted;

  const hasMinPoints = userPoints >= minWithdrawPoints;
  const withinMax = inputUSD <= config.max_withdraw;
  const isValid = inputUSD >= minWithdrawUSD && netAmount > 0 && walletAddress.length > 10 && withinMax;

  async function handleWithdraw() {
    if (!user || !isValid || loading) return;
    haptic('light');
    setLoading(true);

    try {
      const pointsToDeduct = Math.round(inputAmount);
      const newWithdrawNumber = withdrawCount + 1;

      const { error: deductError } = await supabase.rpc('deduct_points', {
        user_uuid: user.id,
        amount: pointsToDeduct,
      });

      if (deductError) {
        throw new Error(deductError.message || 'Failed to deduct points');
      }

      const { error: withdrawError } = await supabase.from('withdrawals').insert({
        user_id: user.id,
        amount: netAmount,
        fee,
        net_amount: netAmount,
        currency: 'USDT',
        wallet_address: walletAddress,
        status: 'pending',
        withdraw_number: newWithdrawNumber,
      });

      if (withdrawError) {
        await supabase.rpc('add_points', { user_id: user.id, amount: pointsToDeduct });
        throw withdrawError;
      }

      await refreshWithdrawals();
      await refreshUser();

      setAmount('');
      setWalletAddress('');

      showSuccess('Withdrawal Requested', `Your withdrawal #${newWithdrawNumber} of ${netAmount.toFixed(4)} USDT is pending review. You will be notified within 24 hours.`);
      haptic('success');

      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Withdrawal Requested',
          message: `Your withdrawal #${newWithdrawNumber} of ${netAmount.toFixed(4)} USDT is pending review.`,
          type: 'info',
        });
      } catch (e) { console.error('Notification insert failed:', e); }

      // Notify user via bot
      try {
        const botUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`;
        await fetch(botUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'notify-withdraw-request-user',
            user_telegram_id: user.telegram_id,
            withdraw_data: {
              user_name: user.first_name || user.username || 'Unknown',
              withdraw_number: newWithdrawNumber,
              amount: netAmount,
              fee,
              net_amount: netAmount,
              currency: 'USDT',
              wallet_address: walletAddress,
            },
          }),
        });
      } catch (e) { console.error('Bot notification failed:', e); }

      // Notify admin + payment channel
      try {
        const botUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`;
        await fetch(botUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'notify-admin-withdraw',
            withdraw_data: {
              user_name: user.first_name || user.username || 'Unknown',
              user_telegram_id: user.telegram_id,
              withdraw_number: newWithdrawNumber,
              amount: netAmount,
              fee,
              net_amount: netAmount,
              currency: 'USDT',
              wallet_address: walletAddress,
            },
          }),
        });
      } catch (e) { console.error('Admin bot notification failed:', e); }
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

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">💸</span> Withdraw
        </h1>
        <p className="text-purple-300 mt-2">Convert your points to USDT!</p>
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
              {withdrawCount === 0 ? `First withdraw: ${config.first_withdraw_points} pts ($${config.first_withdraw_usd})` : `Min: ${minWithdrawPoints} pts ($${minWithdrawUSD})`}
              {' • Max: $' + config.max_withdraw}
            </span>
          </div>
        </div>
      </div>

      {/* Requirements Card */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Lock className="text-gold-400" size={20} /> Withdraw Requirements
        </h3>
        <div className="space-y-3">
          <RequirementRow icon={<TrendingUp size={18} />} label={`Watch ${config.required_daily_ads} daily ads`} value={`${requirements.dailyAdsWatched}/${config.required_daily_ads}`} done={requirements.dailyAdsWatched >= config.required_daily_ads} />
          <RequirementRow icon={<Users size={18} />} label={`Get ${config.required_active_referrals} active referrals`} value={`${requirements.activeReferrals}/${config.required_active_referrals}`} done={requirements.activeReferrals >= config.required_active_referrals} />
          <RequirementRow icon={<Target size={18} />} label="Complete all main tasks" value={requirements.mainTasksCompleted ? 'Done' : 'Pending'} done={requirements.mainTasksCompleted} />
          <RequirementRow icon={<Target size={18} />} label="Complete all partner tasks" value={requirements.partnerTasksCompleted ? 'Done' : 'Pending'} done={requirements.partnerTasksCompleted} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs">Overall Progress</span>
            <span className="text-gold-400 text-xs font-bold">
              {[requirements.dailyAdsWatched >= config.required_daily_ads, requirements.activeReferrals >= config.required_active_referrals, requirements.mainTasksCompleted, requirements.partnerTasksCompleted].filter(Boolean).length}/4
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${([requirements.dailyAdsWatched >= config.required_daily_ads, requirements.activeReferrals >= config.required_active_referrals, requirements.mainTasksCompleted, requirements.partnerTasksCompleted].filter(Boolean).length / 4) * 100}%`,
              background: 'linear-gradient(90deg, #00c853, #fbbf24, #7c3aed)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }} />
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

      {/* Withdrawal Form */}
      {!pendingWithdrawal && allRequirementsMet && hasMinPoints && (
        <div className="glass-card p-4 mb-6 animate-fade-in" style={{ border: '1px solid rgba(0,200,83,0.3)' }}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Wallet className="text-neon-blue" size={20} /> Withdrawal Request
          </h3>
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">Points to Withdraw</label>
            <div className="relative">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter points"
                className="w-full py-3 px-4 rounded-xl bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                max={Math.min(userPoints, Math.round(config.max_withdraw / POINTS_TO_USD))} />
              <button onClick={() => setAmount(Math.min(userPoints, Math.round(config.max_withdraw / POINTS_TO_USD)).toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-400 text-sm font-semibold">MAX</button>
            </div>
            <p className="text-gray-500 text-xs mt-1">Min: {minWithdrawPoints} pts (${minWithdrawUSD}) • Max: {Math.round(config.max_withdraw / POINTS_TO_USD)} pts (${config.max_withdraw})</p>
          </div>
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">Currency</label>
            <div className="p-4 rounded-xl border-2 border-gold-400 bg-gold-400/10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full mb-2 flex items-center justify-center" style={{ background: '#26A17B' }}>
                <span className="text-white font-black text-sm">₮</span>
              </div>
              <p className="text-white font-semibold">USDT</p>
              <p className="text-gray-400 text-xs">BEP20</p>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">USDT BEP20 Wallet Address</label>
            <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="Enter your USDT BEP20 wallet address"
              className="w-full py-3 px-4 rounded-xl bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm" />
          </div>
          {inputUSD > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-white/5 space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="text-gray-400">USD Value</span><span className="text-white">${inputUSD.toFixed(4)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-400">Withdraw Fee (${config.withdraw_fee} + {config.withdraw_fee_percent}%)</span><span className="text-red-400">-${fee.toFixed(4)}</span></div>
              <div className="border-t border-white/10 pt-2 flex items-center justify-between"><span className="text-white font-semibold">Net (after fee)</span><span className="text-gold-400 font-bold">${netAmount.toFixed(4)}</span></div>
              <div className="text-center text-gray-500 text-xs">≈ {netAmount.toFixed(4)} USDT</div>
            </div>
          )}
          <button onClick={handleWithdraw} disabled={!isValid || loading} className={`btn-neon-gold w-full ${(!isValid || loading) ? 'opacity-50' : ''}`}>
            {loading ? 'Processing...' : 'Withdraw USDT BEP20'}
          </button>
        </div>
      )}

      {/* Cash Out button when requirements not met */}
      {!pendingWithdrawal && (!allRequirementsMet || !hasMinPoints) && (
        <div className="glass-card p-6 mb-6 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Lock className="text-gray-500 mx-auto mb-3" size={32} />
          <p className="text-gray-400 font-semibold mb-2">Withdrawal Locked</p>
          <p className="text-gray-500 text-sm">
            {!allRequirementsMet ? 'Complete all requirements above to unlock withdrawals.' : `You need at least ${minWithdrawPoints} points to withdraw.`}
          </p>
        </div>
      )}

      {/* History */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ArrowUpRight className="text-neon-purple" size={20} /> Withdrawal History
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${w.status === 'completed' ? 'bg-green-500/20' : w.status === 'rejected' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#26A17B' }}>
                    <span className="text-white font-black text-xs">₮</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">${w.amount.toFixed(4)} {w.currency}{w.withdraw_number && <span className="text-gray-500 text-xs ml-2">#{w.withdraw_number}</span>}</p>
                  <p className="text-gray-400 text-sm truncate max-w-[150px]">{w.wallet_address.slice(0, 8)}...{w.wallet_address.slice(-6)}</p>
                  {w.reject_reason && <p className="text-red-400 text-xs mt-1">Reason: {w.reject_reason}</p>}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">{statusIcons[w.status]}<span className={`text-sm ${statusColors[w.status]} capitalize`}>{w.status}</span></div>
                  <p className="text-gray-500 text-xs">{new Date(w.created_at).toLocaleDateString()}</p>
                </div>
                {w.tx_id && <a href={`https://bscscan.com/tx/${w.tx_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-400"><ExternalLink size={16} /></a>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment channel & mini app buttons */}
      <div className="mt-6 space-y-3">
        <button onClick={() => { haptic('light'); window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/braincashpayment') || window.open('https://t.me/braincashpayment', '_blank'); }}
          className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2">
          <ExternalLink size={18} /> View Payment Channel
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
      <div className="flex-1"><p className={`text-sm ${done ? 'text-green-400' : 'text-gray-300'}`}>{label}</p></div>
      <span className={`text-sm font-bold ${done ? 'text-green-400' : 'text-yellow-400'}`}>{value}</span>
    </div>
  );
}
