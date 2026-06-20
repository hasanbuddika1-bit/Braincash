import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import {
  User,
  Star,
  Trophy,
  TrendingUp,
  Gamepad2,
  Tv,
  CheckSquare,
  Users,
  DollarSign,
  Calendar,
  Clock,
  Shield,
  Copy,
  Check,
  Crown,
  Flame,
  Medal,
  Wallet,
} from 'lucide-react';

interface ProfileStats {
  gamesPlayed: number;
  adsWatched: number;
  tasksCompleted: number;
  referralCount: number;
  rank: number | null;
  dayStreak: number;
  joinDate: string;
  lastActive: string;
}

export function ProfileView() {
  const { user, tgUser, leaderboard, haptic } = useApp();
  const [stats, setStats] = useState<ProfileStats>({
    gamesPlayed: 0,
    adsWatched: 0,
    tasksCompleted: 0,
    referralCount: 0,
    rank: null,
    dayStreak: 0,
    joinDate: '',
    lastActive: '',
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const userRank = leaderboard.find((e) => e.user_id === user?.id);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  async function loadStats() {
    if (!user) return;
    setLoading(true);
    try {
      const [gamesRes, adsRes, tasksRes, referralsRes] = await Promise.all([
        supabase
          .from('game_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('ad_views')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('task_completions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', user.id),
      ]);

      setStats({
        gamesPlayed: gamesRes.count || 0,
        adsWatched: adsRes.count || 0,
        tasksCompleted: tasksRes.count || 0,
        referralCount: referralsRes.count || 0,
        rank: userRank?.rank || null,
        dayStreak: 0,
        joinDate: user.created_at,
        lastActive: user.last_active,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function copyReferral() {
    if (!user?.telegram_id) return;
    const referralLink = `https://t.me/Brain_cashbot/braincash?startapp=ref_${user.telegram_id}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    haptic('success');
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatRelative(iso: string) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Guest';
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const levelBadge = (() => {
    const earned = user?.total_earned || 0;
    if (earned >= 100000) return { label: 'Legend', color: 'from-yellow-400 to-orange-500', icon: '👑' };
    if (earned >= 50000) return { label: 'Diamond', color: 'from-cyan-400 to-blue-500', icon: '💎' };
    if (earned >= 20000) return { label: 'Gold', color: 'from-yellow-300 to-yellow-500', icon: '🥇' };
    if (earned >= 5000) return { label: 'Silver', color: 'from-gray-300 to-gray-400', icon: '🥈' };
    return { label: 'Bronze', color: 'from-amber-600 to-orange-500', icon: '🥉' };
  })();

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">👤</span>
          My Profile
        </h1>
        <p className="text-purple-300 mt-1 text-sm">Your Brain Cash identity</p>
      </div>

      {/* Avatar + Identity Card */}
      <div className="glass-card p-6 mb-5 relative overflow-hidden bg-gradient-to-br from-purple-900/60 to-blue-900/60">
        {/* Background glow orb */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, #bf00ff, transparent 70%)' }}
        />

        <div className="relative z-10 flex items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {tgUser?.photo_url ? (
              <img
                src={tgUser.photo_url}
                alt={fullName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/50 shadow-neon-purple"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-3xl font-bold text-white border-2 border-purple-500/50 shadow-neon-purple">
                {initials}
              </div>
            )}
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-purple-900 shadow-lg" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white truncate">{fullName}</h2>
              {user?.is_verified && (
                <Shield className="text-blue-400 flex-shrink-0" size={16} />
              )}
              {user?.is_admin && (
                <Crown className="text-gold-400 flex-shrink-0" size={16} />
              )}
            </div>

            {user?.username && (
              <p className="text-purple-300 text-sm">@{user.username}</p>
            )}

            {/* Level Badge */}
            <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-gradient-to-r ${levelBadge.color} text-purple-900 text-xs font-bold shadow-lg`}>
              <span>{levelBadge.icon}</span>
              <span>{levelBadge.label}</span>
            </div>
          </div>
        </div>

        {/* Telegram ID + Join Date */}
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 px-3 py-2.5">
            <p className="text-gray-500 text-xs mb-0.5">Telegram ID</p>
            <p className="text-white font-mono text-sm font-semibold">
              {user?.telegram_id === 0 ? 'Guest' : `#${user?.telegram_id}`}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2.5">
            <p className="text-gray-500 text-xs mb-0.5">Member Since</p>
            <p className="text-white text-sm font-semibold">{formatDate(stats.joinDate)}</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="relative z-10 mt-3">
          <p className="text-gray-500 text-xs mb-1.5">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 py-2.5 px-3 rounded-xl bg-black/30 font-mono text-xs text-green-400 truncate border border-green-500/30">
              {user?.telegram_id ? `https://t.me/Brain_cashbot/braincash?startapp=ref_${user.telegram_id}` : 'Connect Telegram to get link'}
            </div>
            <button
              onClick={copyReferral}
              disabled={!user?.telegram_id}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${copied ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-br from-green-600 to-green-brand text-white hover:from-green-500 hover:to-green-400'}`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Balance & Rank Row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="glass-card p-4 text-center bg-gradient-to-br from-gold-500/20 to-gold-600/20 border-gold-500/30">
          <div className="text-3xl mb-1">💰</div>
          <p className="text-2xl font-bold text-gold-400">{(user?.points || 0).toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-0.5">Current Points</p>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-purple-600/20 to-blue-600/20">
          <div className="flex justify-center mb-1">
            <Crown className="text-gold-400" size={28} />
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.rank ? `#${stats.rank}` : '—'}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">Global Rank</p>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="glass-card p-4 mb-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="text-green-400" size={18} />
          Earnings Summary
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-xl font-bold text-white">{(user?.total_earned || 0).toLocaleString()}</p>
            <p className="text-gray-500 text-xs mt-0.5">Total Earned</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-xl font-bold text-white">${(user?.total_withdrawn || 0).toFixed(2)}</p>
            <p className="text-gray-500 text-xs mt-0.5">Withdrawn</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-xl font-bold text-white">${((user?.points || 0) * 0.0001).toFixed(2)}</p>
            <p className="text-gray-500 text-xs mt-0.5">Claimable</p>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="glass-card p-4 mb-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Star className="text-purple-400" size={18} />
          Activity Stats
        </h3>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="loader w-8 h-8" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatRow icon={<Gamepad2 className="text-blue-400" size={18} />} label="Games Played" value={stats.gamesPlayed} />
            <StatRow icon={<Tv className="text-purple-400" size={18} />} label="Ads Watched" value={stats.adsWatched} />
            <StatRow icon={<CheckSquare className="text-green-400" size={18} />} label="Tasks Done" value={stats.tasksCompleted} />
            <StatRow icon={<Users className="text-gold-400" size={18} />} label="Referrals" value={stats.referralCount} />
          </div>
        )}
      </div>

      {/* Account Details */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <User className="text-blue-400" size={18} />
          Account Details
        </h3>

        <div className="space-y-3">
          <DetailRow
            icon={<Calendar className="text-purple-400" size={16} />}
            label="Joined"
            value={formatDate(stats.joinDate)}
          />
          <DetailRow
            icon={<Clock className="text-blue-400" size={16} />}
            label="Last Active"
            value={formatRelative(stats.lastActive)}
          />
          <DetailRow
            icon={<Shield className="text-green-400" size={16} />}
            label="Account Status"
            value={
              user?.is_banned
                ? 'Banned'
                : user?.is_verified
                ? 'Verified'
                : 'Active'
            }
            valueClass={
              user?.is_banned
                ? 'text-red-400'
                : user?.is_verified
                ? 'text-green-400'
                : 'text-blue-400'
            }
          />
          <DetailRow
            icon={<Medal className="text-gold-400" size={16} />}
            label="Level"
            value={`${levelBadge.icon} ${levelBadge.label}`}
          />
          <DetailRow
            icon={<Wallet className="text-purple-400" size={16} />}
            label="Points Value"
            value={`$${((user?.points || 0) * 0.0001).toFixed(4)} USDT`}
            valueClass="text-gold-400 font-bold"
          />
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-white font-bold text-lg leading-none">{value.toLocaleString()}</p>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueClass = 'text-white',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-7 flex-shrink-0">{icon}</div>
      <p className="flex-1 text-gray-400 text-sm">{label}</p>
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
