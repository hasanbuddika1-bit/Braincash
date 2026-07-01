import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { CheckCircle, ExternalLink, ChevronRight, Target, Handshake, Users, Trophy, Flame, Plus, X, DollarSign, Bot, AlertCircle, Send } from 'lucide-react';
import type { Task, CommunityTask } from '../../types';

type TaskSection = 'main' | 'partner' | 'community';

const POINTS_PER_MEMBER = 10;
const MIN_MEMBERS = 100;
const POST_COST_PER_MEMBER = 5; // community task posting cost per member in points

export function TasksView() {
  const { user, tasks, refreshTasks, addPoints, haptic, setCurrentView } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<TaskSection>('main');
  const [communityTasks, setCommunityTasks] = useState<CommunityTask[]>([]);
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(new Set());
  const [showAddTask, setShowAddTask] = useState(false);
  const [showPartnerSubmit, setShowPartnerSubmit] = useState(false);

  useEffect(() => {
    if (activeSection === 'community') {
      loadCommunityTasks();
    }
  }, [activeSection, user?.id]);

  async function loadCommunityTasks() {
    if (!user) return;
    try {
      const { data: ctasks } = await supabase
        .from('community_tasks')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setCommunityTasks(ctasks || []);

      // Load which community tasks the user has joined
      const { data: joins } = await supabase
        .from('community_task_joins')
        .select('community_task_id')
        .eq('user_id', user.id);

      setJoinedCommunityIds(new Set((joins || []).map(j => j.community_task_id)));
    } catch (err) {
      console.error('Error loading community tasks:', err);
    }
  }

  const handleTaskClick = async (task: Task) => {
    if (task.completed || !user) return;
    haptic('light');
    if (task.link) {
      window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank');
    }
    setCompletingId(task.id);
    setTimeout(async () => {
      try {
        const { error: completionError } = await supabase.from('task_completions').insert({
          user_id: user.id,
          task_id: task.id,
          status: 'completed',
        });
        if (completionError) throw completionError;
        await addPoints(task.reward_points);

        // Update referral task bonus if this user was referred
        const { data: referral } = await supabase
          .from('referrals')
          .select('referrer_id')
          .eq('referred_id', user.id)
          .maybeSingle();

        if (referral) {
          if (task.task_section === 'main') {
            await supabase.rpc('add_points', { user_id: referral.referrer_id, amount: 50 });
            await supabase
              .from('referrals')
              .update({ task_bonus: 50, total_commission: 50, referred_task_count: 1 })
              .eq('referred_id', user.id);
          }
        }

        await refreshTasks();
        showSuccess(`+${task.reward_points} Points!`, `Task "${task.title}" completed.`);
        haptic('success');
      } catch (error) {
        console.error('Error completing task:', error);
        showError('Task Failed', 'Could not complete task. Please try again.');
        haptic('error');
      } finally {
        setCompletingId(null);
      }
    }, 2000);
  };

  async function handleCommunityTaskJoin(ctask: CommunityTask) {
    if (!user || joinedCommunityIds.has(ctask.id)) return;
    haptic('light');
    if (ctask.channel_link) {
      window.Telegram?.WebApp?.openTelegramLink?.(ctask.channel_link) || window.open(ctask.channel_link, '_blank');
    }
    try {
      await supabase.from('community_task_joins').insert({
        user_id: user.id,
        community_task_id: ctask.id,
      });

      // Increment members_joined
      const newJoined = ctask.members_joined + 1;
      const newStatus = newJoined >= ctask.member_amount ? 'completed' : 'active';
      await supabase
        .from('community_tasks')
        .update({ members_joined: newJoined, status: newStatus })
        .eq('id', ctask.id);

      // Give points to the joining user
      await addPoints(ctask.points_per_member);

      setJoinedCommunityIds(new Set([...joinedCommunityIds, ctask.id]));
      await loadCommunityTasks();
      showSuccess(`+${ctask.points_per_member} Points!`, 'Task joined successfully!');
      haptic('success');
    } catch (err) {
      console.error('Error joining community task:', err);
      showError('Error', 'Could not join task.');
      haptic('error');
    }
  }

  // Filter tasks by section
  const mainTasks = tasks.filter((t) => t.task_section === 'main' || (!t.task_section && !t.is_partner));
  const partnerTasks = tasks.filter((t) => t.task_section === 'partner' || t.is_partner);

  // Sort: incomplete first, completed at bottom
  function sortTasks(arr: Task[]) {
    return [...arr].sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return 0;
    });
  }

  const sections: { key: TaskSection; label: string; icon: React.ReactNode; tasks: Task[]; color: string }[] = [
    { key: 'main', label: 'Main', icon: <Target size={16} />, tasks: sortTasks(mainTasks), color: 'from-green-600 to-green-brand' },
    { key: 'partner', label: 'Partner', icon: <Handshake size={16} />, tasks: sortTasks(partnerTasks), color: 'from-purple-600 to-blue-600' },
    { key: 'community', label: 'Community', icon: <Users size={16} />, tasks: [], color: 'from-gold-500 to-gold-400' },
  ];

  const activeTasks = sections.find((s) => s.key === activeSection)?.tasks || [];

  const totalReward = tasks.reduce((sum, t) => sum + t.reward_points, 0);
  const earnedReward = tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.reward_points, 0);
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">📋</span>
          Tasks
        </h1>
        <p className="text-green-400 mt-2">Complete tasks to earn points!</p>
      </div>

      {/* Progress Card */}
      <div className="glass-card p-4 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.15) 0%, rgba(124,58,237,0.1) 100%)' }}>
        <div className="absolute top-0 right-0 text-6xl opacity-20 transform translate-x-2 -translate-y-2">🏆</div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="text-gold-400" size={20} />
              <span className="text-white font-semibold">Your Progress</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Flame className="text-orange-400" size={16} />
              <span className="text-orange-400 font-bold">{completedCount}/{totalCount}</span>
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalCount > 0 ? (earnedReward / totalReward) * 100 : 0}%`, background: 'linear-gradient(90deg, #00c853, #fbbf24)' }} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-gray-400 text-xs">Completed</p><p className="text-green-400 font-bold">{earnedReward} pts</p></div>
            <div className="text-right"><p className="text-gray-400 text-xs">Available</p><p className="text-gold-400 font-bold">{totalReward - earnedReward} pts</p></div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {sections.map((section) => {
          const completed = section.tasks.filter((t) => t.completed).length;
          const total = section.tasks.length;
          const isActive = activeSection === section.key;
          return (
            <button key={section.key} onClick={() => { haptic('light'); setActiveSection(section.key); }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${isActive ? `bg-gradient-to-r ${section.color} text-white shadow-lg` : 'bg-white/10 text-gray-400 hover:bg-white/15'}`}>
              {section.icon}
              <span>{section.label}</span>
              {total > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>{completed}/{total}</span>}
            </button>
          );
        })}
      </div>

      {/* Community section: Add Task + Partner Task buttons */}
      {activeSection === 'community' && (
        <div className="space-y-3 mb-4">
          <button onClick={() => { haptic('light'); setShowAddTask(true); }} className="btn-neon-gold w-full flex items-center justify-center gap-2">
            <Plus size={20} /> Add Task
          </button>
          <button onClick={() => { haptic('light'); setShowPartnerSubmit(true); }} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold flex items-center justify-center gap-2">
            <Handshake size={20} /> Ad Partner Task
          </button>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {activeSection === 'community' ? (
          communityTasks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="text-4xl mb-3 opacity-50">👥</div>
              <p className="text-gray-400">No community tasks yet</p>
              <p className="text-gray-500 text-sm mt-1">Create a task or check back later!</p>
            </div>
          ) : (
            communityTasks.map((ctask) => (
              <CommunityTaskCard
                key={ctask.id}
                ctask={ctask}
                joined={joinedCommunityIds.has(ctask.id)}
                onClick={() => handleCommunityTaskJoin(ctask)}
              />
            ))
          )
        ) : activeTasks.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-3 opacity-50">📭</div>
            <p className="text-gray-400">No tasks in this section yet</p>
            <p className="text-gray-500 text-sm mt-1">Check back later for new tasks!</p>
          </div>
        ) : (
          activeTasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} loading={completingId === task.id} />
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {showAddTask && <AddTaskModal onClose={() => setShowAddTask(false)} onSuccess={() => { loadCommunityTasks(); }} />}
      {/* Partner Task Submit Modal */}
      {showPartnerSubmit && <PartnerSubmitModal onClose={() => setShowPartnerSubmit(false)} />}
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

interface TaskCardProps { task: Task; onClick: () => void; loading?: boolean; }

function TaskCard({ task, onClick, loading }: TaskCardProps) {
  const taskIcons: Record<string, string> = { channel: '📢', group: '👥', bot: '🤖', post: '📰', partner: '🤝' };
  const sectionColors: Record<string, string> = {
    main: 'from-green-500/20 to-green-600/20 border-green-500/30',
    partner: 'from-purple-500/20 to-blue-500/20 border-purple-500/30',
    community: 'from-gold-500/20 to-gold-400/20 border-gold-500/30',
  };
  const colorClass = sectionColors[task.task_section || 'main'] || sectionColors.main;
  return (
    <button onClick={onClick} disabled={task.completed || loading}
      className={`glass-card p-4 w-full text-left transition-all border ${task.completed ? 'opacity-60 border-green-500/50 bg-green-500/10' : `bg-gradient-to-br ${colorClass} hover:scale-[1.02]`}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${task.completed ? 'bg-green-500/30' : 'bg-purple-700/50'}`}>
          {task.completed ? '✅' : taskIcons[task.task_type] || '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{task.title}</h3>
          {task.description && <p className="text-gray-400 text-sm truncate">{task.description}</p>}
          <div className="flex items-center gap-2 mt-1">
            {task.is_partner && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">Partner</span>}
            <span className="text-xs text-gray-500 capitalize">{task.task_section || 'Main'}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {task.completed ? <CheckCircle className="text-green-400" size={24} /> : loading ? <div className="loader w-6 h-6 !border-2 !border-t-green-brand" /> : (
            <div className="flex items-center gap-2">
              <div><p className="text-gold-400 font-bold">+{task.reward_points}</p><p className="text-gray-500 text-xs">pts</p></div>
              <ChevronRight className="text-gray-500" size={20} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── CommunityTaskCard ──────────────────────────────────────────────────────────

function CommunityTaskCard({ ctask, joined, onClick }: { ctask: CommunityTask; joined: boolean; onClick: () => void }) {
  const progress = (ctask.members_joined / ctask.member_amount) * 100;
  return (
    <div className={`glass-card p-4 transition-all border ${joined ? 'opacity-60 border-green-500/50' : 'border-gold-500/30 hover:scale-[1.02]'}`}>
      <div className="flex items-center gap-4 mb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gold-500/20">
          {ctask.icon_emoji || '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{ctask.title}</h3>
          {ctask.description && <p className="text-gray-400 text-sm truncate">{ctask.description}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400">Community</span>
            <span className="text-xs text-gray-500">{ctask.points_per_member} pts/member</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {joined ? <CheckCircle className="text-green-400" size={24} /> : (
            <div><p className="text-gold-400 font-bold">+{ctask.points_per_member}</p><p className="text-gray-500 text-xs">pts</p></div>
          )}
        </div>
      </div>
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400 text-xs">Members joined</span>
          <span className="text-gold-400 text-xs font-bold">{ctask.members_joined}/{ctask.member_amount}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, #fbbf24, #00c853)' }} />
        </div>
      </div>
      {/* Bot verify notice */}
      {ctask.verification_method === 'bot_verify' && !ctask.is_bot_admin_verified && (
        <div className="mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
          <Bot className="text-yellow-400" size={16} />
          <p className="text-yellow-400 text-xs">Give admin to bot @{ctask.bot_username || 'bot'} to verify</p>
        </div>
      )}
      {!joined && (
        <button onClick={onClick} className="w-full py-2 rounded-lg bg-gradient-to-r from-gold-500 to-gold-400 text-black font-bold text-sm">
          Join & Earn +{ctask.points_per_member} pts
        </button>
      )}
    </div>
  );
}

// ── AddTaskModal ───────────────────────────────────────────────────────────────

function AddTaskModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user, haptic, refreshUser } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [form, setForm] = useState({
    title: '', description: '', channel_link: '', icon_emoji: '📋',
    image_url: '', verification_method: 'auto' as 'auto' | 'bot_verify',
    bot_username: '', member_amount: MIN_MEMBERS,
  });
  const [loading, setLoading] = useState(false);

  const totalCost = form.member_amount * POST_COST_PER_MEMBER;
  const userPoints = user?.points || 0;
  const canAfford = userPoints >= totalCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.title.trim() || !canAfford) return;
    haptic('light');
    setLoading(true);
    try {
      // Deduct points from user
      const { error: deductError } = await supabase
        .from('users')
        .update({ points: user.points - totalCost })
        .eq('id', user.id);
      if (deductError) throw deductError;

      // Create community task
      const { error: insertError } = await supabase.from('community_tasks').insert({
        user_id: user.id,
        title: form.title,
        description: form.description,
        channel_link: form.channel_link,
        icon_emoji: form.icon_emoji,
        image_url: form.image_url,
        verification_method: form.verification_method,
        bot_username: form.bot_username || null,
        member_amount: form.member_amount,
        points_per_member: POINTS_PER_MEMBER,
        total_cost: totalCost,
        status: 'active',
      });
      if (insertError) throw insertError;

      await refreshUser();
      showSuccess('Task Created!', `Your community task is now live. ${totalCost} points deducted.`);
      haptic('success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating community task:', err);
      showError('Error', 'Could not create task. Check your balance.');
      haptic('error');
    } finally {
      setLoading(false);
    }
  }

  const TASK_ICONS = ['📋', '📢', '👥', '🤖', '📰', '🤝', '🎁', '⭐', '🔥', '💰', '🎮', '📱', '💬', '✨', '🎯'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Add Community Task</h3>
          <button onClick={onClose} className="text-gray-500"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" required />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Channel Link</label>
            <input type="text" value={form.channel_link} onChange={(e) => setForm({ ...form, channel_link: e.target.value })} placeholder="https://t.me/yourchannel" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {TASK_ICONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setForm({ ...form, icon_emoji: icon })}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center ${form.icon_emoji === icon ? 'bg-purple-600 border-2 border-purple-400' : 'bg-white/10'}`}>{icon}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Image URL (optional)</label>
            <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://example.com/image.png" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Verification Method</label>
            <div className="space-y-2">
              <button type="button" onClick={() => setForm({ ...form, verification_method: 'auto' })}
                className={`w-full p-3 rounded-lg text-left ${form.verification_method === 'auto' ? 'bg-purple-600 border-2 border-purple-400' : 'bg-white/10 border border-white/10'}`}>
                <p className="text-white font-semibold text-sm">Auto Verify</p>
                <p className="text-gray-400 text-xs">Complete after clicking</p>
              </button>
              <button type="button" onClick={() => setForm({ ...form, verification_method: 'bot_verify' })}
                className={`w-full p-3 rounded-lg text-left ${form.verification_method === 'bot_verify' ? 'bg-purple-600 border-2 border-purple-400' : 'bg-white/10 border border-white/10'}`}>
                <p className="text-white font-semibold text-sm">Bot Verify</p>
                <p className="text-gray-400 text-xs">Check membership via bot</p>
              </button>
            </div>
          </div>
          {form.verification_method === 'bot_verify' && (
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Bot Username</label>
              <input type="text" value={form.bot_username} onChange={(e) => setForm({ ...form, bot_username: e.target.value })} placeholder="your_bot (without @)" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
              <p className="text-yellow-400 text-xs mt-1">Give admin to your bot in the channel, then users will be asked to verify.</p>
            </div>
          )}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Member Amount (min {MIN_MEMBERS})</label>
            <input type="number" value={form.member_amount} onChange={(e) => setForm({ ...form, member_amount: Math.max(MIN_MEMBERS, parseInt(e.target.value) || MIN_MEMBERS) })} min={MIN_MEMBERS} className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
          </div>
          {/* Cost summary */}
          <div className="p-3 rounded-xl bg-white/5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Cost per member</span>
              <span className="text-white">{POST_COST_PER_MEMBER} pts</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total members</span>
              <span className="text-white">{form.member_amount}</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex items-center justify-between">
              <span className="text-white font-semibold">Total Cost</span>
              <span className={`font-bold ${canAfford ? 'text-gold-400' : 'text-red-400'}`}>{totalCost} pts</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Your balance</span>
              <span className={canAfford ? 'text-green-400' : 'text-red-400'}>{userPoints} pts</span>
            </div>
          </div>
          {!canAfford && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <AlertCircle className="text-red-400" size={18} />
              <p className="text-red-400 text-sm">Insufficient balance. <button type="button" onClick={() => { onClose(); }} className="underline">Buy points</button></p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={!canAfford || loading} className={`flex-1 btn-neon-gold ${!canAfford ? 'opacity-50' : ''}`}>{loading ? 'Creating...' : 'Create Task'}</button>
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/10 text-gray-400">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PartnerSubmitModal ─────────────────────────────────────────────────────────

function PartnerSubmitModal({ onClose }: { onClose: () => void }) {
  const { user, haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [postLink, setPostLink] = useState('');
  const [channelName, setChannelName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !postLink.trim()) return;
    haptic('light');
    setLoading(true);
    try {
      const { error } = await supabase.from('partner_submissions').insert({
        user_id: user.id,
        post_link: postLink,
        channel_name: channelName || null,
        status: 'pending',
      });
      if (error) throw error;
      showSuccess('Submitted!', 'Your partner task submission is pending review.');
      haptic('success');
      onClose();
    } catch (err) {
      console.error('Error submitting partner task:', err);
      showError('Error', 'Could not submit. Try again.');
      haptic('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Ad Partner Task</h3>
          <button onClick={onClose} className="text-gray-500"><X size={24} /></button>
        </div>

        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-4">
          <p className="text-purple-300 text-sm">
            If you have a Telegram channel with 1000+ members, post about our mini app and submit your post link. After review, your task will be added as a Partner Task.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Post Link *</label>
            <input type="text" value={postLink} onChange={(e) => setPostLink(e.target.value)} placeholder="https://t.me/yourchannel/123" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" required />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Channel Name</label>
            <input type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="@yourchannel" className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 btn-neon-gold flex items-center justify-center gap-2">
              <Send size={18} /> {loading ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/10 text-gray-400">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
