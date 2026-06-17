import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import {
  Users,
  DollarSign,
  TrendingUp,
  Gift,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Bell,
  RefreshCw,
} from 'lucide-react';
import type { Withdrawal, User, Task } from '../../types';

export function AdminView() {
  const { user, haptic } = useApp();
  const [tab, setTab] = useState<'stats' | 'users' | 'withdrawals' | 'tasks'>('stats');

  if (!user?.is_admin) {
    return (
      <div className="px-4 pb-24 pt-4 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400">You don't have admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">👑</span>
          Admin Panel
        </h1>
        <p className="text-purple-300 mt-2">Manage your Brain Cash app</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'stats', icon: <BarChart3 size={18} />, label: 'Stats' },
          { id: 'users', icon: <Users size={18} />, label: 'Users' },
          { id: 'withdrawals', icon: <DollarSign size={18} />, label: 'Withdrawals' },
          { id: 'tasks', icon: <Gift size={18} />, label: 'Tasks' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              haptic('light');
              setTab(t.id as typeof tab);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-white/10 text-gray-400'
            }`}
          >
            {t.icon}
            <span className="font-semibold">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'stats' && <AdminStats />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'withdrawals' && <AdminWithdrawals />}
      {tab === 'tasks' && <AdminTasks />}
    </div>
  );
}

function AdminStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalPoints: 0,
    totalWithdrawn: 0,
    pendingWithdrawals: 0,
    totalTasks: 0,
    todaySignups: 0,
  });
  const { haptic } = useApp();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('last_active', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { data: pointsData } = await supabase
        .from('users')
        .select('points, total_withdrawn');

      const totalPoints = pointsData?.reduce((sum, u) => sum + u.points, 0) || 0;
      const totalWithdrawn = pointsData?.reduce((sum, u) => sum + u.total_withdrawn, 0) || 0;

      const { count: pendingWithdrawals } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      const { count: todaySignups } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]);

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalPoints,
        totalWithdrawn,
        pendingWithdrawals: pendingWithdrawals || 0,
        totalTasks: totalTasks || 0,
        todaySignups: todaySignups || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="text-neon-blue" />}
          value={stats.totalUsers.toLocaleString()}
          label="Total Users"
        />
        <StatCard
          icon={<TrendingUp className="text-neon-green" />}
          value={stats.todaySignups.toLocaleString()}
          label="Today Signups"
        />
        <StatCard
          icon={<Gift className="text-neon-purple" />}
          value={stats.totalPoints.toLocaleString()}
          label="Total Points"
        />
        <StatCard
          icon={<DollarSign className="text-neon-gold" />}
          value={`$${(stats.totalWithdrawn).toFixed(2)}`}
          label="Total Withdrawn"
        />
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Pending Withdrawals</h3>
          <span className="badge">{stats.pendingWithdrawals}</span>
        </div>
        <button
          onClick={() => {
            haptic('light');
            loadStats();
          }}
          className="btn-neon w-full flex items-center justify-center gap-2"
        >
          <RefreshCw size={18} />
          Refresh Stats
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="stat-card">
      {icon}
      <p className="stat-value mt-2">{value}</p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { haptic } = useApp();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBan(userId: string, isBanned: boolean) {
    haptic('light');
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_banned: !isBanned })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_banned: !isBanned } : u)));
      haptic('success');
    } catch (error) {
      console.error('Error toggling ban:', error);
      haptic('error');
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
        className="w-full py-3 px-4 rounded-xl bg-white/10 text-white placeholder-gray-500 mb-4"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="loader" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className={`glass-card p-4 flex items-center gap-4 ${
                u.is_banned ? 'opacity-50' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl font-bold text-white">
                {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">{u.first_name || u.username || 'Anonymous'}</p>
                <p className="text-gray-400 text-sm">{u.points.toLocaleString()} pts</p>
              </div>
              <button
                onClick={() => toggleBan(u.id, u.is_banned)}
                className={`p-2 rounded-lg ${
                  u.is_banned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {u.is_banned ? <CheckCircle size={20} /> : <XCircle size={20} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<(Withdrawal & { user?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const { haptic } = useApp();

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function loadWithdrawals() {
    setLoading(true);
    try {
      const query = supabase
        .from('withdrawals')
        .select(`
          *,
          user:users!user_id (id, telegram_id, username, first_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected', txId?: string) {
    haptic('light');
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({
          status,
          tx_id: txId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      setWithdrawals(
        withdrawals.map((w) => (w.id === id ? { ...w, status, tx_id: txId } : w))
      );
      haptic('success');
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      haptic('error');
    }
  }

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f as typeof filter);
              loadWithdrawals();
            }}
            className={`px-4 py-2 rounded-xl capitalize ${
              filter === f ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'
            }`}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="loader" />
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => (
            <div key={w.id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{w.currency === 'USDT' ? '💎' : '🚀'}</span>
                  <span className="text-white font-bold">${w.amount.toFixed(2)}</span>
                </div>
                <span
                  className={`badge ${
                    w.status === 'pending'
                      ? 'bg-yellow-500/30 text-yellow-400'
                      : w.status === 'completed'
                      ? 'bg-green-500/30 text-green-400'
                      : 'bg-red-500/30 text-red-400'
                  }`}
                >
                  {w.status}
                </span>
              </div>

              <p className="text-gray-400 text-sm font-mono truncate">{w.wallet_address}</p>
              <p className="text-gray-500 text-xs">
                User: {w.user?.first_name || w.user?.username || 'Unknown'}
              </p>

              {w.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      const txId = prompt('Enter transaction ID');
                      if (txId) updateStatus(id, 'approved', txId);
                    }}
                    className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(w.id, 'rejected')}
                    className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 font-semibold"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { haptic } = useApp();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(taskId: string, isActive: boolean) {
    haptic('light');
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: !isActive })
        .eq('id', taskId);

      if (error) throw error;
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, is_active: !isActive } : t)));
      haptic('success');
    } catch (error) {
      console.error('Error toggling task:', error);
      haptic('error');
    }
  }

  const taskIcons: Record<string, string> = {
    channel: '📢',
    group: '👥',
    bot: '🤖',
    post: '📰',
    partner: '🤝',
  };

  return (
    <div>
      <button onClick={loadTasks} className="btn-neon mb-4 w-full">
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh Tasks
      </button>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="loader" />
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <div
              key={t.id}
              className={`glass-card p-4 flex items-center gap-4 ${
                !t.is_active ? 'opacity-50' : ''
              }`}
            >
              <div className="text-3xl">{taskIcons[t.task_type] || '📋'}</div>
              <div className="flex-1">
                <p className="text-white font-semibold">{t.title}</p>
                <p className="text-gray-400 text-sm">{t.is_partner ? 'Partner' : 'Main'} Task</p>
              </div>
              <div className="text-right">
                <p className="text-gold-400 font-bold">+{t.reward_points}</p>
                <button
                  onClick={() => toggleTask(t.id, t.is_active)}
                  className={`text-xs mt-1 ${
                    t.is_active ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {t.is_active ? 'Active' : 'Disabled'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
