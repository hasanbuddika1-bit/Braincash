import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { Gift, Users, TrendingUp, Copy, Check, Share2 } from 'lucide-react';
import type { Referral, User } from '../../types';

export function ReferralsView() {
  const { user, haptic } = useApp();
  const [referrals, setReferrals] = useState<(Referral & { referred?: User })[]>([]);
  const [copied, setCopied] = useState(false);
  const [totalCommission, setTotalCommission] = useState(0);
  const [joinBonusCount, setJoinBonusCount] = useState(0);
  const [taskBonusCount, setTaskBonusCount] = useState(0);

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
        const totalComm = refs.reduce((sum, r) => sum + r.total_commission, 0);
        const joinCount = refs.filter((r) => r.join_bonus > 0).length;
        const taskCount = refs.filter((r) => r.task_bonus > 0).length;

        setTotalCommission(totalComm);
        setJoinBonusCount(joinCount);
        setTaskBonusCount(taskCount);
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
    }
  }

  const copyReferralCode = () => {
    if (!user?.referral_code) return;

    const code = user.referral_code;
    navigator.clipboard.writeText(code);
    setCopied(true);
    haptic('success');

    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    if (!user?.referral_code) return;

    haptic('light');

    const shareUrl = `https://t.me/braincash_bot?start=ref_${user.referral_code}`;
    const shareText = `🧠 Join Brain Cash and start earning!\n\nUse my referral code: ${user.referral_code}\n\nYou'll get 50 points instantly when you join!`;

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
        <p className="text-purple-300 mt-2">Invite friends and earn lifetime rewards!</p>
      </div>

      {/* Referral Code Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 text-8xl opacity-10 transform translate-x-8 -translate-y-8">
          🎁
        </div>

        <div className="relative z-10">
          <h2 className="text-white font-semibold mb-2">Your Referral Code</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 py-3 px-4 rounded-xl bg-white/10 font-mono text-xl text-gold-400 font-bold">
              {user?.referral_code}
            </div>
            <button
              onClick={copyReferralCode}
              className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 transition-colors"
            >
              {copied ? (
                <Check className="text-green-400" size={24} />
              ) : (
                <Copy className="text-white" size={24} />
              )}
            </button>
          </div>

          <button onClick={shareReferral} className="btn-neon-gold w-full flex items-center justify-center gap-2">
            <Share2 size={20} />
            Share Invite Link
          </button>
        </div>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-card">
          <Users className="text-neon-blue w-6 h-6 mx-auto mb-2" />
          <p className="stat-value">{referrals.length}</p>
          <p className="text-gray-400 text-xs mt-1">Total Referrals</p>
        </div>
        <div className="stat-card">
          <TrendingUp className="text-neon-green w-6 h-6 mx-auto mb-2" />
          <p className="stat-value">{totalCommission}</p>
          <p className="text-gray-400 text-xs mt-1">Total Commission</p>
        </div>
      </div>

      {/* Rewards Info */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Gift className="text-neon-gold" size={20} />
          Referral Rewards
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <p className="text-white font-semibold">Join Bonus</p>
                <p className="text-gray-400 text-sm">When friend joins</p>
              </div>
            </div>
            <p className="text-gold-400 font-bold">+50 pts</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-xl">🏆</span>
              </div>
              <div>
                <p className="text-white font-semibold">Task Bonus</p>
                <p className="text-gray-400 text-sm">After friend completes tasks</p>
              </div>
            </div>
            <p className="text-gold-400 font-bold">+100 pts</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-xl">♾️</span>
              </div>
              <div>
                <p className="text-white font-semibold">Lifetime Commission</p>
                <p className="text-gray-400 text-sm">10% of friend's earnings</p>
              </div>
            </div>
            <p className="text-gold-400 font-bold">10%</p>
          </div>
        </div>
      </div>

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
            <p className="text-gray-500 text-sm">Share your code to invite friends!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
                  {ref.referred?.first_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">
                    {ref.referred?.first_name || 'Anonymous'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Joined {new Date(ref.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gold-400 font-bold">+{ref.join_bonus + ref.task_bonus}</p>
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
