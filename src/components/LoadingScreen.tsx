import React from 'react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-purple-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900" />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(191, 0, 255, 0.3) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Brain mascot with glasses */}
      <div className="relative z-10 mb-8">
        <div className="brain-mascot animate-float">🧠</div>
        {/* 3D glasses effect */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-2xl opacity-80">
          🤓
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 text-center mb-8">
        <h1 className="text-4xl font-bold font-['Orbitron'] bg-gradient-to-r from-purple-400 via-blue-400 to-gold-400 bg-clip-text text-transparent">
          Brain Cash
        </h1>
        <p className="text-purple-300 mt-2 animate-pulse">Loading your rewards...</p>
      </div>

      {/* Loading spinner */}
      <div className="relative z-10">
        <div className="loader" />
      </div>

      {/* Floating coins */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-40"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
              animation: `coinFloat ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            💰
          </div>
        ))}
      </div>
    </div>
  );
}
