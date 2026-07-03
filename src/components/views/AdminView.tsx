import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import {
  Users, DollarSign, TrendingUp, Gift, Settings, CheckCircle, XCircle, Clock,
  BarChart3, Bell, RefreshCw, AlertTriangle, Globe, Handshake, ExternalLink, Send, X, Tv, Save,
  Ban, UserCheck, Plus, Minus, Megaphone, Wrench, Trash2, History,
} from 'lucide-react';
import type { Withdrawal, User, Task, PartnerSubmission } from '../../types';

const ADMIN_TELEGRAM_ID = 5419054691;
const WITHDRAW_FEE = 0.01;
const WITHDRAW_FEE_PERCENT = 5;
const POINTS_TO_USD = 0.0001;

export function AdminView() {
  const { user, haptic } = useApp();
  const [tab, setTab] = useState<'stats' | 'users' | 'withdrawals' | 'tasks' | 'partner' | 'ads' | 'broadcast' | 'settings'>('stats');

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">👑</span>
          Admin Panel
        </h1>
        <p className="text-purple-300 mt-2">Manage your Brain Cash app</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'stats', icon: <BarChart3 size={18} />, label: 'Stats' },
          { id: 'users', icon: <Users size={18} />, label: 'Users' },
          { id: 'withdrawals', icon: <DollarSign size={18} />, label: 'Withdrawals' },
          { id: 'tasks', icon: <Gift size={18} />, label: 'Tasks' },
          { id: 'partner', icon: <Handshake size={18} />, label: 'Partner' },
          { id: 'ads', icon: <Tv size={18} />, label: 'Ads' },
          { id: 'broadcast', icon: <Megaphone size={18} />, label: 'Broadcast' },
          { id: 'settings', icon: <Wrench size={18} />, label: 'Settings' },
        ].map((t) => (
          <button key={t.id} onClick={() => { haptic('light'); setTab(t.id as typeof tab); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${tab === t.id ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white/10 text-gray-400'}`}>
            {t.icon}<span className="font-semibold">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'stats' && <AdminStats />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'withdrawals' && <AdminWithdrawals />}
      {tab === 'tasks' && <AdminTasks />}
      {tab === 'partner' && <AdminPartner />}
      {tab === 'ads' && <AdminAds />}
      {tab === 'broadcast' && <AdminBroadcast />}
      {tab === 'settings' && <AdminSettings />}
    </div>
  );
}

// ── AdminStats ──────────────────────────────────────────────────────────────

function AdminStats() {
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, suspendedUsers: 0, totalPoints: 0, totalWithdrawn: 0, pendingWithdrawals: 0, totalTasks: 0, todaySignups: 0 });
  const { haptic } = useApp();

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: activeUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).gt('last_active', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      const { count: suspendedUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_suspended', true);
      const { data: pointsData } = await supabase.from('users').select('points, total_withdrawn');
      const totalPoints = pointsData?.reduce((sum, u) => sum + u.points, 0) || 0;
      const totalWithdrawn = pointsData?.reduce((sum, u) => sum + u.total_withdrawn, 0) || 0;
      const { count: pendingWithdrawals } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: totalTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
      const { count: todaySignups } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]);
      setStats({ totalUsers: totalUsers || 0, activeUsers: activeUsers || 0, suspendedUsers: suspendedUsers || 0, totalPoints, totalWithdrawn, pendingWithdrawals: pendingWithdrawals || 0, totalTasks: totalTasks || 0, todaySignups: todaySignups || 0 });
    } catch (error) { console.error('Error loading stats:', error); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="text-neon-blue" />} value={stats.totalUsers.toLocaleString()} label="Total Users" />
        <StatCard icon={<TrendingUp className="text-neon-green" />} value={stats.todaySignups.toLocaleString()} label="Today Signups" />
        <StatCard icon={<AlertTriangle className="text-red-400" />} value={stats.suspendedUsers.toLocaleString()} label="Suspended" />
        <StatCard icon={<Gift className="text-neon-purple" />} value={stats.totalPoints.toLocaleString()} label="Total Points" />
        <StatCard icon={<DollarSign className="text-neon-gold" />} value={`$${stats.totalWithdrawn.toFixed(2)}`} label="Total Withdrawn" />
        <StatCard icon={<Clock className="text-yellow-400" />} value={stats.pendingWithdrawals.toString()} label="Pending Withdrawals" />
      </div>
      <button onClick={() => { haptic('light'); loadStats(); }} className="w-full py-3 bg-white/10 rounded-xl text-white font-semibold flex items-center justify-center gap-2">
        <RefreshCw size={18} /> Refresh Stats
      </button>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-gray-400 text-sm">{label}</span></div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// ── AdminUsers ──────────────────────────────────────────────────────────────

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const { haptic } = useApp();
  const { showSuccess, showError } = useToast();

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100);
    setUsers(data || []);
  }

  async function toggleBan(userId: string, currentBanned: boolean) {
    haptic('light');
    await supabase.from('users').update({ is_banned: !currentBanned, suspended_at: !currentBanned ? new Date().toISOString() : null }).eq('id', userId);
    loadUsers();
  }

  async function toggleSuspend(userId: string, currentSuspended: boolean, reason?: string) {
    haptic('light');
    await supabase.from('users').update({
      is_suspended: !currentSuspended,
      suspended_at: !currentSuspended ? new Date().toISOString() : null,
      suspension_reason: !currentSuspended ? (reason || 'Suspended by admin') : null,
    }).eq('id', userId);
    loadUsers();
  }

  async function adjustBalance(userId: string, amount: number, isRemoval: boolean) {
    haptic('light');
    const { data, error } = await supabase.rpc('admin_adjust_balance', { target_user_id: userId, amount, is_removal: isRemoval });
    if (error || !data?.success) { showError('Error', 'Failed to adjust balance'); return; }
    showSuccess(isRemoval ? 'Balance Removed' : 'Balance Added', `New balance: ${data.new_balance} pts`);
    setBalanceAmount('');
    loadUsers();
  }

  async function viewUserHistory(userId: string) {
    haptic('light');
    const [ads, games, tasks, refs, wds] = await Promise.all([
      supabase.from('ad_views').select('*').eq('user_id', userId).order('viewed_at', { ascending: false }).limit(20),
      supabase.from('game_sessions').select('*').eq('user_id', userId).order('played_at', { ascending: false }).limit(20),
      supabase.from('task_completions').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(20),
      supabase.from('referrals').select('*').eq('referrer_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);
    const items: any[] = [];
    (ads.data || []).forEach(a => items.push({ type: 'Ad', desc: `${a.ad_provider} (${a.ad_type})`, amount: a.reward, time: a.viewed_at }));
    (games.data || []).forEach(g => items.push({ type: 'Game', desc: `Score: ${g.score}`, amount: g.reward, time: g.played_at }));
    (tasks.data || []).forEach(t => items.push({ type: 'Task', desc: `Task: ${t.task_id}`, amount: 0, time: t.completed_at }));
    (refs.data || []).forEach(r => items.push({ type: 'Referral', desc: `Bonus: ${r.join_bonus || 0}`, amount: r.join_bonus || 0, time: r.created_at }));
    (wds.data || []).forEach(w => items.push({ type: 'Withdraw', desc: `${w.status} - $${w.amount}`, amount: -w.amount, time: w.created_at }));
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setUserHistory(items.slice(0, 50));
    setShowHistory(true);
  }

  const filtered = users.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.telegram_id?.toString().includes(search) ||
    u.ip_address?.includes(search)
  );

  const ipCounts: Record<string, number> = {};
  users.forEach(u => { if (u.ip_address) ipCounts[u.ip_address] = (ipCounts[u.ip_address] || 0) + 1; });

  return (
    <div className="space-y-4">
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, username, Telegram ID, or IP..."
        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500" />

      {showHistory && selectedUser && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">User History</h3>
              <button onClick={() => setShowHistory(false)}><X className="text-white" /></button>
            </div>
            <div className="space-y-2">
              {userHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <p className="text-white text-sm font-semibold">{h.type}</p>
                    <p className="text-gray-400 text-xs">{h.desc}</p>
                    <p className="text-gray-500 text-xs">{new Date(h.time).toLocaleString()}</p>
                  </div>
                  <p className={`font-bold ${h.amount > 0 ? 'text-green-400' : h.amount < 0 ? 'text-red-400' : 'text-gray-400'}`}>{h.amount > 0 ? '+' : ''}{h.amount}</p>
                </div>
              ))}
              {userHistory.length === 0 && <p className="text-gray-400 text-center py-4">No history found</p>}
            </div>
          </div>
        </div>
      )}

      {filtered.map(u => (
        <div key={u.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-white font-semibold">{u.first_name || u.username || 'Unknown'} {u.is_admin && '👑'}</p>
              <p className="text-gray-400 text-xs">ID: {u.telegram_id} • Points: {u.points}</p>
              <p className="text-gray-500 text-xs">IP: {u.ip_address || 'N/A'} {ipCounts[u.ip_address] > 1 && <span className="text-yellow-400 font-bold">DUP IP</span>}</p>
              {u.is_suspended && <p className="text-red-400 text-xs mt-1">SUSPENDED: {u.suspension_reason || 'No reason'}</p>}
            </div>
            <div className="flex flex-col gap-1">
              {u.is_suspended ? (
                <button onClick={() => toggleSuspend(u.id, true)} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <UserCheck size={14} /> Unsuspend
                </button>
              ) : (
                <button onClick={() => { const reason = prompt('Suspension reason:'); if (reason) toggleSuspend(u.id, false, reason); }} className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-semibold flex items-center gap-1">
                  <Ban size={14} /> Suspend
                </button>
              )}
              <button onClick={() => toggleBan(u.id, u.is_banned)} className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${u.is_banned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                <Ban size={14} /> {u.is_banned ? 'Unban' : 'Ban'}
              </button>
              <button onClick={() => { setSelectedUser(u); viewUserHistory(u.id); }} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold flex items-center gap-1">
                <History size={14} /> History
              </button>
            </div>
          </div>
          {selectedUser?.id === u.id && (
            <div className="flex gap-2 mt-2">
              <input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="Amount" className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm" />
              <button onClick={() => { const amt = parseInt(balanceAmount); if (amt > 0) adjustBalance(u.id, amt, false); }} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-semibold flex items-center gap-1"><Plus size={14} /> Add</button>
              <button onClick={() => { const amt = parseInt(balanceAmount); if (amt > 0) adjustBalance(u.id, amt, true); }} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1"><Minus size={14} /> Remove</button>
            </div>
          )}
          {!selectedUser || selectedUser.id !== u.id ? (
            <button onClick={() => setSelectedUser(u)} className="w-full mt-2 py-1 bg-white/5 rounded-lg text-gray-400 text-xs">Manage Balance</button>
          ) : null}
        </div>
      ))}
      {filtered.length === 0 && <p className="text-gray-400 text-center py-8">No users found</p>}
    </div>
  );
}

// ── AdminWithdrawals ────────────────────────────────────────────────────────

function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const { haptic } = useApp();
  const { showSuccess, showError } = useToast();

  useEffect(() => { loadWithdrawals(); }, [filter]);

  async function loadWithdrawals() {
    let q = supabase.from('withdrawals').select('*, users: user_id (first_name, username, telegram_id)').order('created_at', { ascending: false }).limit(50);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setWithdrawals(data || []);
  }

  async function approveWithdrawal(w: any) {
    const txId = prompt('Enter Transaction ID:');
    if (!txId) return;
    haptic('light');

    const { error } = await supabase.from('withdrawals').update({
      status: 'approved', tx_id: txId, processed_at: new Date().toISOString(),
    }).eq('id', w.id);

    if (error) { showError('Error', 'Failed to approve withdrawal'); return; }

    // Send bot notification to user + payment channel
    try {
      const botUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`;
      await fetch(botUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_telegram_id: w.users?.telegram_id,
          withdraw_data: {
            user_name: w.users?.first_name || w.users?.username || 'Unknown',
            withdraw_number: w.withdraw_number,
            amount: w.amount,
            fee: w.fee,
            net_amount: w.net_amount,
            currency: w.currency,
            tx_id: txId,
          },
        }),
      });
    } catch (e) { console.error('Bot notification failed:', e); }

    showSuccess('Approved!', 'Withdrawal approved and user notified.');
    loadWithdrawals();
  }

  async function rejectWithdrawal(w: any) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    haptic('light');

    const { error } = await supabase.from('withdrawals').update({
      status: 'rejected', reject_reason: reason, processed_at: new Date().toISOString(),
    }).eq('id', w.id);

    if (error) { showError('Error', 'Failed to reject withdrawal'); return; }

    // Refund points
    const refundPoints = Math.round(w.amount / POINTS_TO_USD);
    await supabase.rpc('add_points', { user_id: w.user_id, amount: refundPoints });

    // Decrement total_withdrawn
    await supabase.from('users').update({ total_withdrawn: 0 }).eq('id', w.user_id); // Reset to avoid stale

    // Send bot notification
    try {
      const botUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`;
      await fetch(botUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_telegram_id: w.users?.telegram_id,
          withdraw_data: {
            withdraw_number: w.withdraw_number,
            amount: w.amount,
            fee: w.fee,
            net_amount: w.net_amount,
            currency: w.currency,
            reject_reason: reason,
          },
        }),
      });
    } catch (e) { console.error('Bot notification failed:', e); }

    showSuccess('Rejected', 'Withdrawal rejected and points refunded.');
    loadWithdrawals();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => { haptic('light'); setFilter(f); }}
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-semibold capitalize ${filter === f ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'}`}>{f}</button>
        ))}
      </div>

      {withdrawals.map(w => (
        <div key={w.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-white font-semibold">{w.users?.first_name || w.users?.username || 'Unknown'}</p>
              <p className="text-gray-400 text-xs">#{w.withdraw_number} • ${w.amount.toFixed(4)} {w.currency}</p>
              <p className="text-gray-500 text-xs">Fee: ${w.fee.toFixed(4)} • Net: {w.net_amount.toFixed(4)} {w.currency}</p>
              <p className="text-gray-500 text-xs">Address: {w.wallet_address?.substring(0, 20)}...</p>
              <p className="text-gray-500 text-xs">{new Date(w.created_at).toLocaleString()}</p>
              {w.tx_id && <p className="text-green-400 text-xs mt-1">TX: {w.tx_id.substring(0, 30)}...</p>}
              {w.reject_reason && <p className="text-red-400 text-xs mt-1">Rejected: {w.reject_reason}</p>}
            </div>
            <span className={`px-2 py-1 rounded-lg text-xs font-bold capitalize ${w.status === 'approved' ? 'bg-green-500/20 text-green-400' : w.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{w.status}</span>
          </div>
          {w.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => approveWithdrawal(w)} className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><CheckCircle size={16} /> Approve</button>
              <button onClick={() => rejectWithdrawal(w)} className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl font-semibold text-sm flex items-center justify-center gap-1"><XCircle size={16} /> Reject</button>
            </div>
          )}
          {w.tx_id && (
            <a href={`https://${w.currency === 'USDT' ? 'bscscan.com' : 'tonviewer.com'}/tx/${w.tx_id}`} target="_blank" rel="noopener" className="mt-2 flex items-center gap-1 text-blue-400 text-xs"><ExternalLink size={14} /> View Transaction</a>
          )}
        </div>
      ))}
      {withdrawals.length === 0 && <p className="text-gray-400 text-center py-8">No withdrawals found</p>}
    </div>
  );
}

// ── AdminTasks ──────────────────────────────────────────────────────────────

function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { haptic } = useApp();
  const { showSuccess, showError } = useToast();

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').order('task_section', { ascending: true }).order('created_at', { ascending: false });
    setTasks(data || []);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    haptic('light');
    const form = e.currentTarget;
    const fd = new FormData(form);
    const taskData = {
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      link: fd.get('link') as string,
      task_type: fd.get('task_type') as string,
      task_section: fd.get('task_section') as string,
      reward_points: parseInt(fd.get('reward_points') as string),
      icon_emoji: fd.get('icon_emoji') as string,
      image_url: fd.get('image_url') as string || null,
      verification_method: fd.get('verification_method') as string,
      is_partner: fd.get('task_section') === 'partner',
      is_active: true,
    };

    if (editing) {
      const { error } = await supabase.from('tasks').update(taskData).eq('id', editing.id);
      if (error) { showError('Error', 'Failed to update task'); return; }
      showSuccess('Updated', 'Task updated successfully');
    } else {
      const { error } = await supabase.from('tasks').insert(taskData);
      if (error) { showError('Error', 'Failed to create task: ' + error.message); return; }
      showSuccess('Created', 'Task created successfully');
    }
    setShowForm(false); setEditing(null); loadTasks();
  }

  async function toggleTask(id: string, current: boolean) {
    haptic('light');
    await supabase.from('tasks').update({ is_active: !current }).eq('id', id);
    loadTasks();
  }

  async function deleteTask(id: string) {
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;
    haptic('light');
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) { showError('Error', 'Failed to delete task'); return; }
    showSuccess('Deleted', 'Task deleted successfully');
    loadTasks();
  }

  return (
    <div className="space-y-4">
      <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2">
        <Plus size={18} /> Add New Task
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">{editing ? 'Edit Task' : 'New Task'}</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}><X className="text-white" /></button>
          </div>
          <input name="title" defaultValue={editing?.title || ''} placeholder="Title" required className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
          <textarea name="description" defaultValue={editing?.description || ''} placeholder="Description" className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
          <input name="link" defaultValue={editing?.link || ''} placeholder="Link (https://t.me/...)" className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
          <div className="grid grid-cols-2 gap-2">
            <select name="task_type" defaultValue={editing?.task_type || 'channel'} className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
              <option value="channel">Channel</option><option value="group">Group</option><option value="other">Other</option>
            </select>
            <select name="task_section" defaultValue={editing?.task_section || 'main'} className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
              <option value="main">Main</option><option value="partner">Partner</option><option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="reward_points" type="number" defaultValue={editing?.reward_points || 50} placeholder="Reward points" required className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
            <input name="icon_emoji" defaultValue={editing?.icon_emoji || '📢'} placeholder="Icon emoji" className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
          </div>
          <input name="image_url" defaultValue={editing?.image_url || ''} placeholder="Image URL (optional)" className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
          <select name="verification_method" defaultValue={editing?.verification_method || 'auto'} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
            <option value="auto">Auto</option><option value="bot_verify">Bot Verify</option><option value="trust_verify">Trust Verify</option>
          </select>
          <button type="submit" className="w-full py-3 bg-green-500/20 text-green-400 rounded-xl font-semibold flex items-center justify-center gap-2"><Save size={18} /> {editing ? 'Update' : 'Create'} Task</button>
        </form>
      )}

      {tasks.map(t => (
        <div key={t.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-white font-semibold">{t.icon_emoji} {t.title}</p>
              <p className="text-gray-400 text-xs">{t.task_section} • {t.reward_points} pts • {t.verification_method}</p>
              <p className="text-gray-500 text-xs">{t.link}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => { setEditing(t); setShowForm(true); }} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold">Edit</button>
              <button onClick={() => toggleTask(t.id, t.is_active)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${t.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{t.is_active ? 'Active' : 'Inactive'}</button>
              <button onClick={() => deleteTask(t.id)} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1"><Trash2 size={12} /> Delete</button>
            </div>
          </div>
        </div>
      ))}
      {tasks.length === 0 && <p className="text-gray-400 text-center py-8">No tasks found</p>}
    </div>
  );
}

// ── AdminPartner ────────────────────────────────────────────────────────────

function AdminPartner() {
  const [submissions, setSubmissions] = useState<PartnerSubmission[]>([]);
  const { haptic } = useApp();
  const { showSuccess, showError } = useToast();

  useEffect(() => { loadSubmissions(); }, []);

  async function loadSubmissions() {
    const { data } = await supabase.from('partner_submissions').select('*').order('created_at', { ascending: false });
    setSubmissions(data || []);
  }

  async function approveSubmission(s: PartnerSubmission) {
    haptic('light');
    await supabase.from('partner_submissions').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', s.id);
    try {
      const botUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`;
      await fetch(botUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_telegram_id: s.user_id, action: 'notify-partner-approve' }),
      });
    } catch (e) { console.error('Bot notification failed:', e); }
    showSuccess('Approved', 'Partner submission approved');
    loadSubmissions();
  }

  async function rejectSubmission(s: PartnerSubmission) {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    haptic('light');
    await supabase.from('partner_submissions').update({ status: 'rejected', admin_notes: reason, reviewed_at: new Date().toISOString() }).eq('id', s.id);
    showSuccess('Rejected', 'Partner submission rejected');
    loadSubmissions();
  }

  return (
    <div className="space-y-4">
      {submissions.map(s => (
        <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white font-semibold">{s.channel_name}</p>
          <a href={s.post_link} target="_blank" rel="noopener" className="text-blue-400 text-xs flex items-center gap-1"><ExternalLink size={12} /> {s.post_link}</a>
          <p className="text-gray-500 text-xs mt-1">{new Date(s.created_at).toLocaleString()}</p>
          <div className="flex gap-2 mt-2">
            {s.status === 'pending' && (
              <>
                <button onClick={() => approveSubmission(s)} className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-xl font-semibold text-sm"><CheckCircle size={16} /> Approve</button>
                <button onClick={() => rejectSubmission(s)} className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl font-semibold text-sm"><XCircle size={16} /> Reject</button>
              </>
            )}
            <span className={`px-2 py-1 rounded-lg text-xs font-bold capitalize ${s.status === 'approved' ? 'bg-green-500/20 text-green-400' : s.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{s.status}</span>
          </div>
        </div>
      ))}
      {submissions.length === 0 && <p className="text-gray-400 text-center py-8">No partner submissions</p>}
    </div>
  );
}

// ── AdminAds ────────────────────────────────────────────────────────────────

function AdminAds() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<any[]>([]);
  const { haptic } = useApp();
  const { showSuccess, showError } = useToast();

  useEffect(() => { loadConfigs(); loadStats(); }, []);

  async function loadConfigs() {
    const { data } = await supabase.from('settings').select('key, value').in('key', [
      'adsgram_block_id', 'adsgram_daily_limit', 'adsgram_points_per_ad', 'adsgram_cooldown_seconds',
      'monetag_zone_id', 'monetag_daily_limit', 'monetag_points_per_ad', 'monetag_cooldown_seconds',
      'gigapub_script_id', 'gigapub_daily_limit', 'gigapub_points_per_ad', 'gigapub_cooldown_seconds',
    ]);
    const map: Record<string, string> = {};
    (data || []).forEach((s: any) => map[s.key] = s.value);
    setConfigs(map);
  }

  async function loadStats() {
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAds } = await supabase.from('ad_views').select('ad_provider, reward').gte('viewed_at', today);
    const { data: totalAds } = await supabase.from('ad_views').select('ad_provider, reward');
    const providers = ['adsgram', 'monetag', 'gigapub'];
    const s = providers.map(p => ({
      provider: p,
      today: todayAds?.filter(a => a.ad_provider === p).length || 0,
      total: totalAds?.filter(a => a.ad_provider === p).length || 0,
      todayPoints: todayAds?.filter(a => a.ad_provider === p).reduce((sum, a) => sum + a.reward, 0) || 0,
    }));
    setStats(s);
  }

  async function handleSave() {
    haptic('light');
    const updates = Object.entries(configs).map(([key, value]) =>
      supabase.from('settings').update({ value }).eq('key', key)
    );
    await Promise.all(updates);
    showSuccess('Saved', 'Ad settings updated');
  }

  const networks = [
    { id: 'adsgram', name: 'Adsgram AI', logo: '🤖', fields: [
      { key: 'adsgram_block_id', label: 'Block ID (Rewarded)', value: configs.adsgram_block_id || '35762' },
      { key: 'adsgram_daily_limit', label: 'Daily Limit', value: configs.adsgram_daily_limit || '10' },
      { key: 'adsgram_points_per_ad', label: 'Points per Ad', value: configs.adsgram_points_per_ad || '10' },
      { key: 'adsgram_cooldown_seconds', label: 'Cooldown (seconds)', value: configs.adsgram_cooldown_seconds || '5' },
    ] },
    { id: 'monetag', name: 'Monetag', logo: '📊', fields: [
      { key: 'monetag_zone_id', label: 'Zone ID', value: configs.monetag_zone_id || '11230846' },
      { key: 'monetag_daily_limit', label: 'Daily Limit', value: configs.monetag_daily_limit || '10' },
      { key: 'monetag_points_per_ad', label: 'Points per Ad', value: configs.monetag_points_per_ad || '5' },
      { key: 'monetag_cooldown_seconds', label: 'Cooldown (seconds)', value: configs.monetag_cooldown_seconds || '5' },
    ] },
    { id: 'gigapub', name: 'Gigapub', logo: '🚀', fields: [
      { key: 'gigapub_script_id', label: 'Script ID', value: configs.gigapub_script_id || '7151' },
      { key: 'gigapub_daily_limit', label: 'Daily Limit', value: configs.gigapub_daily_limit || '10' },
      { key: 'gigapub_points_per_ad', label: 'Points per Ad', value: configs.gigapub_points_per_ad || '5' },
      { key: 'gigapub_cooldown_seconds', label: 'Cooldown (seconds)', value: configs.gigapub_cooldown_seconds || '5' },
    ] },
  ];

  return (
    <div className="space-y-4">
      {stats.map(s => (
        <div key={s.provider} className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white font-semibold capitalize">{s.provider}</p>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div><p className="text-gray-400 text-xs">Today</p><p className="text-white font-bold">{s.today}</p></div>
            <div><p className="text-gray-400 text-xs">Total</p><p className="text-white font-bold">{s.total}</p></div>
            <div><p className="text-gray-400 text-xs">Today Pts</p><p className="text-white font-bold">{s.todayPoints}</p></div>
          </div>
        </div>
      ))}

      {networks.map(n => (
        <div key={n.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white font-semibold mb-3">{n.logo} {n.name}</p>
          {n.fields.map(f => (
            <div key={f.key} className="mb-2">
              <label className="text-gray-400 text-xs">{f.label}</label>
              <input type="text" value={configs[f.key] ?? f.value} onChange={e => setConfigs({ ...configs, [f.key]: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
          ))}
        </div>
      ))}
      <button onClick={handleSave} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2"><Save size={18} /> Save Ad Settings</button>
    </div>
  );
}

// ── AdminBroadcast ──────────────────────────────────────────────────────────

function AdminBroadcast() {
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const { haptic } = useApp();
  const { showSuccess, showError } = useToast();

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    const { data } = await supabase.from('broadcast_log').select('*').order('created_at', { ascending: false }).limit(10);
    setHistory(data || []);
  }

  async function sendBroadcast() {
    if (!message.trim()) { showError('Error', 'Message is required'); return; }
    haptic('light'); setSending(true);
    try {
      const botUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`;
      const res = await fetch(botUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          message, image_url: imageUrl || null,
          button_text: buttonText || null, button_url: buttonUrl || null,
          admin_id: null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Broadcast Sent!', `Sent to ${data.sent} users, ${data.failed} failed`);
        setMessage(''); setImageUrl(''); setButtonText(''); setButtonUrl('');
        loadHistory();
      } else { showError('Error', 'Failed to send broadcast'); }
    } catch (e) { showError('Error', 'Failed to send broadcast'); }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-white font-bold flex items-center gap-2"><Megaphone size={18} /> Broadcast Message</h3>
        <p className="text-gray-400 text-xs">Sends to all users via bot + community channel</p>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message text (supports HTML)..." rows={4} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
        <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL (optional)" className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={buttonText} onChange={e => setButtonText(e.target.value)} placeholder="Button text (optional)" className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
          <input type="text" value={buttonUrl} onChange={e => setButtonUrl(e.target.value)} placeholder="Button URL (optional)" className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white" />
        </div>
        <button onClick={sendBroadcast} disabled={sending} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          {sending ? 'Sending...' : <><Send size={18} /> Send Broadcast</>}
        </button>
      </div>

      {history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-bold">Recent Broadcasts</h3>
          {history.map(h => (
            <div key={h.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-white text-sm">{h.message?.substring(0, 100)}...</p>
              <p className="text-gray-500 text-xs">Sent: {h.sent_count} • Failed: {h.failed_count} • {new Date(h.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AdminSettings ───────────────────────────────────────────────────────────

function AdminSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const { haptic } = useApp();
  const { showSuccess } = useToast();

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('key, value').in('key', ['maintenance_mode', 'maintenance_message']);
    (data || []).forEach((s: any) => {
      if (s.key === 'maintenance_mode') setMaintenanceMode(s.value === 'true');
      if (s.key === 'maintenance_message') setMaintenanceMessage(s.value || '');
    });
  }

  async function toggleMaintenance() {
    haptic('light');
    const newVal = !maintenanceMode;
    setMaintenanceMode(newVal);
    await supabase.from('settings').update({ value: newVal.toString() }).eq('key', 'maintenance_mode');
    showSuccess('Updated', `Maintenance mode ${newVal ? 'enabled' : 'disabled'}`);
  }

  async function saveMessage() {
    haptic('light');
    await supabase.from('settings').update({ value: maintenanceMessage }).eq('key', 'maintenance_message');
    showSuccess('Saved', 'Maintenance message updated');
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-white font-bold flex items-center gap-2"><Wrench size={18} /> Maintenance Mode</h3>
        <p className="text-gray-400 text-xs mt-1">When enabled, non-admin users see a maintenance message instead of the app.</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-white">Status: {maintenanceMode ? 'ON' : 'OFF'}</span>
          <button onClick={toggleMaintenance} className={`px-4 py-2 rounded-xl font-semibold ${maintenanceMode ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {maintenanceMode ? 'Disable' : 'Enable'}
          </button>
        </div>
        <textarea value={maintenanceMessage} onChange={e => setMaintenanceMessage(e.target.value)} placeholder="Maintenance message..." rows={3} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mt-3" />
        <button onClick={saveMessage} className="w-full py-2 bg-blue-500/20 text-blue-400 rounded-xl font-semibold mt-2 flex items-center justify-center gap-2"><Save size={16} /> Save Message</button>
      </div>
    </div>
  );
}
