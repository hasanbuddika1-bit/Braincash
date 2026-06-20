import React, { useEffect, useState } from 'react';

const LOGO = '/images/files_10647109-2026-06-19T11-55-14-438Z-file_00000000dcc87208a4f089391cccaaa0.webp';

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(interval); return p; }
        return p + Math.random() * 8;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: 'linear-gradient(135deg, #080814 0%, #0d0d1d 50%, #0a1a0a 100%)' }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 300, height: 300,
            top: '10%', left: '50%', transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, rgba(0,200,83,0.15) 0%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 200, height: 200,
            bottom: '20%', left: '20%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite 1s',
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 180, height: 180,
            top: '30%', right: '10%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)',
            animation: 'pulse 3.5s ease-in-out infinite 0.5s',
          }}
        />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-6"
        style={{ animation: 'float 3s ease-in-out infinite' }}
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            width: 140, height: 140,
            boxShadow: '0 0 40px rgba(0,200,83,0.4), 0 0 80px rgba(124,58,237,0.3)',
          }}
        >
          <img src={LOGO} alt="Brain Cash" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 text-center mb-2">
        <h1 className="text-4xl font-black tracking-wide" style={{
          fontFamily: "'Orbitron', sans-serif",
          background: 'linear-gradient(135deg, #00c853, #fbbf24, #00c853)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'shimmer 2s linear infinite',
        }}>
          BRAIN CASH
        </h1>
        <p className="text-green-400 text-sm font-semibold tracking-[0.3em] mt-1 opacity-80">
          PLAY • EARN • REWARD
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-48 mt-8">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: 'linear-gradient(90deg, #00c853, #fbbf24)',
              boxShadow: '0 0 10px rgba(0,200,83,0.8)',
            }}
          />
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">Loading your rewards...</p>
      </div>

      {/* Floating coins */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['💰', '💎', '🧠', '⭐', '💰', '🚀'].map((emoji, i) => (
          <div
            key={i}
            className="absolute text-3xl opacity-20"
            style={{
              left: `${10 + i * 16}%`,
              top: `${25 + (i % 3) * 20}%`,
              animation: `coinFloat ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
              filter: 'drop-shadow(0 0 8px rgba(0,200,83,0.5))',
            }}
          >
            {emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
