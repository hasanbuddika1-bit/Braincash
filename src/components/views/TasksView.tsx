import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { CheckCircle, ExternalLink, ChevronRight, Target, Handshake, MoreHorizontal, Trophy, Flame } from 'lucide-react';
import type { Task } from '../../types';

type TaskSection = 'main' | 'partner' | 'other';

export function TasksView() {
  const { user, tasks, refreshTasks, addPoints, haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<TaskSection>('main');

  const handleTaskClick = async (task: Task) => {
    if (task.completed || !user) return;

    haptic('light');

    // Open link
    if (task.link) {
      window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank');
    }

    setCompletingId(task.id);

    // Simulate verification delay
    setTimeout(async () => {
      try {
        // Complete the task
        const { error: completionError } = await supabase.from('task_completions').insert({
          user_id: user.id,
          task_id: task.id,
          status: 'completed',
        });

        if (completionError) throw completionError;

        // Add points
        await addPoints(task.reward_points);

        // Update referral task bonus if this user was referred
        const { data: referral } = await supabase
          .from('referrals')
          .select('referrer_id')
          .eq('referred_id', user.id)
          .single();

        if (referral) {
          // Give referrer 50 pts for main task completion
          if (task.task_section === 'main') {
            await supabase.rpc('add_points', { user_id: referral.referrer_id, amount: 50 });
            await supabase
              .from('referrals')
              .update({ task_bonus: 50, total_commission: 50 })
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

  // Filter tasks by section
  const mainTasks = tasks.filter((t) => t.task_section === 'main' || (!t.task_section && !t.is_partner));
  const partnerTasks = tasks.filter((t) => t.task_section === 'partner' || t.is_partner);
  const otherTasks = tasks.filter((t) => t.task_section === 'other');

  const sections: { key: TaskSection; label: string; icon: React.ReactNode; tasks: Task[]; color: string }[] = [
    { key: 'main', label: 'Main', icon: <Target size={16} />, tasks: mainTasks, color: 'from-green-600 to-green-brand' },
    { key: 'partner', label: 'Partner', icon: <Handshake size={16} />, tasks: partnerTasks, color: 'from-purple-600 to-blue-600' },
    { key: 'other', label: 'Other', icon: <MoreHorizontal size={16} />, tasks: otherTasks, color: 'from-gold-500 to-gold-400' },
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
        <div className="absolute top-0 right-0 text-6xl opacity-20 transform translate-x-2 -translate-y-2">
          🏆
        </div>
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
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? (earnedReward / totalReward) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #00c853, #fbbf24)',
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Completed</p>
              <p className="text-green-400 font-bold">{earnedReward} pts</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Available</p>
              <p className="text-gold-400 font-bold">{totalReward - earnedReward} pts</p>
            </div>
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
            <button
              key={section.key}
              onClick={() => {
                haptic('light');
                setActiveSection(section.key);
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                isActive
                  ? `bg-gradient-to-r ${section.color} text-white shadow-lg`
                  : 'bg-white/10 text-gray-400 hover:bg-white/15'
              }`}
            >
              {section.icon}
              <span>{section.label}</span>
              {total > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                  {completed}/{total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {activeTasks.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-3 opacity-50">📭</div>
            <p className="text-gray-400">No tasks in this section yet</p>
            <p className="text-gray-500 text-sm mt-1">Check back later for new tasks!</p>
          </div>
        ) : (
          activeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task)}
              loading={completingId === task.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  loading?: boolean;
}

function TaskCard({ task, onClick, loading }: TaskCardProps) {
  const taskIcons: Record<string, string> = {
    channel: '📢',
    group: '👥',
    bot: '🤖',
    post: '📰',
    partner: '🤝',
  };

  const sectionColors: Record<string, string> = {
    main: 'from-green-500/20 to-green-600/20 border-green-500/30',
    partner: 'from-purple-500/20 to-blue-500/20 border-purple-500/30',
    other: 'from-gold-500/20 to-gold-400/20 border-gold-500/30',
  };

  const colorClass = sectionColors[task.task_section || 'main'] || sectionColors.main;

  return (
    <button
      onClick={onClick}
      disabled={task.completed || loading}
      className={`glass-card p-4 w-full text-left transition-all border ${
        task.completed
          ? 'opacity-60 border-green-500/50 bg-green-500/10'
          : `bg-gradient-to-br ${colorClass} hover:scale-[1.02]`
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
          task.completed
            ? 'bg-green-500/30'
            : 'bg-purple-700/50'
        }`}>
          {task.completed ? '✅' : taskIcons[task.task_type] || '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{task.title}</h3>
          {task.description && (
            <p className="text-gray-400 text-sm truncate">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {task.is_partner && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">Partner</span>
            )}
            <span className="text-xs text-gray-500 capitalize">{task.task_section || 'Main'}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {task.completed ? (
            <CheckCircle className="text-green-400" size={24} />
          ) : loading ? (
            <div className="loader w-6 h-6 !border-2 !border-t-green-brand" />
          ) : (
            <div className="flex items-center gap-2">
              <div>
                <p className="text-gold-400 font-bold">+{task.reward_points}</p>
                <p className="text-gray-500 text-xs">pts</p>
              </div>
              <ChevronRight className="text-gray-500" size={20} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
