import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { User, Task, Game, Withdrawal, LeaderboardEntry, ViewType } from '../types';

const CACHE_KEY = 'brain_cash_user';
const VIEW_HISTORY_KEY = 'brain_cash_view_history';

function saveUserCache(u: User) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(u)); } catch {}
}
function loadUserCache(): User | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch { return null; }
}
function clearUserCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

// Views that should not be in history
const EXCLUDED_FROM_HISTORY: ViewType[] = ['game', 'admin'];

interface AppContextType {
  user: User | null;
  tasks: Task[];
  games: Game[];
  withdrawals: Withdrawal[];
  leaderboard: LeaderboardEntry[];
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  goBack: () => void;
  canGoBack: boolean;
  selectedGame: Game | null;
  setSelectedGame: (game: Game | null) => void;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshGames: () => Promise<void>;
  refreshWithdrawals: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  addPoints: (amount: number) => Promise<void>;
  recordActivity: (type: string, details?: Record<string, unknown>) => Promise<void>;
  tgUser: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  } | null;
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  // Seed from cache immediately so balance shows on refresh before network resolves
  const [user, setUserState] = useState<User | null>(() => loadUserCache());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentView, setCurrentViewState] = useState<ViewType>('home');
  const [viewHistory, setViewHistory] = useState<ViewType[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<AppContextType['tgUser']>(null);

  // Wrap setUser to always persist to cache
  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) saveUserCache(u); else clearUserCache();
  }, []);

  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        if (type === 'success' || type === 'error' || type === 'warning') {
          tg.HapticFeedback.notificationOccurred(type);
        } else {
          tg.HapticFeedback.impactOccurred(type);
        }
      }
    } catch {}
  }, []);

  // Track view history for back navigation
  const setCurrentView = useCallback((view: ViewType) => {
    if (!EXCLUDED_FROM_HISTORY.includes(currentView)) {
      setViewHistory((prev) => [...prev, currentView]);
    }
    setCurrentViewState(view);
  }, [currentView]);

  const goBack = useCallback(() => {
    setViewHistory((prev) => {
      if (prev.length > 0) {
        const lastView = prev[prev.length - 1];
        setCurrentViewState(lastView);
        return prev.slice(0, -1);
      }
      // Default to home if no history
      setCurrentViewState('home');
      return [];
    });
  }, []);

  const canGoBack = viewHistory.length > 0;

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      try { tg.setHeaderColor('#080814'); } catch {}
      try { tg.setBackgroundColor('#080814'); } catch {}

      if (tg.initDataUnsafe?.user && tg.initDataUnsafe.user.id) {
        setTgUser({
          id: tg.initDataUnsafe.user.id,
          first_name: tg.initDataUnsafe.user.first_name,
          last_name: tg.initDataUnsafe.user.last_name,
          username: tg.initDataUnsafe.user.username,
          photo_url: tg.initDataUnsafe.user.photo_url,
        });
        return;
      }
    }
    // Fallback for development/testing
    const devId = import.meta.env.DEV ? 5419054691 : 0;
    setTgUser({ id: devId, first_name: devId ? 'Admin' : 'Guest', username: devId ? 'admin' : 'guest' });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tgUser) return;

    // Admin Telegram ID
    const ADMIN_TELEGRAM_ID = 5419054691;
    const isAdmin = tgUser.id === ADMIN_TELEGRAM_ID;

    if (tgUser.id === 0) {
      const now = new Date().toISOString();
      const demo: User = {
        id: 'demo',
        telegram_id: tgUser.id,
        username: tgUser.username || 'guest',
        first_name: tgUser.first_name || 'Guest',
        last_name: '',
        photo_url: '',
        points: 0,
        total_earned: 0,
        total_withdrawn: 0,
        referral_code: 'DEMO',
        referred_by: undefined,
        is_admin: false,
        is_banned: false,
        is_verified: false,
        last_active: now,
        created_at: now,
        updated_at: now,
      };
      setUser(demo);
      return;
    }

    if (!isSupabaseConfigured) {
      const now = new Date().toISOString();
      const demo: User = {
        id: 'demo_' + tgUser.id,
        telegram_id: tgUser.id,
        username: tgUser.username,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        photo_url: tgUser.photo_url,
        points: 0,
        total_earned: 0,
        total_withdrawn: 0,
        referral_code: 'BC' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        referred_by: undefined,
        is_admin: isAdmin,
        is_banned: false,
        is_verified: false,
        last_active: now,
        created_at: now,
        updated_at: now,
      };
      setUser(demo);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        const referralCode = 'BC' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            telegram_id: tgUser.id,
            username: tgUser.username,
            first_name: tgUser.first_name,
            last_name: tgUser.last_name,
            photo_url: tgUser.photo_url,
            referral_code: referralCode,
            is_admin: isAdmin,
          })
          .select()
          .single();

        if (createError) throw createError;
        setUser(newUser);
        toastSuccess('Welcome to Brain Cash!', 'Your account has been created.');
        haptic('success');

        const tg = window.Telegram?.WebApp;
        const startParam = tg?.initDataUnsafe?.start_param;
        if (startParam && startParam.startsWith('ref_')) {
          const referrerCode = startParam.replace('ref_', '');
          const { data: referrer } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', referrerCode)
            .single();

          if (referrer) {
            await supabase.from('referrals').insert({
              referrer_id: referrer.id,
              referred_id: newUser.id,
              join_bonus: 20,
              task_bonus: 0,
              total_commission: 20,
            });
            await supabase.from('users').update({ referred_by: referrer.id }).eq('id', newUser.id);
            await supabase.rpc('add_points', { user_id: referrer.id, amount: 20 });
          }
        }
      } else if (fetchError) {
        throw fetchError;
      } else {
        // Ensure admin status is correct
        if (data.telegram_id === ADMIN_TELEGRAM_ID && !data.is_admin) {
          await supabase.from('users').update({ is_admin: true }).eq('id', data.id);
          data.is_admin = true;
        }
        // Check if user is suspended/banned
        if (data.is_banned) {
          // Find the first account created from the same IP to show as reference
          let suspendedInfo = 'Your account has been suspended.';
          if (data.registration_ip) {
            const { data: firstUser } = await supabase
              .from('users')
              .select('username, telegram_id, first_name')
              .eq('registration_ip', data.registration_ip)
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();
            if (firstUser && firstUser.telegram_id !== data.telegram_id) {
              suspendedInfo = `Your account has been suspended. First account from your IP: ${firstUser.username || firstUser.first_name || firstUser.telegram_id}`;
            }
          }
          if (data.suspension_reason) {
            suspendedInfo += ` Reason: ${data.suspension_reason}`;
          }
          setUser(null);
          setError(suspendedInfo);
          return;
        }
        setUser(data);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError('Failed to load user data');
      toastError('Connection Error', 'Could not load your profile. Using cached data.');
    }
  }, [tgUser, haptic, toastSuccess, toastError, setUser]);

  const refreshTasks = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (user) {
        const { data: completions } = await supabase
          .from('task_completions')
          .select('task_id, status')
          .eq('user_id', user.id);

        const completedIds = new Set(
          completions?.filter((c) => c.status === 'completed').map((c) => c.task_id) || []
        );

        setTasks(
          (data || []).map((task) => ({ ...task, completed: completedIds.has(task.id) }))
        );
      } else {
        setTasks(data || []);
      }
    } catch (err) {
      console.error('Error refreshing tasks:', err);
    }
  }, [user]);

  const refreshGames = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setGames(data || []);
    } catch (err) {
      console.error('Error refreshing games:', err);
    }
  }, []);

  const refreshWithdrawals = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setWithdrawals(data || []);
    } catch (err) {
      console.error('Error refreshing withdrawals:', err);
    }
  }, [user]);

  const refreshLeaderboard = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id as user_id, username, first_name, photo_url, total_earned')
        .eq('is_banned', false)
        .order('total_earned', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      setLeaderboard((data || []).map((entry, i) => ({ ...entry, rank: i + 1 })));
    } catch (err) {
      console.error('Error refreshing leaderboard:', err);
    }
  }, []);

  const addPoints = useCallback(async (amount: number) => {
    if (!user) return;

    if (user.id === 'demo' || !isSupabaseConfigured) {
      setUser({
        ...user,
        points: user.points + amount,
        total_earned: user.total_earned + amount,
      });
      haptic('success');
      return;
    }

    try {
      // Use RPC function for atomic update
      const { error: updateError } = await supabase.rpc('add_points', {
        user_id: user.id,
        amount: amount,
      });

      if (updateError) {
        // Fallback to direct update if RPC doesn't exist
        const { error: directError } = await supabase
          .from('users')
          .update({
            points: user.points + amount,
            total_earned: user.total_earned + amount,
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (directError) throw directError;
      }

      // Update local state
      setUser({
        ...user,
        points: user.points + amount,
        total_earned: user.total_earned + amount,
        last_active: new Date().toISOString(),
      });

      // Record activity
      await recordActivity('points_earned', { amount, source: 'app' });

      haptic('success');
    } catch (err) {
      console.error('Error adding points:', err);
      haptic('error');
      toastError('Error', 'Could not save points. Please try again.');
    }
  }, [user, haptic, toastError, setUser]);

  // Record user activity for tracking
  const recordActivity = useCallback(async (
    type: string,
    details?: Record<string, unknown>
  ) => {
    if (!user || user.id === 'demo' || !isSupabaseConfigured) return;

    try {
      // Update last_active timestamp
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', user.id);

      // Try to insert into activities table if it exists
      const { error } = await supabase.from('user_activities').insert({
        user_id: user.id,
        activity_type: type,
        details: details || {},
      });

      // Silently fail if table doesn't exist
      if (error && error.code !== 'PGRST116') {
        console.log('Activity logging not available');
      }
    } catch {
      // Silently ignore activity logging errors
    }
  }, [user]);

  // Load on mount
  useEffect(() => {
    if (tgUser) {
      setLoading(true);
      refreshUser().finally(() => setLoading(false));
    }
  }, [tgUser, refreshUser]);

  useEffect(() => {
    if (user) {
      Promise.all([refreshTasks(), refreshGames(), refreshWithdrawals(), refreshLeaderboard()]);
    }
  }, [user?.id]);

  const value: AppContextType = {
    user,
    tasks,
    games,
    withdrawals,
    leaderboard,
    currentView,
    setCurrentView,
    goBack,
    canGoBack,
    selectedGame,
    setSelectedGame,
    loading,
    error,
    refreshUser,
    refreshTasks,
    refreshGames,
    refreshWithdrawals,
    refreshLeaderboard,
    addPoints,
    recordActivity,
    tgUser,
    haptic,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (ctx === undefined) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
