import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { Crown, Trophy, Medal, TrendingUp, Users, Target, Flame } from 'lucide-react';
import type { LeaderboardEntry } from '../../types';

type Tab = 'earners' | 'referrers' | 'streak';

export function LeaderboardView() {
  const { user, leaderboard, userRank, haptic } = useApp();
  const [tab, setTab] = useState<Tab>('earners');
  const [referrers, setReferrers] = useState<{ user_id: string; username?: string; first_name?: string; ref_count: number }[]>([]);
  const [streaks, setStreaks] = useState<{ user_id: string; username?: string; first_name?: string; streak: number }[]>([]);
  const [myRefCount, setMyRefCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadReferrers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id as user_id, username, first_name')
        .eq('is_banned', false);
      const users = data || [];

      const { data: refData } = await supabase
        .from('referrals')
        .select('referrer_id');
      const counts: Record<string, number> = {};
      (refData || []).forEach((r: { referrer_id: string }) => {
        counts[r.referrer_id] = (counts[r.referrer_id] || 0) + 1;
      });

      const ranked = users
        .map(u => ({ ...u, ref_count: counts[u.user_id] || 0 }))
        .sort((a, b) => b.ref_count - a.ref_count)
        .slice(0, 50);
      setReferrers(ranked);
      setMyRefCount(counts[user?.id || ''] || 0);
    } catch (err) {
      console.error('Error loading referrers:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadStreaks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('daily_challenge_completions')
        .select('user_id')
        .order('created_at', { ascending: false })
        .limit(500);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: { user_id: string }) => {
        counts[r.user_id] = (counts[r.user_id] || 0) + 1;
      });

      const { data: users } = await supabase
        .from('users')
        .select('id as user_id, username, first_name')
        .eq('is_banned', false);
      const ranked = (users || [])
        .map(u => ({ ...u, streak: counts[u.user_id] || 0 }))
        .filter(u => u.streak > 0)
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 50);
      setStreaks(ranked);
    } catch (err) {
      console.error('Error loading streaks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'referrers') loadReferrers();
    else if (tab === 'streak') loadStreaks();
  }, [tab]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'earners', label: 'Top Earners', icon: <Trophy size={16} /> },
    { id: 'referrers', label: 'Top Referrers', icon: <Users size={16} /> },
    { id: 'streak', label: 'Daily Streaks', icon: <Flame size={16} /> },
  ];

  const rankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-400" size={20} />;
    if (rank === 2) return <Medal className="text-gray-300" size={20} />;
    if (rank === 3) return <Medal className="text-orange-400" size={20} />;
    return <span className="text-gray-400 font-bold text-sm">{rank}</span>;
  };

  const renderEarners = () => {
    const list = leaderboard.slice(0, 50);
    if (list.length === 0) return <EmptyState icon="🏆" text="No data yet" />;
    return (
      <div className="space-y-2">
        {list.map((entry, i) => {
          const isMe = entry.user_id === user?.id;
          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isMe
                  ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/40'
                  : i < 3
                  ? 'bg-white/8'
                  : 'bg-white/5'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                i === 0 ? 'bg-yellow-500/20' : i === 1 ? 'bg-gray-400/20' : i === 2 ? 'bg-orange-500/20' : 'bg-white/10'
              }`}>
                {rankBadge(i + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                  {entry.first_name || entry.username || 'Anonymous'} {isMe && '(You)'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gold-400 font-bold text-sm">{(entry.total_earned || 0).toLocaleString()}</p>
                <p className="text-gray-500 text-xs">pts</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderReferrers = () => {
    if (referrers.length === 0) return <EmptyState icon="👥" text="No referrals yet" />;
    return (
      <div className="space-y-2">
        {referrers.map((r, i) => {
          const isMe = r.user_id === user?.id;
          return (
            <div
              key={r.user_id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                isMe ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/40' : 'bg-white/5'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                i === 0 ? 'bg-yellow-500/20' : i === 1 ? 'bg-gray-400/20' : i === 2 ? 'bg-orange-500/20' : 'bg-white/10'
              }`}>
                {rankBadge(i + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                  {r.first_name || r.username || 'Anonymous'} {isMe && '(You)'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-400 font-bold text-sm">{r.ref_count}</p>
                <p className="text-gray-500 text-xs">refs</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStreaks = () => {
    if (streaks.length === 0) return <EmptyState icon="🔥" text="No streaks yet" />;
    return (
      <div className="space-y-2">
        {streaks.map((s, i) => {
          const isMe = s.user_id === user?.id;
          return (
            <div
              key={s.user_id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                isMe ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/40' : 'bg-white/5'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                i === 0 ? 'bg-yellow-500/20' : i === 1 ? 'bg-gray-400/20' : i === 2 ? 'bg-orange-500/20' : 'bg-white/10'
              }`}>
                {rankBadge(i + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                  {s.first_name || s.username || 'Anonymous'} {isMe && '(You)'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-orange-400 font-bold text-sm">{s.streak}</p>
                <p className="text-gray-500 text-xs">days</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">🏆</span>
          Leaderboard
        </h1>
        <p className="text-purple-300 mt-2">Compete with players worldwide!</p>
      </div>

      {/* My Rank Card */}
      <div className="glass-card p-5 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(124,58,237,0.08) 100%)' }}>
        <div className="absolute top-0 right-0 text-7xl opacity-10">👑</div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Your Ranking</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gold-400 font-['Orbitron']">#{userRank || '-'}</span>
              <span className="text-gray-500 text-sm">of {leaderboard.length}+ players</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-white">{(user?.total_earned || 0).toLocaleString()}</p>
            <p className="text-gray-500 text-xs">pts</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { haptic('light'); setTab(t.id); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
              tab === t.id
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium for earners */}
      {tab === 'earners' && leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-6">
          {/* 2nd */}
          <PodiumCard entry={leaderboard[1]} rank={2} height={100} />
          {/* 1st */}
          <PodiumCard entry={leaderboard[0]} rank={1} height={130} />
          {/* 3rd */}
          <PodiumCard entry={leaderboard[2]} rank={3} height={80} />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="loader" /></div>
      ) : (
        tab === 'earners' ? renderEarners() :
        tab === 'referrers' ? renderReferrers() :
        renderStreaks()
      )}
    </div>
  );
}

function PodiumCard({ entry, rank, height }: { entry: LeaderboardEntry; rank: number; height: number }) {
  const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
  const bgColors = ['rgba(255,215,0,0.15)', 'rgba(192,192,192,0.15)', 'rgba(205,127,50,0.15)'];
  const icons = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex flex-col items-center" style={{ width: '30%' }}>
      <div className="text-3xl mb-1">{icons[rank - 1]}</div>
      <p className="text-white font-bold text-xs text-center truncate w-full mb-1">
        {entry.first_name || entry.username || 'Anonymous'}
      </p>
      <p className="text-gold-400 font-bold text-sm mb-2">{(entry.total_earned || 0).toLocaleString()}</p>
      <div
        className="w-full rounded-t-xl flex items-center justify-center"
        style={{
          height,
          background: bgColors[rank - 1],
          borderTop: `3px solid ${colors[rank - 1]}`,
        }}
      >
        <span className="text-2xl font-black" style={{ color: colors[rank - 1] }}>{rank}</span>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-3 opacity-40">{icon}</div>
      <p className="text-gray-400">{text}</p>
    </div>
  );
}
