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
  AlertTriangle,
  Globe,
} from 'lucide-react';
import type { Withdrawal, User, Task } from '../../types';

const ADMIN_TELEGRAM_ID = 5419054691;

export function AdminView() {
  const { user, haptic } = useApp();
  const [tab, setTab] = useState<'stats' | 'users' | 'withdrawals' | 'tasks'>('stats');

  // Check admin by telegram ID
  const isAdmin = user?.is_admin || user?.telegram_id === ADMIN_TELEGRAM_ID;

  if (!isAdmin) {
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
    suspendedUsers: 0,
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

      const { count: suspendedUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_banned', true);

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
        suspendedUsers: suspendedUsers || 0,
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
          icon={<AlertTriangle className="text-red-400" />}
          value={stats.suspendedUsers.toLocaleString()}
          label="Suspended"
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
        <StatCard
          icon={<Clock className="text-yellow-400" />}
          value={stats.pendingWithdrawals.toString()}
          label="Pending Withdrawals"
        />
      </div>

      <div className="glass-card p-4">
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
  const [users, setUsers] = useState<(User & { ip_address?: string; suspended_at?: string })[]>([]);
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
        .limit(100);

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
        .update({
          is_banned: !isBanned,
          suspended_at: !isBanned ? new Date().toISOString() : null,
          suspension_reason: !isBanned ? 'Admin suspension' : null
        })
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
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.telegram_id?.toString().includes(search) ||
      u.ip_address?.includes(search)
  );

  // Group users by IP for duplicate detection
  const ipCounts: Record<string, number> = {};
  users.forEach((u) => {
    if (u.ip_address) {
      ipCounts[u.ip_address] = (ipCounts[u.ip_address] || 0) + 1;
    }
  });

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users, IPs, or Telegram ID..."
        className="w-full py-3 px-4 rounded-xl bg-white/10 text-white placeholder-gray-500 mb-4"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="loader" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => {
            const hasDuplicateIp = u.ip_address && ipCounts[u.ip_address] > 1;

            return (
              <div
                key={u.id}
                className={`glass-card p-4 ${
                  u.is_banned ? 'opacity-50 border-red-500/50' : ''
                } ${hasDuplicateIp && !u.is_banned ? 'border-yellow-500/50' : ''}`}
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl font-bold text-white">
                    {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{u.first_name || u.username || 'Anonymous'}</p>
                      {u.is_banned && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">BANNED</span>
                      )}
                      {hasDuplicateIp && !u.is_banned && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                          <AlertTriangle size={12} className="inline mr-1" />
                          DUP IP
                        </span>
                      )}
                    </div>
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

                {/* Additional info */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2 pt-2 border-t border-white/5">
                  <span>🆔 {u.telegram_id}</span>
                  {u.ip_address && (
                    <span className="flex items-center gap-1">
                      <Globe size={12} />
                      {u.ip_address}
                    </span>
                  )}
                  <span>📅 {new Date(u.created_at).toLocaleDateString()}</span>
                  <span>💰 ${(u.total_withdrawn || 0).toFixed(2)} withdrawn</span>
                </div>
              </div>
            );
          })}
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'main' | 'partner' | 'other'>('all');
  const { haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    task_type: 'channel' as Task['task_type'],
    task_section: 'main' as Task['task_section'],
    reward_points: 10,
    icon_emoji: '📋',
    is_partner: false,
    is_active: true,
  });

  const TASK_ICONS = ['📋', '📢', '👥', '🤖', '📰', '🤝', '🎁', '⭐', '🔥', '💰', '🎮', '📱', '💬', '✨', '🎯'];
  const TASK_TYPES = ['channel', 'group', 'bot', 'post', 'partner'];
  const TASK_SECTIONS = ['main', 'partner', 'other'];

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('task_section').order('created_at');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      link: '',
      task_type: 'channel',
      task_section: 'main',
      reward_points: 10,
      icon_emoji: '📋',
      is_partner: false,
      is_active: true,
    });
    setEditingTask(null);
    setShowForm(false);
  }

  function startEdit(task: Task) {
    haptic('light');
    setFormData({
      title: task.title,
      description: task.description || '',
      link: task.link || '',
      task_type: task.task_type,
      task_section: task.task_section,
      reward_points: task.reward_points,
      icon_emoji: task.icon_emoji || '📋',
      is_partner: task.is_partner,
      is_active: task.is_active,
    });
    setEditingTask(task);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) return;

    haptic('light');
    setLoading(true);

    try {
      if (editingTask) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTask.id);

        if (error) throw error;
        showSuccess('Task Updated', 'Task has been updated successfully.');
      } else {
        // Create new task
        const { error } = await supabase.from('tasks').insert({
          ...formData,
          verification_method: 'auto',
        });

        if (error) throw error;
        showSuccess('Task Created', 'New task has been added successfully.');
      }

      resetForm();
      await loadTasks();
      haptic('success');
    } catch (error) {
      console.error('Error saving task:', error);
      showError('Error', 'Failed to save task.');
      haptic('error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteTask(taskId: string) {
    haptic('light');
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;
      setTasks(tasks.filter((t) => t.id !== taskId));
      showSuccess('Task Deleted', 'Task has been removed.');
      haptic('success');
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('Error', 'Failed to delete task.');
      haptic('error');
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

  const filteredTasks = tasks.filter((t) => filter === 'all' || t.task_section === filter);

  const sectionColors: Record<string, string> = {
    main: 'bg-green-500/20 text-green-400',
    partner: 'bg-blue-500/20 text-blue-400',
    other: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div>
      {/* Add Task Button */}
      <button
        onClick={() => {
          haptic('light');
          resetForm();
          setShowForm(true);
        }}
        className="btn-neon-gold w-full mb-4"
      >
        + Add New Task
      </button>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['all', 'main', 'partner', 'other'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as typeof filter)}
            className={`px-4 py-2 rounded-xl capitalize whitespace-nowrap ${
              filter === s ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Task Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-white font-bold text-lg mb-4">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title"
                  className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm"
                />
              </div>

              {/* Link */}
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Link</label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://t.me/channel or https://..."
                  className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm"
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {TASK_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon_emoji: icon })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center ${
                        formData.icon_emoji === icon
                          ? 'bg-purple-600 border-2 border-purple-400'
                          : 'bg-white/10'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task Type & Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Type</label>
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData({ ...formData, task_type: e.target.value as Task['task_type'] })}
                    className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-gray-900">
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Section</label>
                  <select
                    value={formData.task_section}
                    onChange={(e) => setFormData({ ...formData, task_section: e.target.value as Task['task_section'], is_partner: e.target.value === 'partner' })}
                    className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm"
                  >
                    {TASK_SECTIONS.map((s) => (
                      <option key={s} value={s} className="bg-gray-900">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reward Points */}
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Reward Points</label>
                <input
                  type="number"
                  value={formData.reward_points}
                  onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) || 0 })}
                  min="1"
                  className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="is_active" className="text-white text-sm">
                  Task is active
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 btn-neon-gold">
                  {editingTask ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 rounded-lg bg-white/10 text-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="loader" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`glass-card p-4 ${!t.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{t.icon_emoji || '📋'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate">{t.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${sectionColors[t.task_section]}`}>
                      {t.task_section}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{t.task_type} task</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gold-400 font-bold">+{t.reward_points}</p>
                  <button
                    onClick={() => toggleTask(t.id, t.is_active)}
                    className={`text-xs ${t.is_active ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {t.is_active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => startEdit(t)}
                  className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
