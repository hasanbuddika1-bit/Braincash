import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { Gift, Users, TrendingUp, Copy, Check, Share2, Crown, Target, Tv, Percent } from 'lucide-react';
import type { Referral, User } from '../../types';

export function ReferralsView() {
  const { user, haptic } = useApp();
  const { success: showSuccess } = useToast();
  const [referrals, setReferrals] = useState<(Referral & { referred?: User })[]>([]);
  const [copied, setCopied] = useState(false);
  const [totalCommission, setTotalCommission] = useState(0);
  const [stats, setStats] = useState({
    joinBonusPaid: 0,
    taskBonusPaid: 0,
    adBonusPaid: 0,
    commissionEarned: 0,
  });

  useEffect(() => {
    if (user) {
      loadReferrals();
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

      // Get referred user details
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

        // Calculate stats
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
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
    }
  }

  const copyReferralCode = () => {
    if (!user) return;

    const referralLink = `https://t.me/Brain_cashbot/braincash?startapp=ref_${user.telegram_id}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    showSuccess('Copied!', 'Referral link copied to clipboard.');
    haptic('success');

    setTimeout(() => setCopied(false), 2000);
  };

  const referralLink = user
    ? `https://t.me/Brain_cashbot/braincash?startapp=ref_${user.telegram_id}`
    : '';

  const shareReferral = () => {
    if (!user) return;

    haptic('light');

    const shareUrl = `https://t.me/Brain_cashbot/braincash?startapp=ref_${user.telegram_id}`;
    const shareText = `🧠 Join Brain Cash and start earning!\n\nUse my referral link and get 50 points instantly! 💰`;

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.switchInlineQuery(shareText, ['users', 'groups', 'channels']);
    } else {
      navigator.share?.({
        title: 'Brain Cash',
        text: shareText,
        url: shareUrl,
      }) || copyReferralCode();
    }
  };

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">👥</span>
          Referrals
        </h1>
        <p className="text-green-400 mt-2">Invite friends and earn lifetime rewards!</p>
      </div>

      {/* Referral Link Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.15) 0%, rgba(124,58,237,0.1) 100%)' }}>
        <div className="absolute top-0 right-0 text-8xl opacity-10 transform translate-x-8 -translate-y-8">
          🎁
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="text-gold-400" size={20} />
            <h2 className="text-white font-semibold">Your Referral Link</h2>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 py-3 px-4 rounded-xl bg-black/30 font-mono text-xs text-gold-400 font-bold break-all border border-gold-500/30">
              {referralLink}
            </div>
            <button
              onClick={copyReferralCode}
              className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-green-brand hover:from-green-500 hover:to-green-400 transition-colors flex-shrink-0"
            >
              {copied ? (
                <Check className="text-white" size={24} />
              ) : (
                <Copy className="text-white" size={24} />
              )}
            </button>
          </div>

          <button onClick={shareReferral} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all" style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814' }}>
            <Share2 size={20} />
            Share Invite Link
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-4 text-center border border-blue-500/30">
          <Users className="text-blue-400 w-6 h-6 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{referrals.length}</p>
          <p className="text-gray-400 text-xs mt-1">Total Referrals</p>
        </div>
        <div className="glass-card p-4 text-center border border-green-500/30">
          <TrendingUp className="text-green-400 w-6 h-6 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-400">{totalCommission}</p>
          <p className="text-gray-400 text-xs mt-1">Total Earned (pts)</p>
        </div>
      </div>

      {/* Rewards Structure */}
      <div className="glass-card p-4 mb-6 border border-gold-500/30" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, transparent 100%)' }}>
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Gift className="text-gold-400" size={20} />
          Referral Rewards Structure
        </h3>
        <div className="space-y-3">
          {/* Join Bonus */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <p className="text-white font-semibold">Join Bonus</p>
                <p className="text-gray-400 text-sm">When friend joins via your link</p>
              </div>
            </div>
            <p className="text-green-400 font-bold text-lg">+50 pts</p>
          </div>

          {/* Task Bonus */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Target className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-white font-semibold">Task Bonus</p>
                <p className="text-gray-400 text-sm">After friend completes main tasks</p>
              </div>
            </div>
            <p className="text-blue-400 font-bold text-lg">+50 pts</p>
          </div>

          {/* Ad Bonus */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Tv className="text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-white font-semibold">Ad Bonus</p>
                <p className="text-gray-400 text-sm">After friend watches 10 ads</p>
              </div>
            </div>
            <p className="text-purple-400 font-bold text-lg">+50 pts</p>
          </div>

          {/* Lifetime Commission */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gold-500/20 to-gold-400/10 border border-gold-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                <Percent className="text-gold-400" size={20} />
              </div>
              <div>
                <p className="text-white font-semibold">Lifetime Commission</p>
                <p className="text-gray-400 text-sm">On all friend's future earnings</p>
              </div>
            </div>
            <p className="text-gold-400 font-bold text-lg">10%</p>
          </div>
        </div>
      </div>

      {/* Your Earnings Breakdown */}
      {referrals.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">💰</span>
            Your Earnings Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-green-400 font-bold">{stats.joinBonusPaid}</p>
              <p className="text-gray-500 text-xs">Join Bonuses</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-blue-400 font-bold">{stats.taskBonusPaid}</p>
              <p className="text-gray-500 text-xs">Task Bonuses</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-purple-400 font-bold">{stats.adBonusPaid}</p>
              <p className="text-gray-500 text-xs">Ad Bonuses</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <p className="text-gold-400 font-bold">{stats.commissionEarned}</p>
              <p className="text-gray-500 text-xs">10% Commissions</p>
            </div>
          </div>
        </div>
      )}

      {/* Referral History */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">📜</span>
          Referral History
        </h3>

        {referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 opacity-50">👥</div>
            <p className="text-gray-400">No referrals yet</p>
            <p className="text-gray-500 text-sm">Share your link to invite friends!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-green-brand flex items-center justify-center text-xl text-white font-bold">
                  {ref.referred?.first_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {ref.referred?.first_name || 'Anonymous'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Joined {new Date(ref.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-green-400 font-bold">+{ref.total_commission || ref.join_bonus || 0}</p>
                  <p className="text-gray-500 text-xs">pts earned</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
