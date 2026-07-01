import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import {
  Users, DollarSign, TrendingUp, Gift, Settings, CheckCircle, XCircle, Clock,
  BarChart3, Bell, RefreshCw, AlertTriangle, Globe, Handshake, ExternalLink, Send, X,
} from 'lucide-react';
import type { Withdrawal, User, Task, PartnerSubmission } from '../../types';

const ADMIN_TELEGRAM_ID = 5419054691;
const WITHDRAW_FEE = 0.01;
const WITHDRAW_FEE_PERCENT = 5;

export function AdminView() {
  const { user, haptic } = useApp();
  const [tab, setTab] = useState<'stats' | 'users' | 'withdrawals' | 'tasks' | 'partner'>('stats');

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
    </div>
  );
}

// ── AdminStats (unchanged) ─────────────────────────────────────────────────────

function AdminStats() {
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, suspendedUsers: 0, totalPoints: 0, totalWithdrawn: 0, pendingWithdrawals: 0, totalTasks: 0, todaySignups: 0 });
  const { haptic } = useApp();

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: activeUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).gt('last_active', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      const { count: suspendedUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true);
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
      <div className="glass-card p-4">
        <button onClick={() => { haptic('light'); loadStats(); }} className="btn-neon w-full flex items-center justify-center gap-2">
          <RefreshCw size={18} /> Refresh Stats
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="stat-card">
      {icon}<p className="stat-value mt-2">{value}</p><p className="text-gray-400 text-xs mt-1">{label}</p>
    </div>
  );
}

// ── AdminUsers (unchanged) ─────────────────────────────────────────────────────

function AdminUsers() {
  const [users, setUsers] = useState<(User & { ip_address?: string; suspended_at?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { haptic } = useApp();

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setUsers(data || []);
    } catch (error) { console.error('Error loading users:', error); }
    finally { setLoading(false); }
  }

  async function toggleBan(userId: string, isBanned: boolean) {
    haptic('light');
    try {
      const { error } = await supabase.from('users').update({ is_banned: !isBanned, suspended_at: !isBanned ? new Date().toISOString() : null, suspension_reason: !isBanned ? 'Admin suspension' : null }).eq('id', userId);
      if (error) throw error;
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_banned: !isBanned } : u)));
      haptic('success');
    } catch (error) { console.error('Error toggling ban:', error); haptic('error'); }
  }

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.telegram_id?.toString().includes(search) ||
    u.ip_address?.includes(search)
  );

  const ipCounts: Record<string, number> = {};
  users.forEach((u) => { if (u.ip_address) { ipCounts[u.ip_address] = (ipCounts[u.ip_address] || 0) + 1; } });

  return (
    <div>
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users, IPs, or Telegram ID..." className="w-full py-3 px-4 rounded-xl bg-white/10 text-white placeholder-gray-500 mb-4" />
      {loading ? (
        <div className="flex justify-center py-8"><div className="loader" /></div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => {
            const hasDuplicateIp = u.ip_address && ipCounts[u.ip_address] > 1;
            return (
              <div key={u.id} className={`glass-card p-4 ${u.is_banned ? 'opacity-50 border-red-500/50' : ''} ${hasDuplicateIp && !u.is_banned ? 'border-yellow-500/50' : ''}`}>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl font-bold text-white">
                    {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{u.first_name || u.username || 'Anonymous'}</p>
                      {u.is_banned && <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">BANNED</span>}
                      {hasDuplicateIp && !u.is_banned && <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400"><AlertTriangle size={12} className="inline mr-1" />DUP IP</span>}
                    </div>
                    <p className="text-gray-400 text-sm">{u.points.toLocaleString()} pts</p>
                  </div>
                  <button onClick={() => toggleBan(u.id, u.is_banned)} className={`p-2 rounded-lg ${u.is_banned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.is_banned ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2 pt-2 border-t border-white/5">
                  <span>🆔 {u.telegram_id}</span>
                  {u.ip_address && <span className="flex items-center gap-1"><Globe size={12} />{u.ip_address}</span>}
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

// ── AdminWithdrawals (updated with tx id + reject reason) ──────────────────────

function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<(Withdrawal & { user?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [txId, setTxId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const { haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => { loadWithdrawals(); }, [filter]);

  async function loadWithdrawals() {
    setLoading(true);
    try {
      const query = supabase.from('withdrawals').select(`*, user:users!user_id (id, telegram_id, username, first_name)`).order('created_at', { ascending: false }).limit(50);
      if (filter !== 'all') query.eq('status', filter);
      const { data, error } = await query;
      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) { console.error('Error loading withdrawals:', error); }
    finally { setLoading(false); }
  }

  async function approveWithdrawal(id: string) {
    haptic('light');
    if (!txId.trim()) { showError('TX ID Required', 'Please enter the transaction ID.'); return; }
    try {
      const { error } = await supabase.from('withdrawals').update({ status: 'approved', tx_id: txId, processed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;

      // Send notification to user
      const w = withdrawals.find(w => w.id === id);
      if (w?.user_id) {
        await supabase.from('notifications').insert({
          user_id: w.user_id,
          title: 'Withdrawal Approved!',
          message: `Your withdrawal #${w.withdraw_number} of $${w.amount.toFixed(4)} ${w.currency} has been approved. TX ID: ${txId}`,
          type: 'withdrawal',
        });
      }

      setTxId(''); setShowApproveModal(null);
      await loadWithdrawals();
      showSuccess('Approved!', 'Withdrawal has been approved.');
      haptic('success');
    } catch (error) { console.error('Error approving:', error); showError('Error', 'Could not approve withdrawal.'); haptic('error'); }
  }

  async function rejectWithdrawal(id: string) {
    haptic('light');
    if (!rejectReason.trim()) { showError('Reason Required', 'Please enter a rejection reason.'); return; }
    try {
      const { error } = await supabase.from('withdrawals').update({ status: 'rejected', reject_reason: rejectReason, processed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;

      // Refund points to user
      const w = withdrawals.find(w => w.id === id);
      if (w?.user_id) {
        const refundPoints = Math.round(w.amount / 0.0001);
        await supabase.rpc('add_points', { user_id: w.user_id, amount: refundPoints });
        // Send notification to user
        await supabase.from('notifications').insert({
          user_id: w.user_id,
          title: 'Withdrawal Rejected',
          message: `Your withdrawal #${w.withdraw_number} of $${w.amount.toFixed(4)} ${w.currency} was rejected. Reason: ${rejectReason}. Points have been refunded.`,
          type: 'withdrawal',
        });
      }

      setRejectReason(''); setShowRejectModal(null);
      await loadWithdrawals();
      showSuccess('Rejected', 'Withdrawal rejected and points refunded.');
      haptic('success');
    } catch (error) { console.error('Error rejecting:', error); showError('Error', 'Could not reject withdrawal.'); haptic('error'); }
  }

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button key={f} onClick={() => { setFilter(f as typeof filter); }} className={`px-4 py-2 rounded-xl capitalize ${filter === f ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'}`}>
            {f}
            {f === 'pending' && pendingCount > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="loader" /></div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => (
            <div key={w.id} className="glass-card p-4">
              {/* User info */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{w.currency === 'USDT' ? '💎' : '🚀'}</span>
                  <div>
                    <p className="text-white font-bold">${w.amount.toFixed(4)} {w.currency === 'TON' ? '(GRAM)' : 'BEP20'}</p>
                    {w.withdraw_number && <p className="text-gray-500 text-xs">Withdraw #{w.withdraw_number}</p>}
                  </div>
                </div>
                <span className={`badge ${w.status === 'pending' ? 'bg-yellow-500/30 text-yellow-400' : w.status === 'approved' ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'}`}>{w.status}</span>
              </div>

              {/* Detailed info with emojis */}
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">👤 User: <span className="text-white">{w.user?.first_name || w.user?.username || 'Unknown'}</span> (ID: {w.user?.telegram_id})</p>
                <p className="text-gray-400">🔢 Withdraw #: <span className="text-white">{w.withdraw_number || 1}</span></p>
                <p className="text-gray-400">💵 Amount USD: <span className="text-white">${w.amount.toFixed(4)}</span></p>
                <p className="text-gray-400">💳 Method: <span className="text-white">{w.currency === 'TON' ? 'TON (GRAM)' : 'USDT BEP20'}</span></p>
                <p className="text-gray-400">💸 Withdraw Fee: <span className="text-white">${w.fee.toFixed(4)}</span></p>
                <p className="text-gray-400">✅ Net (after fee): <span className="text-gold-400 font-bold">{w.net_amount.toFixed(4)} {w.currency === 'TON' ? 'TON (GRAM)' : 'USDT BEP20'}</span></p>
                <p className="text-gray-400">📍 Address: <span className="text-white font-mono text-xs break-all">{w.wallet_address}</span></p>
                {w.tx_id && <p className="text-gray-400">🔗 TX ID: <span className="text-blue-400 font-mono text-xs">{w.tx_id}</span></p>}
                {w.reject_reason && <p className="text-red-400">❌ Reason: {w.reject_reason}</p>}
              </div>

              {/* Action buttons */}
              {w.status === 'pending' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                  <button onClick={() => { setShowApproveModal(w.id); setTxId(''); }} className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle size={18} /> Approve
                  </button>
                  <button onClick={() => { setShowRejectModal(w.id); setRejectReason(''); }} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 font-semibold flex items-center justify-center gap-1">
                    <XCircle size={18} /> Reject
                  </button>
                </div>
              )}

              {/* View transaction button */}
              {w.tx_id && (
                <a href={`https://${w.currency === 'USDT' ? 'bscscan.com' : 'tonviewer.com'}/tx/${w.tx_id}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-1 text-blue-400 text-sm">
                  <ExternalLink size={14} /> View Transaction
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="glass-card p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-4">Approve Withdrawal</h3>
            <p className="text-gray-400 text-sm mb-4">Enter the transaction ID to approve this withdrawal.</p>
            <input type="text" value={txId} onChange={(e) => setTxId(e.target.value)} placeholder="Transaction ID" className="w-full py-3 px-4 rounded-xl bg-white/10 text-white font-mono text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={() => approveWithdrawal(showApproveModal)} className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 font-bold">Approve</button>
              <button onClick={() => setShowApproveModal(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-gray-400">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="glass-card p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-4">Reject Withdrawal</h3>
            <p className="text-gray-400 text-sm mb-4">Enter a reason for rejection. Points will be refunded to the user.</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="w-full py-3 px-4 rounded-xl bg-white/10 text-white text-sm mb-4 h-24 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => rejectWithdrawal(showRejectModal)} className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold">Reject</button>
              <button onClick={() => setShowRejectModal(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-gray-400">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AdminTasks (updated: no delete, only toggle) ───────────────────────────────

function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'main' | 'partner' | 'community'>('all');
  const { haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();

  const [formData, setFormData] = useState({
    title: '', description: '', link: '', task_type: 'channel' as Task['task_type'],
    task_section: 'main' as Task['task_section'], reward_points: 10, icon_emoji: '📋',
    image_url: '', verification_method: 'auto' as Task['verification_method'],
    is_partner: false, is_active: true,
  });

  const TASK_ICONS = ['📋', '📢', '👥', '🤖', '📰', '🤝', '🎁', '⭐', '🔥', '💰', '🎮', '📱', '💬', '✨', '🎯'];
  const TASK_TYPES = ['channel', 'group', 'bot', 'post', 'partner'];
  const TASK_SECTIONS = ['main', 'partner', 'community'];
  const VERIFICATION_METHODS = [
    { value: 'auto', label: 'Auto Verify', description: 'Complete after clicking' },
    { value: 'bot_verify', label: 'Bot Verify', description: 'Check membership via bot' },
    { value: 'trust_verify', label: 'Trust Verify', description: 'Manual admin approval' },
  ];

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('task_section').order('created_at');
      if (error) throw error;
      setTasks(data || []);
    } catch (error) { console.error('Error loading tasks:', error); }
    finally { setLoading(false); }
  }

  function resetForm() {
    setFormData({ title: '', description: '', link: '', task_type: 'channel', task_section: 'main', reward_points: 10, icon_emoji: '📋', image_url: '', verification_method: 'auto', is_partner: false, is_active: true });
    setEditingTask(null); setShowForm(false);
  }

  function startEdit(task: Task) {
    haptic('light');
    setFormData({ title: task.title, description: task.description || '', link: task.link || '', task_type: task.task_type, task_section: task.task_section, reward_points: task.reward_points, icon_emoji: task.icon_emoji || '📋', image_url: task.image_url || '', verification_method: task.verification_method || 'auto', is_partner: task.is_partner, is_active: task.is_active });
    setEditingTask(task); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) return;
    haptic('light'); setLoading(true);
    try {
      if (editingTask) {
        const { error } = await supabase.from('tasks').update({ ...formData, updated_at: new Date().toISOString() }).eq('id', editingTask.id);
        if (error) throw error;
        showSuccess('Task Updated', 'Task has been updated successfully.');
      } else {
        const { error } = await supabase.from('tasks').insert({ ...formData, verification_method: 'auto' });
        if (error) throw error;
        showSuccess('Task Created', 'New task has been added successfully.');
      }
      resetForm(); await loadTasks(); haptic('success');
    } catch (error) { console.error('Error saving task:', error); showError('Error', 'Failed to save task.'); haptic('error'); }
    finally { setLoading(false); }
  }

  async function toggleTask(taskId: string, isActive: boolean) {
    haptic('light');
    try {
      const { error } = await supabase.from('tasks').update({ is_active: !isActive }).eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, is_active: !isActive } : t)));
      haptic('success');
    } catch (error) { console.error('Error toggling task:', error); haptic('error'); }
  }

  const filteredTasks = tasks.filter((t) => filter === 'all' || t.task_section === filter);
  const sectionColors: Record<string, string> = { main: 'bg-green-500/20 text-green-400', partner: 'bg-blue-500/20 text-blue-400', community: 'bg-gold-500/20 text-gold-400' };

  return (
    <div>
      <button onClick={() => { haptic('light'); resetForm(); setShowForm(true); }} className="btn-neon-gold w-full mb-4">+ Add New Task</button>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['all', 'main', 'partner', 'community'].map((s) => (
          <button key={s} onClick={() => setFilter(s as typeof filter)} className={`px-4 py-2 rounded-xl capitalize whitespace-nowrap ${filter === s ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'}`}>{s}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
              <button onClick={resetForm} className="text-gray-500"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Task title" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" required />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Link</label>
                <input type="text" value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="https://t.me/channel" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {TASK_ICONS.map((icon) => (
                    <button key={icon} type="button" onClick={() => setFormData({ ...formData, icon_emoji: icon })} className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center ${formData.icon_emoji === icon ? 'bg-purple-600 border-2 border-purple-400' : 'bg-white/10'}`}>{icon}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Image URL (optional)</label>
                <input type="text" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://example.com/image.png" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Verification Method</label>
                <div className="space-y-2">
                  {VERIFICATION_METHODS.map((method) => (
                    <button key={method.value} type="button" onClick={() => setFormData({ ...formData, verification_method: method.value as Task['verification_method'] })} className={`w-full p-3 rounded-lg text-left ${formData.verification_method === method.value ? 'bg-purple-600 border-2 border-purple-400' : 'bg-white/10 border border-white/10'}`}>
                      <p className="text-white font-semibold text-sm">{method.label}</p>
                      <p className="text-gray-400 text-xs">{method.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Type</label>
                  <select value={formData.task_type} onChange={(e) => setFormData({ ...formData, task_type: e.target.value as Task['task_type'] })} className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm">
                    {TASK_TYPES.map((t) => <option key={t} value={t} className="bg-gray-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Section</label>
                  <select value={formData.task_section} onChange={(e) => setFormData({ ...formData, task_section: e.target.value as Task['task_section'], is_partner: e.target.value === 'partner' })} className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm">
                    {TASK_SECTIONS.map((s) => <option key={s} value={s} className="bg-gray-900">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Reward Points</label>
                <input type="number" value={formData.reward_points} onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) || 0 })} min="1" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5" />
                <label htmlFor="is_active" className="text-white text-sm">Task is active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 btn-neon-gold">{editingTask ? 'Update' : 'Create'}</button>
                <button type="button" onClick={resetForm} className="flex-1 py-2 rounded-lg bg-white/10 text-gray-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="loader" /></div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => (
            <div key={t.id} className={`glass-card p-4 ${!t.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{t.icon_emoji || '📋'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate">{t.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${sectionColors[t.task_section] || 'bg-white/10'}`}>{t.task_section}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{t.task_type} task</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gold-400 font-bold">+{t.reward_points}</p>
                  <button onClick={() => toggleTask(t.id, t.is_active)} className={`text-xs ${t.is_active ? 'text-green-400' : 'text-red-400'}`}>{t.is_active ? 'Active' : 'Disabled'}</button>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                <button onClick={() => startEdit(t)} className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-semibold">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AdminPartner (new: review partner task submissions) ────────────────────────

function AdminPartner() {
  const [submissions, setSubmissions] = useState<(PartnerSubmission & { user?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const { haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => { loadSubmissions(); }, [filter]);

  async function loadSubmissions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partner_submissions')
        .select(`*, user:users!user_id (id, telegram_id, username, first_name)`)
        .eq('status', filter)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) { console.error('Error loading partner submissions:', error); }
    finally { setLoading(false); }
  }

  async function approveSubmission(id: string) {
    haptic('light');
    try {
      const { error } = await supabase.from('partner_submissions')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      // Send notification to user
      const sub = submissions.find(s => s.id === id);
      if (sub?.user_id) {
        await supabase.from('notifications').insert({
          user_id: sub.user_id,
          title: 'Partner Task Approved!',
          message: 'Your partner task submission has been approved. It will appear as a Partner Task.',
          type: 'partner',
        });
      }

      await loadSubmissions();
      showSuccess('Approved!', 'Partner submission approved.');
      haptic('success');
    } catch (error) { console.error('Error approving:', error); showError('Error', 'Could not approve.'); haptic('error'); }
  }

  async function rejectSubmission(id: string) {
    haptic('light');
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      const { error } = await supabase.from('partner_submissions')
        .update({ status: 'rejected', admin_notes: reason, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      const sub = submissions.find(s => s.id === id);
      if (sub?.user_id) {
        await supabase.from('notifications').insert({
          user_id: sub.user_id,
          title: 'Partner Task Rejected',
          message: `Your partner task submission was rejected. Reason: ${reason}`,
          type: 'partner',
        });
      }

      await loadSubmissions();
      showSuccess('Rejected', 'Submission rejected.');
      haptic('success');
    } catch (error) { console.error('Error rejecting:', error); showError('Error', 'Could not reject.'); haptic('error'); }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['pending', 'approved', 'rejected'].map((f) => (
          <button key={f} onClick={() => setFilter(f as typeof filter)} className={`px-4 py-2 rounded-xl capitalize ${filter === f ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="loader" /></div>
      ) : submissions.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3 opacity-50">🤝</div>
          <p className="text-gray-400">No {filter} submissions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="glass-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {(s.user?.first_name?.[0] || s.user?.username?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{s.user?.first_name || s.user?.username || 'Unknown'}</p>
                  <p className="text-gray-500 text-xs">ID: {s.user?.telegram_id} • {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm mb-3">
                <p className="text-gray-400">🔗 Post Link: <a href={s.post_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">{s.post_link}</a></p>
                {s.channel_name && <p className="text-gray-400">📢 Channel: <span className="text-white">{s.channel_name}</span></p>}
                {s.admin_notes && <p className="text-red-400">❌ {s.admin_notes}</p>}
              </div>
              {filter === 'pending' && (
                <div className="flex gap-2 pt-3 border-t border-white/10">
                  <button onClick={() => approveSubmission(s.id)} className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle size={18} /> Approve
                  </button>
                  <button onClick={() => rejectSubmission(s.id)} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 font-semibold flex items-center justify-center gap-1">
                    <XCircle size={18} /> Reject
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
