export interface User {
  id: string;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  referral_code: string;
  referred_by?: string;
  points: number;
  total_earned: number;
  total_withdrawn: number;
  is_admin: boolean;
  is_banned: boolean;
  is_verified: boolean;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  task_type: 'channel' | 'group' | 'bot' | 'post' | 'partner';
  task_section: 'main' | 'partner' | 'other';
  title: string;
  description?: string;
  link?: string;
  reward_points: number;
  icon_emoji?: string;
  is_partner: boolean;
  is_active: boolean;
  verification_method: string;
  created_at: string;
  completed?: boolean;
}

export interface TaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  status: 'pending' | 'completed' | 'failed';
  completed_at: string;
}

export interface Game {
  id: string;
  name: string;
  game_type: '2048' | 'memory' | 'connect' | 'sudoku' | 'color' | 'blocks' | 'maze' | 'reaction' | 'wordguess';
  description?: string;
  icon: string;
  reward_range_min: number;
  reward_range_max: number;
  is_active: boolean;
  play_count: number;
  created_at: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  game_id: string;
  score: number;
  reward: number;
  played_at: string;
}

export interface AdView {
  id: string;
  user_id: string;
  ad_provider: 'adgamer' | 'monetag' | 'gigapub';
  ad_type: 'rewarded' | 'interstitial' | 'loading';
  reward: number;
  viewed_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: 'USDT' | 'TON';
  wallet_address: string;
  tx_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  processed_at?: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  join_bonus: number;
  task_bonus: number;
  total_commission: number;
  created_at: string;
}

export interface DailyChallenge {
  id: string;
  game_id: string;
  target_score: number;
  reward_bonus: number;
  challenge_date: string;
  created_at: string;
}

export interface DailyChallengeCompletion {
  id: string;
  user_id: string;
  challenge_id: string;
  score: number;
  reward: number;
  completed_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface Settings {
  key: string;
  value: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username?: string;
  first_name?: string;
  photo_url?: string;
  total_earned: number;
  rank: number;
}

export type ViewType = 'home' | 'games' | 'game' | 'tasks' | 'ads' | 'referrals' | 'withdraw' | 'admin' | 'challenge' | 'history' | 'payment' | 'profile';

export const VIEW_LABELS: Record<ViewType, string> = {
  home: 'Home',
  games: 'Games',
  game: 'Play',
  tasks: 'Tasks',
  ads: 'Earn',
  referrals: 'Refer',
  withdraw: 'Withdraw',
  admin: 'Admin',
  challenge: 'Challenge',
  history: 'History',
  payment: 'Buy',
  profile: 'Profile',
};

export interface GameState {
  score: number;
  reward: number;
  isPlaying: boolean;
  gameType: string;
}
