import React, { useEffect, useState, useMemo } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  delay: number;
  type: 'circle' | 'star' | 'coin';
}

interface FloatingCoin {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
}

export function AnimatedBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [coins, setCoins] = useState<FloatingCoin[]>([]);

  useEffect(() => {
    const colors = ['#bf00ff', '#00d4ff', '#ffd700', '#ff00ff', '#00ff88', '#ff6b6b'];
    const types: Particle['type'][] = ['circle', 'star', 'coin'];
    const newParticles: Particle[] = [];

    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 150 + 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 15 + 10,
        delay: Math.random() * 5,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }

    setParticles(newParticles);

    // Floating USDT coins
    const newCoins: FloatingCoin[] = [];
    for (let i = 0; i < 12; i++) {
      newCoins.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
        duration: Math.random() * 4 + 3,
        size: Math.random() * 20 + 24,
      });
    }
    setCoins(newCoins);
  }, []);

  const emojis = useMemo(() => ({
    coin: '💰',
    star: '⭐',
    diamond: '💎',
    brain: '🧠',
    rocket: '🚀',
    fire: '🔥',
    lightning: '⚡',
    trophy: '🏆',
    gift: '🎁',
  }), []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Multi-layer gradient base */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800/90 to-blue-900" />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/50 via-transparent to-purple-800/30" />
        <div className="absolute inset-0 bg-gradient-radial from-purple-600/20 via-transparent to-transparent" />
      </div>

      {/* Animated mesh gradient */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(191, 0, 255, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(0, 212, 255, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(255, 215, 0, 0.2) 0%, transparent 40%)
          `,
          animation: 'gradient 8s ease infinite',
          backgroundSize: '200% 200%',
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
            animation: `float ${particle.speed}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            opacity: 0.3,
          }}
        />
      ))}

      {/* Floating USDT coins with 3D effect */}
      <div className="absolute inset-0 overflow-hidden">
        {coins.map((coin) => (
          <div
            key={coin.id}
            className="absolute"
            style={{
              left: `${coin.x}%`,
              top: `${coin.y}%`,
              fontSize: coin.size,
              animation: `coinFloat ${coin.duration}s ease-in-out infinite`,
              animationDelay: `${coin.delay}s`,
              opacity: 0.15,
              filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))',
            }}
          >
            💰
          </div>
        ))}
      </div>

      {/* Floating 3D emojis */}
      <div className="absolute inset-0 overflow-hidden">
        {[
          { emoji: '🧠', x: 15, y: 30, delay: 0, dur: 5 },
          { emoji: '💎', x: 85, y: 20, delay: 1, dur: 6 },
          { emoji: '🎮', x: 10, y: 70, delay: 2, dur: 4.5 },
          { emoji: '🏆', x: 90, y: 60, delay: 0.5, dur: 5.5 },
          { emoji: '🚀', x: 50, y: 10, delay: 1.5, dur: 4 },
          { emoji: '⭐', x: 30, y: 85, delay: 3, dur: 5 },
          { emoji: '🔥', x: 70, y: 80, delay: 2.5, dur: 4.5 },
        ].map((item, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              fontSize: 32,
              animation: `float ${item.dur}s ease-in-out infinite`,
              animationDelay: `${item.delay}s`,
              opacity: 0.1,
              filter: 'drop-shadow(0 0 15px currentColor)',
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Cinematic light rays */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `
            linear-gradient(135deg, transparent 40%, rgba(255, 215, 0, 0.3) 50%, transparent 60%),
            linear-gradient(225deg, transparent 40%, rgba(191, 0, 255, 0.3) 50%, transparent 60%)
          `,
          animation: 'shimmer 10s linear infinite',
        }}
      />

      {/* Hexagonal grid pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-5"
        style={{ backgroundSize: '60px 60px' }}
      >
        <defs>
          <pattern
            id="hexagons"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(2)"
          >
            <polygon
              points="30,0 60,15 60,45 30,60 0,45 0,15"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexagons)" />
      </svg>

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Top glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg, transparent, #bf00ff, #00d4ff, #ffd700, transparent)',
          opacity: 0.5,
        }}
      />
    </div>
  );
}

// Premium 3D Brain Mascot Component
export function BrainMascot({ size = 'lg', animate = true }: { size?: 'sm' | 'md' | 'lg'; animate?: boolean }) {
  const sizes = {
    sm: 'text-4xl',
    md: 'text-5xl',
    lg: 'text-7xl',
  };

  return (
    <div className={`relative inline-block ${animate ? 'animate-float' : ''}`}>
      {/* Glow effect behind */}
      <div
        className="absolute inset-0 blur-2xl opacity-50"
        style={{
          background: 'radial-gradient(circle, rgba(191, 0, 255, 0.5) 0%, transparent 70%)',
          transform: 'scale(1.5)',
        }}
      />

      {/* Main brain emoji */}
      <div className={`${sizes[size]} relative`} style={{ filter: 'drop-shadow(0 0 20px rgba(191, 0, 255, 0.6))' }}>
        🧠
      </div>

      {/* Glasses overlay */}
      <div
        className="absolute"
        style={{
          top: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: size === 'lg' ? '2rem' : size === 'md' ? '1.5rem' : '1rem',
        }}
      >
        🤓
      </div>

      {/* Coin in hand effect */}
      {size === 'lg' && (
        <div
          className="absolute animate-bounce-slow"
          style={{
            bottom: '10%',
            right: '-20%',
            fontSize: '2rem',
            filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))',
          }}
        >
          💰
        </div>
      )}
    </div>
  );
}

// Premium Button Component
export function PremiumButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'gold' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-neon-purple hover:shadow-[0_0_30px_rgba(191,0,255,0.5)]',
    gold: 'bg-gradient-to-r from-gold-500 to-gold-400 text-purple-900 shadow-neon-gold hover:shadow-[0_0_30px_rgba(255,215,0,0.5)]',
    secondary: 'bg-white/10 border border-white/20 hover:bg-white/20',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_20px_rgba(255,0,0,0.3)]',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden rounded-xl font-bold font-['Rajdhani']
        transition-all duration-300 transform
        ${variants[variant]}
        ${sizes[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        ${className}
      `}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 shimmer" />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        {loading ? (
          <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <>
            {icon && <span className="text-xl">{icon}</span>}
            {children}
          </>
        )}
      </div>
    </button>
  );
}

// Stats Card with 3D effect
export function StatCard3D({
  icon,
  value,
  label,
  trend,
  color = 'purple',
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'purple' | 'blue' | 'gold' | 'green';
}) {
  const colors = {
    purple: 'from-purple-600/20 to-purple-800/20 border-purple-500/30',
    blue: 'from-blue-600/20 to-blue-800/20 border-blue-500/30',
    gold: 'from-gold-500/20 to-gold-600/20 border-gold-500/30',
    green: 'from-green-600/20 to-green-800/20 border-green-500/30',
  };

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className={`glass-card p-4 bg-gradient-to-br ${colors[color]} relative overflow-hidden group hover:scale-105 transition-transform duration-300`}>
      {/* Glowing orb */}
      <div
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"
        style={{ background: color === 'gold' ? '#ffd700' : color === 'blue' ? '#00d4ff' : color === 'green' ? '#00ff88' : '#bf00ff' }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl" style={{ filter: 'drop-shadow(0 0 10px currentColor)' }}>
            {icon}
          </div>
          {trend && (
            <span className={`text-xs font-bold ${trendColors[trend]}`}>
              {trendIcons[trend]}
            </span>
          )}
        </div>
        <div className="stat-value text-xl">{value}</div>
        <div className="text-gray-400 text-xs mt-1">{label}</div>
      </div>
    </div>
  );
}

// Confetti celebration component
export function ConfettiCelebration({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    color: string;
    delay: number;
    rotation: number;
  }>>([]);

  useEffect(() => {
    if (active) {
      const colors = ['#ffd700', '#bf00ff', '#00d4ff', '#ff00ff', '#00ff88', '#ff6b6b'];
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 confetti"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
}
