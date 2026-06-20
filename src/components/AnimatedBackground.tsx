import React, { useEffect, useState } from 'react';

interface Orb {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  delay: number;
}

export function AnimatedBackground() {
  const [orbs, setOrbs] = useState<Orb[]>([]);

  useEffect(() => {
    // Logo-matching colors: green, purple, blue, gold
    const colors = ['#00c853', '#7c3aed', '#2563eb', '#fbbf24', '#00c853', '#4a2c7a'];
    const newOrbs: Orb[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 150 + 80,
      color: colors[i % colors.length],
      speed: Math.random() * 18 + 12,
      delay: Math.random() * 5,
    }));
    setOrbs(newOrbs);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Deep dark base — matches logo background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #080814 0%, #0a0d1a 40%, #080f0a 70%, #0d0a18 100%)',
      }} />

      {/* Mesh gradient overlays */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse at 15% 15%, rgba(0,200,83,0.10) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 80%, rgba(124,58,237,0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 40%),
          radial-gradient(ellipse at 80% 20%, rgba(251,191,36,0.06) 0%, transparent 35%)
        `,
      }} />

      {/* Animated floating orbs */}
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color}28 0%, transparent 70%)`,
            animation: `float ${orb.speed}s ease-in-out infinite`,
            animationDelay: `${orb.delay}s`,
          }}
        />
      ))}

      {/* Subtle grid pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,200,83,1)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Hexagonal network */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
        <defs>
          <pattern id="hexnet" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
            <polygon
              points="30,2 58,17 58,47 30,62 2,47 2,17"
              fill="none"
              stroke="rgba(124,58,237,1)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexnet)" />
      </svg>

      {/* Floating emoji elements */}
      {['💰', '🧠', '💎', '⭐', '🚀', '💰'].map((emoji, i) => (
        <div
          key={i}
          className="absolute select-none"
          style={{
            left: `${8 + i * 16}%`,
            top: `${15 + (i % 3) * 25}%`,
            fontSize: '24px',
            opacity: 0.06,
            animation: `coinFloat ${4 + i}s ease-in-out infinite`,
            animationDelay: `${i * 0.7}s`,
            filter: 'drop-shadow(0 0 6px rgba(0,200,83,0.8))',
          }}
        >
          {emoji}
        </div>
      ))}

      {/* Top green glow line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: 'linear-gradient(90deg, transparent, #00c853, #fbbf24, #7c3aed, transparent)',
        opacity: 0.6,
      }} />

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-32" style={{
        background: 'linear-gradient(to top, rgba(8,8,20,0.8), transparent)',
      }} />
    </div>
  );
}

// Logo-styled Brain Mascot Component
export function BrainMascot({ size = 'lg', animate = true }: { size?: 'sm' | 'md' | 'lg'; animate?: boolean }) {
  const LOGO = '/images/files_10647109-2026-06-19T11-55-14-438Z-file_00000000dcc87208a4f089391cccaaa0.webp';
  const sizes = { sm: 40, md: 56, lg: 80 };
  const px = sizes[size];

  return (
    <div className={`relative inline-block ${animate ? 'animate-float' : ''}`}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          width: px, height: px,
          boxShadow: `0 0 20px rgba(0,200,83,0.4), 0 0 40px rgba(124,58,237,0.3)`,
        }}
      >
        <img src={LOGO} alt="Brain Cash" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

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
  variant?: 'primary' | 'gold' | 'green' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-700 to-blue-600',
    gold: 'bg-gradient-to-r from-gold-500 to-gold-400 text-gray-900',
    green: 'bg-gradient-to-r from-green-600 to-green-brand text-white',
    secondary: 'bg-white/10 border border-white/20 hover:bg-white/20',
    danger: 'bg-gradient-to-r from-red-600 to-red-500',
  };

  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-base', lg: 'px-8 py-4 text-lg' };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative overflow-hidden rounded-xl font-bold transition-all duration-300 transform ${variants[variant]} ${sizes[size]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${className}`}
    >
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
