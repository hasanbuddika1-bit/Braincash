import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { PlayCircle, Gift, Zap, Clock, Tv, Target, CheckCircle, ChevronRight, Flame, X, AlertCircle } from 'lucide-react';

const AD_PROVIDERS = [
  { id: 'adgamer', name: 'AdGamer', logo: '🎮' },
  { id: 'monetag', name: 'Monetag', logo: '📊' },
  { id: 'gigapub', name: 'Gigapub', logo: '🚀' },
];

const INITIAL_TASKS_SHOWN = 4;

// Verify popup for channel membership check
function VerifyPopup({
  task,
  onVerify,
  onClose,
  isVerifying,
  verificationStatus
}: {
  task: { id: string; title: string; link?: string; reward_points: number; icon_emoji?: string; image_url?: string; task_type: string; verification_method?: string };
  onVerify: () => void;
  onClose: () => void;
  isVerifying: boolean;
  verificationStatus: 'pending' | 'success' | 'failed' | null;
}) {
  const taskIcons: Record<string, string> = {
    channel: '📢',
    group: '👥',
    bot: '🤖',
    post: '📰',
    partner: '🤝',
  };

  const isBotVerify = task.verification_method === 'bot_verify';
  const isTrustVerify = task.verification_method === 'trust_verify';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
      <div className="mx-4 w-full max-w-sm rounded-3xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0a0d1a 0%, #1a0a2e 100%)',
        border: '1px solid rgba(124,58,237,0.4)',
      }}>
        <div className="p-6 text-center">
          {/* Task Image or Icon */}
          {task.image_url ? (
            <img src={task.image_url} alt={task.title} className="w-20 h-20 mx-auto mb-4 rounded-xl object-cover" />
          ) : (
            <div className="text-5xl mb-4">{task.icon_emoji || taskIcons[task.task_type] || '📋'}</div>
          )}

          <h3 className="text-white font-bold text-lg mb-2">{task.title}</h3>
          <p className="text-gold-400 font-bold mb-4">+{task.reward_points} pts</p>

          {verificationStatus === null && (
            <>
              {isTrustVerify ? (
                <>
                  <p className="text-gray-400 text-sm mb-6">
                    Click the button below to open the link. Your completion will be manually verified.
                  </p>

                  {task.link && (
                    <button
                      onClick={() => {
                        window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank');
                      }}
                      className="w-full py-3 rounded-xl font-bold mb-3"
                      style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)', color: 'white' }}
                    >
                      Open {task.task_type === 'channel' ? 'Channel' : task.task_type === 'group' ? 'Group' : 'Link'}
                    </button>
                  )}

                  <button
                    onClick={onVerify}
                    disabled={isVerifying}
                    className="w-full py-3 rounded-xl font-bold"
                    style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814' }}
                  >
                    {isVerifying ? 'Submitting...' : 'Mark as Done'}
                  </button>
                </>
              ) : isBotVerify ? (
                <>
                  <p className="text-gray-400 text-sm mb-6">
                    Click the button below to open the channel/group, then come back and click "Check" to verify your membership.
                  </p>

                  {task.link && (
                    <button
                      onClick={() => {
                        window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank');
                      }}
                      className="w-full py-3 rounded-xl font-bold mb-3"
                      style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)', color: 'white' }}
                    >
                      Open {task.task_type === 'channel' ? 'Channel' : task.task_type === 'group' ? 'Group' : 'Link'}
                    </button>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-white/10 text-gray-400 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onVerify}
                      disabled={isVerifying}
                      className="flex-1 py-3 rounded-xl font-bold"
                      style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814' }}
                    >
                      {isVerifying ? 'Checking...' : 'Check Membership'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-6">
                    Click the button below to complete this task.
                  </p>

                  {task.link && (
                    <button
                      onClick={() => {
                        window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank');
                      }}
                      className="w-full py-3 rounded-xl font-bold mb-3"
                      style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)', color: 'white' }}
                    >
                      Open {task.task_type === 'channel' ? 'Channel' : task.task_type === 'group' ? 'Group' : 'Link'}
                    </button>
                  )}

                  <button
                    onClick={onVerify}
                    disabled={isVerifying}
                    className="w-full py-3 rounded-xl font-bold"
                    style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814' }}
                  >
                    {isVerifying ? 'Completing...' : 'Complete Task'}
                  </button>
                </>
              )}
            </>
          )}

          {verificationStatus === 'success' && (
            <div className="py-4">
              <div className="text-4xl mb-3 animate-bounce">✅</div>
              <p className="text-green-400 font-bold mb-4">Task completed!</p>
            </div>
          )}

          {verificationStatus === 'failed' && (
            <div className="py-4">
              <AlertCircle className="text-yellow-400 w-12 h-12 mx-auto mb-3" />
              {isBotVerify ? (
                <>
                  <p className="text-yellow-400 font-bold mb-2">You haven't joined yet!</p>
                  <p className="text-gray-400 text-sm mb-4">Please join the channel/group first, then try again.</p>
                  <button onClick={onVerify} className="w-full py-3 rounded-xl font-bold" style={{ background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814' }}>
                    Check Again
                  </button>
                </>
              ) : (
                <p className="text-yellow-400 font-bold mb-4">Please try again later.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdsView() {
  const { user, tasks, refreshTasks, addPoints, haptic } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [watching, setWatching] = useState(false);
  const [currentAd, setCurrentAd] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [visibleTasks, setVisibleTasks] = useState(INITIAL_TASKS_SHOWN);
  const [showVerifyPopup, setShowVerifyPopup] = useState<typeof tasks[0] | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed' | null>(null);

  // Get all tasks (main, partner, other)
  const allIncompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Show only visible count of incomplete tasks
  const displayedTasks = allIncompleteTasks.slice(0, visibleTasks);
  const hasMoreTasks = allIncompleteTasks.length > visibleTasks;

  // Auto-load more tasks when one is completed
  const handleTaskComplete = () => {
    refreshTasks();
    // If we have more tasks waiting, increment visible count
    if (allIncompleteTasks.length > visibleTasks) {
      setVisibleTasks(prev => prev + 1);
    }
  };

  // Complete task with proper verification
  const completeTask = async (task: typeof tasks[0]) => {
    if (!user) return;

    const verificationMethod = task.verification_method || 'auto';

    // For trust_verify, just mark as pending (manual admin approval)
    if (verificationMethod === 'trust_verify') {
      setIsVerifying(true);
      setVerificationStatus(null);

      try {
        // Insert as pending - admin will approve later
        const { error: completionError } = await supabase.from('task_completions').insert({
          user_id: user.id,
          task_id: task.id,
          status: 'pending',
        });

        setIsVerifying(false);

        if (completionError) {
          if (completionError.message?.includes('duplicate')) {
            showError('Already Submitted', 'This task is pending approval.');
          } else {
            throw completionError;
          }
        } else {
          setVerificationStatus('success');
          haptic('success');
          showSuccess('Task Submitted', 'Your completion is pending admin approval.');

          setTimeout(() => {
            setShowVerifyPopup(null);
            setVerificationStatus(null);
          }, 1500);
        }
      } catch (error) {
        console.error('Error submitting task:', error);
        setIsVerifying(false);
        setVerificationStatus('failed');
        showError('Submission Failed', 'Could not submit task. Please try again.');
      }
      return;
    }

    // For bot_verify, check membership via bot
    if (verificationMethod === 'bot_verify' && task.link) {
      setIsVerifying(true);
      setVerificationStatus(null);

      try {
        // Extract chat username/id from link
        const chatId = task.link.replace('https://t.me/', '').replace('@', '').replace('/', '');

        // Call edge function to check membership
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_membership',
            user_id: user.telegram_id,
            chat_id: chatId,
          }),
        });

        const data = await response.json();
        setIsVerifying(false);

        if (data.is_member) {
          setVerificationStatus('success');
          haptic('success');

          // Complete the task
          await completeTaskRecord(task);
        } else {
          setVerificationStatus('failed');
          haptic('error');
        }
      } catch (error) {
        console.error('Error checking membership:', error);
        setIsVerifying(false);
        setVerificationStatus('failed');
        showError('Verification Failed', 'Could not verify membership. Please try again.');
      }
      return;
    }

    // For auto verification, just complete
    setIsVerifying(true);
    setVerificationStatus(null);

    try {
      await completeTaskRecord(task);
      setVerificationStatus('success');
      setIsVerifying(false);
    } catch (error) {
      console.error('Error completing task:', error);
      setIsVerifying(false);
      setVerificationStatus('failed');
      showError('Failed', 'Could not complete task.');
    }
  };

  // Helper to actually record the task completion
  const completeTaskRecord = async (task: typeof tasks[0]) => {
    const { error: completionError } = await supabase.from('task_completions').insert({
      user_id: user!.id,
      task_id: task.id,
      status: 'completed',
    });

    if (completionError) throw completionError;

    await addPoints(task.reward_points);

    // Update referral task bonus - only once
    const { data: referral } = await supabase
      .from('referrals')
      .select('referrer_id, task_bonus')
      .eq('referred_id', user!.id)
      .single();

    if (referral && referral.task_bonus === 0 && task.task_section === 'main') {
      await supabase.rpc('add_points', { user_id: referral.referrer_id, amount: 50 });
      await supabase
        .from('referrals')
        .update({ task_bonus: 50, total_commission: 50 })
        .eq('referred_id', user!.id);
    }

    await handleTaskComplete();
    showSuccess(`+${task.reward_points} Points!`, `Task completed.`);

    setTimeout(() => {
      setShowVerifyPopup(null);
      setVerificationStatus(null);
    }, 1500);
  };

  const watchAd = async (provider: string, adType: 'rewarded' | 'interstitial') => {
    if (watching || !user) return;

    haptic('light');
    setWatching(true);
    setCurrentAd(provider);

    // Simulate ad watching (in production, integrate real ad SDK)
    const adDuration = adType === 'rewarded' ? 15 : 5;
    setCountdown(adDuration);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Wait for ad to complete
    setTimeout(async () => {
      try {
        // Calculate reward (4-8 points)
        const reward = Math.floor(Math.random() * 5) + 4;

        // Record ad view
        await supabase.from('ad_views').insert({
          user_id: user.id,
          ad_provider: provider,
          ad_type: adType,
          reward,
        });

        // Add points
        await addPoints(reward);

        // Check if this is the 10th ad for referral bonus
        const { count } = await supabase
          .from('ad_views')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Update referral ad count and give bonus at 10 ads
        if (count && count % 10 === 0) {
          const { data: referral } = await supabase
            .from('referrals')
            .select('referrer_id, referred_ad_count')
            .eq('referred_id', user.id)
            .single();

          if (referral) {
            const newAdCount = (referral.referred_ad_count || 0) + 10;
            await supabase
              .from('referrals')
              .update({ referred_ad_count: newAdCount })
              .eq('referred_id', user.id);

            // Give referrer 50 pts bonus at 10 ads milestone
            if (newAdCount >= 10) {
              await supabase.rpc('add_points', { user_id: referral.referrer_id, amount: 50 });
            }
          }
        }

        setLastReward(reward);
        showSuccess(`+${reward} Points Earned!`, 'Ad reward added to your balance.');
        haptic('success');
      } catch (error) {
        console.error('Error recording ad view:', error);
        showError('Failed', 'Could not record ad. Please try again.');
        haptic('error');
      } finally {
        setWatching(false);
        setCurrentAd(null);
      }
    }, adDuration * 1000);
  };

  const handleTaskClick = async (task: typeof tasks[0]) => {
    if (task.completed || !user || completingTaskId) return;

    haptic('light');

    // Check verification method
    const verificationMethod = task.verification_method || 'auto';

    // For bot_verify or trust_verify, show verification popup
    if (verificationMethod === 'bot_verify' || verificationMethod === 'trust_verify') {
      setShowVerifyPopup(task);
      return;
    }

    // For auto verification, open link and complete after delay
    if (task.link) {
      window.Telegram?.WebApp?.openTelegramLink?.(task.link) || window.open(task.link, '_blank');
    }

    setCompletingTaskId(task.id);

    setTimeout(async () => {
      try {
        const { error: completionError } = await supabase.from('task_completions').insert({
          user_id: user.id,
          task_id: task.id,
          status: 'completed',
        });

        if (completionError) throw completionError;

        await addPoints(task.reward_points);

        // Update referral task bonus - only once
        const { data: referral } = await supabase
          .from('referrals')
          .select('referrer_id, task_bonus')
          .eq('referred_id', user.id)
          .single();

        if (referral && referral.task_bonus === 0 && task.task_section === 'main') {
          await supabase.rpc('add_points', { user_id: referral.referrer_id, amount: 50 });
          await supabase
            .from('referrals')
            .update({ task_bonus: 50, total_commission: 50 })
            .eq('referred_id', user.id);
        }

        await handleTaskComplete();
        showSuccess(`+${task.reward_points} Points!`, `Task completed.`);
        haptic('success');
      } catch (error) {
        console.error('Error completing task:', error);
        showError('Task Failed', 'Could not complete task.');
        haptic('error');
      } finally {
        setCompletingTaskId(null);
      }
    }, 2000);
  };

  const taskIcons: Record<string, string> = {
    channel: '📢',
    group: '👥',
    bot: '🤖',
    post: '📰',
    partner: '🤝',
  };

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">📺</span>
          Watch & Earn
        </h1>
        <p className="text-green-400 mt-2">Complete tasks and watch ads to earn points!</p>
      </div>

      {/* Balance Card */}
      <div className="glass-card p-4 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.15) 0%, rgba(251,191,36,0.1) 100%)' }}>
        <div className="absolute top-0 right-0 text-6xl opacity-20 transform translate-x-2 -translate-y-2">
          💰
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-600 to-green-brand flex items-center justify-center text-2xl">
            💎
          </div>
          <div className="flex-1">
            <p className="text-gray-400 text-sm">Your Balance</p>
            <p className="text-2xl font-bold text-green-400">{user?.points?.toLocaleString() || 0} pts</p>
            <p className="text-gray-500 text-xs">~${((user?.points || 0) * 0.0001).toFixed(2)} USDT</p>
          </div>
          <Flame className="text-orange-400" size={32} />
        </div>
      </div>

      {/* Tasks Section */}
      {displayedTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="text-green-400" size={20} />
            <h2 className="text-white font-semibold">Quick Tasks</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
              {allIncompleteTasks.length} available
            </span>
          </div>

          <div className="space-y-3">
            {displayedTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => handleTaskClick(task)}
                disabled={completingTaskId === task.id}
                className="glass-card p-3 w-full text-left border border-green-500/30 bg-gradient-to-r from-green-500/10 to-green-600/5 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-xl overflow-hidden">
                    {task.image_url ? (
                      <img src={task.image_url} alt={task.title} className="w-full h-full object-cover" />
                    ) : (
                      task.icon_emoji || taskIcons[task.task_type] || '📋'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{task.title}</p>
                    <p className="text-green-400 text-xs font-bold">+{task.reward_points} pts</p>
                  </div>
                  {completingTaskId === task.id ? (
                    <div className="loader w-5 h-5 !border-2 !border-t-green-brand" />
                  ) : (
                    <ChevronRight className="text-gray-500" size={20} />
                  )}
                </div>
              </button>
            ))}
          </div>

          {hasMoreTasks && (
            <button
              onClick={() => setVisibleTasks(prev => prev + INITIAL_TASKS_SHOWN)}
              className="w-full mt-3 py-2 text-center text-green-400 text-sm font-semibold"
            >
              Load {allIncompleteTasks.length - visibleTasks} more tasks
            </button>
          )}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-400" size={16} />
            <span className="text-gray-400 text-sm">{completedTasks.length} tasks completed</span>
          </div>
        </div>
      )}

      {/* Last Reward Animation */}
      {lastReward && (
        <div className="glass-card p-4 mb-6 text-center animate-scale-in bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-green-400 font-bold text-xl">+{lastReward} Points Earned!</p>
          <button
            onClick={() => setLastReward(null)}
            className="text-gray-400 text-sm mt-2"
          >
            Close
          </button>
        </div>
      )}

      {/* Rewarded Video Ads */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="text-gold-400" size={20} />
          <h2 className="text-white font-semibold">Rewarded Video Ads</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">Watch a short video to earn points instantly</p>

        <div className="grid grid-cols-1 gap-3">
          {AD_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => watchAd(provider.id, 'rewarded')}
              disabled={watching}
              className={`glass-card p-4 flex items-center gap-4 transition-all ${
                watching && currentAd === provider.id
                  ? 'bg-purple-600/30 border-purple-500/50'
                  : watching
                  ? 'opacity-50'
                  : 'hover:border-gold-500/50'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-purple-700/50 flex items-center justify-center text-3xl">
                {provider.logo}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-bold">{provider.name}</h3>
                <p className="text-gray-400 text-sm">Watch Video</p>
              </div>
              <div className="text-right">
                {watching && currentAd === provider.id ? (
                  <div className="flex items-center gap-2">
                    <Clock className="text-gold-400 animate-pulse" size={20} />
                    <span className="text-gold-400 font-bold">{countdown}s</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PlayCircle className="text-blue-400" size={28} />
                    <div>
                      <p className="text-gold-400 font-bold">+4-8</p>
                      <p className="text-gray-500 text-xs">pts</p>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Ads */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="text-blue-400" size={20} />
          <h2 className="text-white font-semibold">Quick Ads</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">Watch a short ad for instant points</p>

        <div className="grid grid-cols-3 gap-3">
          {AD_PROVIDERS.map((provider) => (
            <button
              key={`quick-${provider.id}`}
              onClick={() => watchAd(provider.id, 'interstitial')}
              disabled={watching}
              className={`glass-card p-4 flex flex-col items-center gap-2 transition-all ${
                watching ? 'opacity-50' : 'hover:border-blue-500/50'
              }`}
            >
              <div className="text-3xl">{provider.logo}</div>
              <p className="text-white text-sm font-semibold">{provider.name}</p>
              <p className="text-gold-400 text-xs font-bold">+4-8 pts</p>
            </button>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <span className="text-xl">💡</span>
          How it works
        </h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Watch a short video ad (5-15 seconds)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Earn 4-8 points per ad watched
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Watch as many ads as you want
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            500 points = $0.05 USDT
          </li>
        </ul>
      </div>

      {/* Watching Modal */}
      {watching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
          <div className="glass-card p-8 text-center max-w-sm w-[90%]">
            <div className="text-6xl mb-4 animate-pulse">📺</div>
            <h3 className="text-xl font-bold text-white mb-2">Watch Ad</h3>
            <p className="text-gray-400 mb-4">Please wait while the ad plays...</p>
            <div className="w-full h-4 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((15 - countdown) / 15) * 100}%`,
                  background: 'linear-gradient(90deg, #00c853, #fbbf24)',
                }}
              />
            </div>
            <p className="text-gold-400 font-bold text-2xl">{countdown}s</p>
          </div>
        </div>
      )}

      {/* Verification Popup */}
      {showVerifyPopup && (
        <VerifyPopup
          task={showVerifyPopup}
          onVerify={() => completeTask(showVerifyPopup)}
          onClose={() => { setShowVerifyPopup(null); setVerificationStatus(null); }}
          isVerifying={isVerifying}
          verificationStatus={verificationStatus}
        />
      )}
    </div>
  );
}
