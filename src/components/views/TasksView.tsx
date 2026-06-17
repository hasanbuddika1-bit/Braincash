import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { CheckCircle, Circle, ExternalLink, Clock } from 'lucide-react';
import type { Task } from '../../types';

export function TasksView() {
  const { user, tasks, refreshTasks, addPoints, haptic } = useApp();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleTaskClick = async (task: Task) => {
    if (task.completed || !user) return;

    haptic('light');

    // Open link
    if (task.link) {
      window.Telegram?.WebApp?.openLink?.(task.link) || window.open(task.link, '_blank');
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

        // Refresh tasks
        await refreshTasks();

        haptic('success');
      } catch (error) {
        console.error('Error completing task:', error);
        haptic('error');
      } finally {
        setCompletingId(null);
      }
    }, 2000);
  };

  const mainTasks = tasks.filter((t) => !t.is_partner);
  const partnerTasks = tasks.filter((t) => t.is_partner);

  const totalReward = tasks.reduce((sum, t) => sum + t.reward_points, 0);
  const earnedReward = tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.reward_points, 0);

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">📋</span>
          Tasks
        </h1>
        <p className="text-purple-300 mt-2">Complete tasks to earn points!</p>
      </div>

      {/* Progress Card */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-gray-400 text-sm">Progress</p>
            <p className="text-xl font-bold text-white">
              {tasks.filter((t) => t.completed).length}/{tasks.length} tasks
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Earned</p>
            <p className="text-xl font-bold text-gold-400">{earnedReward} pts</p>
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${(earnedReward / totalReward) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Tasks */}
      {mainTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="text-xl">🎯</span>
            Main Tasks
          </h2>
          <div className="space-y-3">
            {mainTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                loading={completingId === task.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Partner Tasks */}
      {partnerTasks.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="text-xl">🤝</span>
            Partner Tasks
          </h2>
          <div className="space-y-3">
            {partnerTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                loading={completingId === task.id}
              />
            ))}
          </div>
        </div>
      )}
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

  return (
    <button
      onClick={onClick}
      disabled={task.completed || loading}
      className={`glass-card p-4 w-full text-left transition-all ${
        task.completed ? 'opacity-60' : 'hover:border-purple-500/50'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
          task.completed ? 'bg-green-500/20' : 'bg-purple-700/50'
        }`}>
          {task.completed ? '✅' : taskIcons[task.task_type] || '📋'}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">{task.title}</h3>
          {task.description && (
            <p className="text-gray-400 text-sm">{task.description}</p>
          )}
        </div>
        <div className="text-right">
          {task.completed ? (
            <CheckCircle className="text-green-400" size={24} />
          ) : loading ? (
            <div className="loader w-6 h-6 !border-2 !border-t-purple-400" />
          ) : (
            <div>
              <p className="text-gold-400 font-bold">+{task.reward_points}</p>
              <ExternalLink className="text-gray-500 mx-auto" size={16} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
