import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Trophy, TrendingUp, Clock, Gift, Zap, Target, ChevronRight, Medal, Gamepad2, Tv, Wallet, Users, CreditCard, History, Flame, Crown } from 'lucide-react';

export function HomeView() {
  const { user, leaderboard, setCurrentView, games, haptic } = useApp();

  const pointsToUSD = (points: number) => {
    return (points * 0.01).toFixed(2);
  };

  const userRank = leaderboard.find((entry) => entry.user_id === user?.id);
  const topPlayers = leaderboard.slice(0, 5);

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header with 3D Brain Mascot */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14">
            <div className="brain-mascot text-5xl animate-float leading-none">🧠</div>
            {/* Glasses overlay */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-base pointer-events-none">🤓</div>
            {/* Floating coin - clipped to avoid overflow */}
            <div className="absolute -right-1 bottom-0 text-base animate-bounce-slow pointer-events-none">💰</div>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-['Orbitron'] bg-gradient-to-r from-white via-purple-300 to-gold-400 bg-clip-text text-transparent">
              {user?.first_name || 'Brain'}!
            </h1>
            <p className="text-purple-300 text-sm">Ready to earn?</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptic('light');
              setCurrentView('history');
            }}
            className="glass-card px-3 py-2"
          >
            <History className="text-gray-400" size={20} />
          </button>
          <div className="glass-card px-3 py-2 bg-gradient-to-r from-purple-600/30 to-blue-600/30">
            <div className="flex items-center gap-2">
              <Crown className="text-gold-400" size={18} />
              <span className="text-gold-400 font-bold">#{userRank?.rank || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Challenge Banner */}
      <div
        onClick={() => {
          haptic('light');
          setCurrentView('challenge');
        }}
        className="glass-card p-4 mb-6 relative overflow-hidden cursor-pointer group bg-gradient-to-r from-purple-800/40 via-blue-800/40 to-gold-800/40 hover:from-purple-700/50 hover:via-blue-700/50 hover:to-gold-700/50 transition-all"
      >
        <div className="absolute top-0 right-0 text-7xl opacity-30 transform translate-x-2 -translate-y-2 rotate-12">
          🏆
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-2xl shadow-neon-gold">
              <Flame className="text-purple-900" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold flex items-center gap-2">
                Daily Challenge
                <span className="badge-gold text-purple-900 text-xs">+30 Bonus</span>
              </h3>
              <p className="text-gray-400 text-sm">Complete all 3 challenges today!</p>
            </div>
          </div>
          <ChevronRight className="text-gold-400 group-hover:translate-x-1 transition-transform" size={24} />
        </div>
      </div>

      {/* Balance Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden bg-gradient-to-br from-purple-900/50 via-purple-800/30 to-blue-900/50">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 text-8xl opacity-20 transform translate-x-4 -translate-y-4">
          💰
        </div>
        <div className="absolute bottom-0 left-0 text-6xl opacity-10 transform -translate-x-4 translate-y-4">
          💎
        </div>

        {/* Animated glow */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3), transparent 70%)' }}
        />

        <div className="relative z-10">
          <p className="text-purple-300 text-sm mb-1">Your Balance</p>
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="text-5xl font-bold font-['Orbitron'] text-white">
              {(user?.points || 0).toLocaleString()}
            </h2>
            <span className="text-gold-400 font-semibold text-lg">pts</span>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gold-500/20 border border-gold-500/30">
              <span className="text-gray-400 text-sm">≈</span>
              <span className="text-xl font-bold text-gold-400">
                ${pointsToUSD(user?.points || 0)}
              </span>
              <span className="text-gray-400 text-sm">USDT</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setCurrentView('games')}
              className="btn-neon py-3 flex items-center justify-center gap-2"
            >
              <Gamepad2 className="w-5 h-5" />
              <span className="text-sm">Play</span>
            </button>
            <button
              onClick={() => setCurrentView('withdraw')}
              className="btn-neon-gold py-3 flex items-center justify-center gap-2"
            >
              <Wallet className="w-5 h-5" />
              <span className="text-sm">Cash Out</span>
            </button>
            <button
              onClick={() => setCurrentView('payment')}
              className="btn-neon py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500"
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-sm">Buy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card group hover:scale-105 transition-transform">
          <TrendingUp className="text-green-400 w-6 h-6 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="stat-value text-lg">{(user?.total_earned || 0).toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-1">Total Earned</p>
        </div>
        <div className="stat-card group hover:scale-105 transition-transform">
          <Clock className="text-blue-400 w-6 h-6 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="stat-value text-lg">${(user?.total_withdrawn || 0).toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-1">Withdrawn</p>
        </div>
        <div className="stat-card group hover:scale-105 transition-transform">
          <Medal className="text-gold-400 w-6 h-6 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="stat-value text-lg">#{userRank?.rank || '-'}</p>
          <p className="text-gray-400 text-xs mt-1">Rank</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Zap className="text-purple-400 animate-pulse" size={20} />
          Quick Actions
        </h3>
        <div className="space-y-2">
          <ActionButton
            icon={<Tv className="text-blue-400" />}
            title="Watch Ads"
            subtitle="Earn 4-8 points instantly"
            badge="+4-8 pts"
            onClick={() => setCurrentView('ads')}
          />
          <ActionButton
            icon={<Target className="text-gold-400" />}
            title="Complete Tasks"
            subtitle="Join channels & earn points"
            badge="Easy"
            onClick={() => setCurrentView('tasks')}
          />
          <ActionButton
            icon={<Users className="text-purple-400" />}
            title="Invite Friends"
            subtitle="Get 150 pts + 10% commission"
            badge="+150 pts"
            onClick={() => setCurrentView('referrals')}
          />
        </div>
      </div>

      {/* Featured Games */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Gamepad2 className="text-purple-400" size={20} />
            Featured Games
          </h3>
          <button
            onClick={() => setCurrentView('games')}
            className="text-gold-400 text-sm flex items-center gap-1 hover:text-gold-300"
          >
            See all <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {games.slice(0, 4).map((game) => (
            <div key={game.id} className="game-card p-3 hover:shadow-neon-purple">
              <div className="game-icon text-3xl">{game.icon}</div>
              <p className="text-white text-xs text-center mt-1 font-semibold">{game.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Players */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Trophy className="text-gold-400" size={20} />
          Top Earners
        </h3>
        <div className="space-y-2">
          {topPlayers.length > 0 ? topPlayers.map((player, index) => (
            <div
              key={player.user_id}
              className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                player.user_id === user?.id ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 border border-gold-400/30' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg ${
                  index === 0
                    ? 'bg-gradient-to-br from-gold-400 via-gold-500 to-yellow-300 text-purple-900 shadow-neon-gold'
                    : index === 1
                    ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-200 text-purple-900'
                    : index === 2
                    ? 'bg-gradient-to-br from-amber-600 via-amber-500 to-orange-400 text-white'
                    : 'bg-purple-700/50 text-gray-300'
                }`}
              >
                {index === 0 ? '👑' : player.rank}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">
                  {player.first_name || player.username || 'Anonymous'}
                </p>
                <p className="text-gray-400 text-sm">{(player.total_earned || 0).toLocaleString()} pts</p>
              </div>
              {player.user_id === user?.id && (
                <span className="badge-gold text-purple-900 text-xs font-bold">YOU</span>
              )}
            </div>
          )) : (
            <div className="text-center py-4 text-gray-400">
              No players yet. Be the first!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  title,
  subtitle,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  onClick: () => void;
}) {
  const { haptic } = useApp();

  return (
    <button
      onClick={() => {
        haptic('light');
        onClick();
      }}
      className="flex items-center gap-4 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
    >
      <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-white font-semibold truncate">{title}</p>
        <p className="text-gray-400 text-sm truncate">{subtitle}</p>
      </div>
      {badge && (
        <span className="flex-shrink-0 text-xs text-gold-400 font-bold px-2 py-1 rounded-full bg-gold-400/10 border border-gold-400/30 whitespace-nowrap">
          {badge}
        </span>
      )}
      <ChevronRight className="flex-shrink-0 text-gray-500 group-hover:text-gold-400 group-hover:translate-x-1 transition-all" size={20} />
    </button>
  );
}
