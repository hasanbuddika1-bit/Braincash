import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Task, Game, Withdrawal, LeaderboardEntry, ViewType } from '../types';

interface AppContextType {
  user: User | null;
  tasks: Task[];
  games: Game[];
  withdrawals: Withdrawal[];
  leaderboard: LeaderboardEntry[];
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<AppContextType['tgUser']>(null);

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
    } catch {
      // Ignore haptic errors
    }
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();

      // Set theme colors
      try { tg.setHeaderColor('#1a0a2e'); } catch {}
      try { tg.setBackgroundColor('#1a0a2e'); } catch {}

      if (tg.initDataUnsafe?.user) {
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

    // Not inside Telegram — use a demo guest session so the app renders
    setTgUser({
      id: 0,
      first_name: 'Guest',
      username: 'guest',
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tgUser) return;

    // Demo mode: outside Telegram OR Supabase not configured
    if (tgUser.id === 0 || !isSupabaseConfigured) {
      const now = new Date().toISOString();
      setUser({
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
      });
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // User doesn't exist, create new
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
          })
          .select()
          .single();

        if (createError) throw createError;
        setUser(newUser);

        // Check for referral
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
            // Add referral bonus
            await supabase.from('referrals').insert({
              referrer_id: referrer.id,
              referred_id: newUser.id,
              join_bonus: 50,
            });

            // Update user's referred_by
            await supabase
              .from('users')
              .update({ referred_by: referrer.id })
              .eq('id', newUser.id);

            // Add points to referrer
            await supabase.rpc('add_points', {
              user_id: referrer.id,
              amount: 50,
            });
          }
        }

        haptic('success');
      } else if (fetchError) {
        throw fetchError;
      } else {
        setUser(data);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError('Failed to load user data');
    }
  }, [tgUser, haptic]);

  const refreshTasks = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Get user's completed tasks
      if (user) {
        const { data: completions } = await supabase
          .from('task_completions')
          .select('task_id, status')
          .eq('user_id', user.id);

        const completedIds = new Set(
          completions?.filter((c) => c.status === 'completed').map((c) => c.task_id) || []
        );

        setTasks(
          (data || []).map((task) => ({
            ...task,
            completed: completedIds.has(task.id),
          }))
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

      const ranked = (data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      setLeaderboard(ranked);
    } catch (err) {
      console.error('Error refreshing leaderboard:', err);
    }
  }, []);

  const addPoints = useCallback(async (amount: number) => {
    if (!user) return;

    // Demo mode or Supabase not configured — just update local state
    if (user.id === 'demo' || !isSupabaseConfigured) {
      setUser({ ...user, points: user.points + amount, total_earned: user.total_earned + amount });
      haptic('success');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          points: user.points + amount,
          total_earned: user.total_earned + amount,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUser({
        ...user,
        points: user.points + amount,
        total_earned: user.total_earned + amount,
      });

      haptic('success');
    } catch (err) {
      console.error('Error adding points:', err);
      haptic('error');
    }
  }, [user, haptic]);

  // Load data on mount
  useEffect(() => {
    if (tgUser) {
      setLoading(true);
      Promise.all([refreshUser()])
        .then(() => setLoading(false))
        .catch(() => setLoading(false));
    }
  }, [tgUser, refreshUser]);

  useEffect(() => {
    if (user) {
      Promise.all([
        refreshTasks(),
        refreshGames(),
        refreshWithdrawals(),
        refreshLeaderboard(),
      ]);
    }
  }, [user, refreshTasks, refreshGames, refreshWithdrawals, refreshLeaderboard]);

  const value: AppContextType = {
    user,
    tasks,
    games,
    withdrawals,
    leaderboard,
    currentView,
    setCurrentView,
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
    tgUser,
    haptic,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
