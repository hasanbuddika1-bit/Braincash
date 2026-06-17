import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import {
  Trophy,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Users,
  Clock,
  Filter,
  ChevronDown,
} from 'lucide-react';

type HistoryType = 'all' | 'ads' | 'games' | 'tasks' | 'referrals' | 'withdrawals';

interface HistoryItem {
  id: string;
  type: 'ad' | 'game' | 'task' | 'referral' | 'withdrawal' | 'deposit';
  title: string;
  amount: number;
  timestamp: string;
  status?: string;
  icon: string;
}

export function HistoryView() {
  const { user } = useApp();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryType>('all');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, filter]);

  async function loadHistory() {
    if (!user) return;

    setLoading(true);
    try {
      const items: HistoryItem[] = [];

      // Load ad views
      if (filter === 'all' || filter === 'ads') {
        const { data: ads } = await supabase
          .from('ad_views')
          .select('*')
          .eq('user_id', user.id)
          .order('viewed_at', { ascending: false })
          .limit(50);

        ads?.forEach((ad) => {
          items.push({
            id: ad.id,
            type: 'ad',
            title: `Watched ${ad.ad_provider} ${ad.ad_type} ad`,
            amount: ad.reward,
            timestamp: ad.viewed_at,
            icon: '📺',
          });
        });
      }

      // Load game sessions
      if (filter === 'all' || filter === 'games') {
        const { data: games } = await supabase
          .from('game_sessions')
          .select('*, games(name, icon)')
          .eq('user_id', user.id)
          .order('played_at', { ascending: false })
          .limit(50);

        games?.forEach((game) => {
          items.push({
            id: game.id,
            type: 'game',
            title: `Played ${game.games?.name || 'Game'}`,
            amount: game.reward,
            timestamp: game.played_at,
            icon: game.games?.icon || '🎮',
          });
        });
      }

      // Load task completions
      if (filter === 'all' || filter === 'tasks') {
        const { data: tasks } = await supabase
          .from('task_completions')
          .select('*, tasks(title, task_type)')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(50);

        tasks?.forEach((task) => {
          items.push({
            id: task.id,
            type: 'task',
            title: task.tasks?.title || 'Task completed',
            amount: task.tasks?.reward_points || 0,
            timestamp: task.completed_at,
            icon: '📋',
          });
        });
      }

      // Load referrals
      if (filter === 'all' || filter === 'referrals') {
        const { data: referrals } = await supabase
          .from('referrals')
          .select('*, users!referred_id(first_name, username)')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        referrals?.forEach((ref) => {
          const referredUser = ref.users as { first_name?: string; username?: string };
          if (ref.join_bonus > 0) {
            items.push({
              id: `${ref.id}-join`,
              type: 'referral',
              title: `Referral join: ${referredUser?.first_name || referredUser?.username || 'User'}`,
              amount: ref.join_bonus,
              timestamp: ref.created_at,
              icon: '👥',
            });
          }
          if (ref.task_bonus > 0) {
            items.push({
              id: `${ref.id}-task`,
              type: 'referral',
              title: `Referral bonus: ${referredUser?.first_name || referredUser?.username || 'User'}`,
              amount: ref.task_bonus,
              timestamp: ref.created_at,
              icon: '👥',
            });
          }
        });
      }

      // Load withdrawals
      if (filter === 'all' || filter === 'withdrawals') {
        const { data: withdrawals } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        withdrawals?.forEach((w) => {
          items.push({
            id: w.id,
            type: 'withdrawal',
            title: `Withdrawal to ${w.currency}`,
            amount: -w.amount,
            timestamp: w.created_at,
            status: w.status,
            icon: w.currency === 'USDT' ? '💎' : '🚀',
          });
        });
      }

      // Sort by timestamp
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setHistory(items);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }

  const filterOptions: { value: HistoryType; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: '📊' },
    { value: 'ads', label: 'Ads', icon: '📺' },
    { value: 'games', label: 'Games', icon: '🎮' },
    { value: 'tasks', label: 'Tasks', icon: '📋' },
    { value: 'referrals', label: 'Referrals', icon: '👥' },
    { value: 'withdrawals', label: 'Withdrawals', icon: '💸' },
  ];

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
            <span className="text-4xl">📜</span>
            History
          </h1>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="glass-card px-3 py-2 flex items-center gap-2"
          >
            <Filter size={16} className="text-gray-400" />
            <span className="text-white text-sm">Filter</span>
            <ChevronDown className={`text-gray-400 transition-transform ${showFilter ? 'rotate-180' : ''}`} size={16} />
          </button>
        </div>

        {/* Filter dropdown */}
        {showFilter && (
          <div className="glass-card mt-3 p-2 grid grid-cols-3 gap-2 animate-slide-down">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setFilter(option.value);
                  setShowFilter(false);
                }}
                className={`p-2 rounded-xl text-center transition-all ${
                  filter === option.value
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{option.icon}</span>
                <p className="text-xs mt-1">{option.label}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-card bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
          <ArrowDownLeft className="text-green-400 w-6 h-6 mx-auto mb-2" />
          <p className="stat-value text-lg">
            +{history.filter(h => h.amount > 0).reduce((sum, h) => sum + h.amount, 0).toLocaleString()}
          </p>
          <p className="text-gray-400 text-xs mt-1">Total Earned</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-500/30">
          <ArrowUpRight className="text-red-400 w-6 h-6 mx-auto mb-2" />
          <p className="stat-value text-lg">
            {Math.abs(history.filter(h => h.amount < 0).reduce((sum, h) => sum + h.amount, 0)).toFixed(2)}
          </p>
          <p className="text-gray-400 text-xs mt-1">Total Withdrawn ($)</p>
        </div>
      </div>

      {/* History List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="loader" />
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="text-5xl mb-3 opacity-50">📜</div>
          <p className="text-gray-400">No history yet</p>
          <p className="text-gray-500 text-sm mt-1">Start earning to see your activity here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="glass-card p-4 flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                item.amount > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {item.icon}
              </div>

              <div className="flex-1">
                <p className="text-white font-semibold">{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="text-gray-500" size={12} />
                  <span className="text-gray-500 text-xs">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className={`font-bold ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.amount > 0 ? '+' : ''}{item.amount > 0 ? item.amount : item.amount.toFixed(2)}
                  {item.amount > 0 ? ' pts' : ''}
                </p>
                {item.status && (
                  <span className={`text-xs ${
                    item.status === 'completed' ? 'text-green-400' :
                    item.status === 'pending' ? 'text-yellow-400' :
                    item.status === 'rejected' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {item.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
