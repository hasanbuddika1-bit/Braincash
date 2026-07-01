import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { Gift, Users, TrendingUp, Copy, Check, Share2, Crown, Target, Tv, Percent, AlertTriangle, Trophy, Zap, ExternalLink, Award } from 'lucide-react';
import type { Referral, User } from '../../types';

const REFERRAL_BONUSES = {
  JOIN: 20,
  TASK: 40,
  AD_10: 70,
  LIFETIME_PERCENT: 5,
};

const REFERRAL_CHALLENGE_TIERS = [
  { activeRefs: 3, reward: 50 },
  { activeRefs: 5, reward: 75 },
  { activeRefs: 10, reward: 150 },
  { activeRefs: 50, reward: 500 },
  { activeRefs: 100, reward: 1500 },
];

export function ReferralsView() {
  const { user, haptic } = useApp();
  const { success: showSuccess } = useToast();
  const [referrals, setReferrals] = useState<(Referral & { referred?: User })[]>([]);
  const [copied, setCopied] = useState(false);
  const [totalCommission, setTotalCommission] = useState(0);
  const [activeRefCount, setActiveRefCount] = useState(0);
  const [stats, setStats] = useState({
    joinBonusPaid: 0,
    taskBonusPaid: 0,
    adBonusPaid: 0,
    commissionEarned: 0,
  });
  const [claimedTiers, setClaimedTiers] = useState<number[]>([]);
  const [topEarners, setTopEarners] = useState<{ user_id: string; username?: string; first_name?: string; total_earned: number }[]>([]);

  useEffect(() => {
    if (user) {
      loadReferrals();
      loadTopEarners();
      loadClaimedTiers();
    }
  }, [user]);

  async function loadReferrals() {
    if (!user) return;
    try {
      const { data: refs, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (refs && refs.length > 0) {
        const referredIds = refs.map((r) => r.referred_id);
        const { data: referredUsers } = await supabase
          .from('users')
          .select('*')
          .in('id', referredIds);
        const combined = refs.map((ref) => ({
          ...ref,
          referred: referredUsers?.find((u) => u.id === ref.referred_id),
        }));
        setReferrals(combined);

        const totalComm = refs.reduce((sum, r) => sum + (r.total_commission || 0), 0);
        const joinPaid = refs.reduce((sum, r) => sum + (r.join_bonus || 0), 0);
        const taskPaid = refs.reduce((sum, r) => sum + (r.task_bonus || 0), 0);
        const adPaid = refs.reduce((sum, r) => sum + (r.ad_bonus_paid || 0), 0);

        setTotalCommission(totalComm);
        setStats({
          joinBonusPaid: joinPaid,
          taskBonusPaid: taskPaid,
          adBonusPaid: adPaid,
          commissionEarned: totalComm - joinPaid - taskPaid - adPaid,
        });

        // Count active referrals (ad count >= 10 and task completed)
        const active = refs.filter(r =>
          (r.referred_ad_count || 0) >= 10 && (r.referred_task_count || 0) > 0
        ).length;
        setActiveRefCount(active);
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
    }
  }

  async function loadTopEarners() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id as user_id, username, first_name, total_earned')
        .eq('is_banned', false)
        .order('total_earned', { ascending: false })
        .limit(10);
      if (error) throw error;
      setTopEarners(data || []);
    } catch (err) {
      console.error('Error loading top earners:', err);
    }
  }

  async function loadClaimedTiers() {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('referral_challenge_claims')
        .select('tier')
        .eq('user_id', user.id);
      setClaimedTiers((data || []).map(c => c.tier));
    } catch {}
  }

  const copyReferralCode = () => {
    if (!user) return;
    haptic('light');
    const link = `https://t.me/braincash_bot/app?startapp=ref_${user.referral_code}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    showSuccess('Copied!', 'Referral link copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = () => {
    if (!user) return;
    haptic('light');
    const link = `https://t.me/braincash_bot/app?startapp=ref_${user.referral_code}`;
    const shareText = `🧠💰 Join Brain Cash - Play games, complete tasks, and earn real crypto! Use my referral link to get bonus points:`;

    if (window.Telegram?.WebApp) {
      // Use Telegram's share via openTelegramLink
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      if (navigator.share) {
        navigator.share({ title: 'Brain Cash', text: shareText, url: link });
      } else {
        navigator.clipboard?.writeText(`${shareText} ${link}`);
        showSuccess('Copied!', 'Share text copied to clipboard.');
      }
    }
  };

  async function claimReferralChallenge(tier: typeof REFERRAL_CHALLENGE_TIERS[0]) {
    if (!user || claimedTiers.includes(tier.activeRefs) || activeRefCount < tier.activeRefs) return;
    haptic('light');
    try {
      await supabase.from('referral_challenge_claims').insert({
        user_id: user.id,
        tier: tier.activeRefs,
      });
      const { error } = await supabase.rpc('add_points', { user_id: user.id, amount: tier.reward });
      if (error) {
        await supabase.from('users').update({ points: user.points + tier.reward, total_earned: user.total_earned + tier.reward }).eq('id', user.id);
      }
      setClaimedTiers([...claimedTiers, tier.activeRefs]);
      showSuccess(`+${tier.reward} Points!`, `Referral challenge (${tier.activeRefs} active refs) claimed!`);
      haptic('success');
    } catch (err) {
      console.error('Error claiming referral challenge:', err);
    }
  }

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">👥</span>
          Referrals
        </h1>
        <p className="text-green-400 mt-2">Invite friends and earn lifetime commission!</p>
      </div>

      {/* Referral Code Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.15) 0%, rgba(124,58,237,0.1) 100%)' }}>
        <div className="absolute top-0 right-0 text-8xl opacity-10 transform translate-x-4 -translate-y-4">🎁</div>
        <div className="relative z-10">
          <p className="text-gray-400 text-sm mb-2">Your Referral Code</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 p-3 rounded-xl bg-white/10 border-2 border-dashed border-white/20">
              <p className="text-2xl font-black text-gold-400 text-center font-['Orbitron']">{user?.referral_code || 'BCXXXXXX'}</p>
            </div>
            <button onClick={copyReferralCode} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all">
              {copied ? <Check className="text-green-400" size={24} /> : <Copy className="text-white" size={24} />}
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={shareReferralLink} className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }}>
              <Share2 size={18} /> Share Invite Link
            </button>
            <button onClick={() => {
              haptic('light');
              window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/braincash_bot/app') || window.open('https://t.me/braincash_bot/app', '_blank');
            }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-gold-500 text-white font-bold flex items-center justify-center gap-2">
              <Zap size={18} /> Open Brain Cash
            </button>
          </div>
        </div>
      </div>

      {/* Reward Structure */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Gift className="text-gold-400" size={20} />
          Reward Structure
        </h3>
        <div className="space-y-3">
          <RewardRow icon="🎉" label="Friend joins" reward={`+${REFERRAL_BONUSES.JOIN} pts`} />
          <RewardRow icon="📋" label="Friend completes main tasks" reward={`+${REFERRAL_BONUSES.TASK} pts`} />
          <RewardRow icon="📺" label="Friend watches 10 ads" reward={`+${REFERRAL_BONUSES.AD_10} pts`} />
          <RewardRow icon="♾️" label="Lifetime commission" reward={`${REFERRAL_BONUSES.LIFETIME_PERCENT}%`} />
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-white font-bold">Total per active referral</span>
            <span className="text-gold-400 font-black">+{REFERRAL_BONUSES.JOIN + REFERRAL_BONUSES.TASK + REFERRAL_BONUSES.AD_10} pts</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <Users className="text-neon-blue mx-auto mb-2" size={24} />
          <p className="text-2xl font-bold text-white">{referrals.length}</p>
          <p className="text-gray-400 text-xs">Total Referrals</p>
        </div>
        <div className="glass-card p-4 text-center">
          <TrendingUp className="text-neon-green mx-auto mb-2" size={24} />
          <p className="text-2xl font-bold text-white">{activeRefCount}</p>
          <p className="text-gray-400 text-xs">Active Referrals</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Percent className="text-gold-400 mx-auto mb-2" size={24} />
          <p className="text-2xl font-bold text-gold-400">{totalCommission}</p>
          <p className="text-gray-400 text-xs">Total Commission</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Gift className="text-neon-purple mx-auto mb-2" size={24} />
          <p className="text-2xl font-bold text-white">{stats.joinBonusPaid + stats.taskBonusPaid + stats.adBonusPaid}</p>
          <p className="text-gray-400 text-xs">Bonus Points Earned</p>
        </div>
      </div>

      {/* Referral Challenges (lifetime, never reset) */}
      <div className="glass-card p-4 mb-6" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(0,200,83,0.1) 100%)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="text-gold-400" size={24} />
          <div>
            <p className="text-white font-bold">Referral Challenges</p>
            <p className="text-gray-400 text-sm">Lifetime rewards - never reset!</p>
          </div>
        </div>

        <div className="space-y-3">
          {REFERRAL_CHALLENGE_TIERS.map((tier) => {
            const reached = activeRefCount >= tier.activeRefs;
            const claimed = claimedTiers.includes(tier.activeRefs);
            return (
              <div key={tier.activeRefs} className={`p-3 rounded-xl border-2 transition-all ${
                claimed ? 'bg-green-500/10 border-green-500/30' :
                reached ? 'bg-gold-400/10 border-gold-400/50' :
                'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className={claimed ? 'text-green-400' : reached ? 'text-gold-400' : 'text-gray-500'} size={18} />
                    <span className="text-white font-bold text-sm">{tier.activeRefs} Active Referrals</span>
                  </div>
                  <span className="text-gold-400 font-bold">+{tier.reward} pts</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${Math.min((activeRefCount / tier.activeRefs) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #fbbf24, #00c853)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s linear infinite',
                  }} />
                </div>
                {claimed ? (
                  <p className="text-green-400 text-xs text-center flex items-center justify-center gap-1">
                    <Check size={14} /> Claimed
                  </p>
                ) : reached ? (
                  <button onClick={() => claimReferralChallenge(tier)} className="w-full py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-gold-500 text-white text-xs font-bold">
                    Claim +{tier.reward} pts
                  </button>
                ) : (
                  <p className="text-gray-500 text-xs text-center">{tier.activeRefs - activeRefCount} more active referrals needed</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Earners */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Crown className="text-gold-400" size={20} />
          Top Earners
        </h3>
        <div className="space-y-2">
          {topEarners.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No data yet</p>
          ) : (
            topEarners.map((earner, i) => (
              <div key={earner.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  i === 0 ? 'bg-gold-400 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-orange-400 text-black' : 'bg-white/10 text-white'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{earner.first_name || earner.username || 'Anonymous'}</p>
                </div>
                <div className="text-right">
                  <p className="text-gold-400 font-bold text-sm">{earner.total_earned.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">pts</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Referral History */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users className="text-neon-blue" size={20} />
          Referral History
        </h3>

        {referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 opacity-50">👥</div>
            <p className="text-gray-400">No referrals yet</p>
            <p className="text-gray-500 text-sm mt-1">Share your link to start earning!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref) => {
              const status = (ref.referred_ad_count || 0) >= 10 && (ref.referred_task_count || 0) > 0 ? 'active' :
                (ref.referred_task_count || 0) > 0 ? 'intermediate' : 'pending';
              const statusColors: Record<string, string> = {
                pending: 'text-yellow-400 bg-yellow-500/20',
                intermediate: 'text-blue-400 bg-blue-500/20',
                active: 'text-green-400 bg-green-500/20',
              };
              const statusLabels: Record<string, string> = {
                pending: 'Pending',
                intermediate: 'Intermediate',
                active: 'Active',
              };
              return (
                <div key={ref.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {(ref.referred?.first_name?.[0] || ref.referred?.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{ref.referred?.first_name || ref.referred?.username || 'Anonymous'}</p>
                    <p className="text-gray-400 text-xs">
                      Commission: <span className="text-gold-400">{ref.total_commission || 0} pts</span>
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status]}`}>
                    {statusLabels[status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Open Brain Cash button */}
      <div className="mt-6">
        <button onClick={() => {
          haptic('light');
          if (user) {
            const link = `https://t.me/braincash_bot/app?startapp=ref_${user.referral_code}`;
            window.Telegram?.WebApp?.openTelegramLink?.(link) || window.open(link, '_blank');
          }
        }} className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-gold-500 text-white font-bold flex items-center justify-center gap-2">
          <Zap size={18} /> Open Brain Cash (Your Referral Link)
        </button>
      </div>
    </div>
  );
}

function RewardRow({ icon, label, reward }: { icon: string; label: string; reward: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">{icon}</div>
      <p className="flex-1 text-gray-300 text-sm">{label}</p>
      <span className="text-gold-400 font-bold">{reward}</span>
    </div>
  );
}
