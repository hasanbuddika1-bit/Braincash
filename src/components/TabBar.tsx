import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Home, Gamepad2, Tv, Users, UserCircle, ShieldCheck } from 'lucide-react';
import type { ViewType } from '../types';

interface Tab {
  id: ViewType;
  icon: React.ReactNode;
  label: string;
}

// Home in center position for intuitive navigation
const BASE_TABS: Tab[] = [
  { id: 'games',    icon: <Gamepad2 size={22} />, label: 'Games'   },
  { id: 'ads',      icon: <Tv       size={22} />, label: 'Earn'    },
  { id: 'home',     icon: <Home     size={24} />, label: 'Home'    },
  { id: 'referrals',icon: <Users    size={22} />, label: 'Refer'   },
  { id: 'profile',  icon: <UserCircle size={22} />, label: 'Profile' },
];

export function TabBar() {
  const { currentView, setCurrentView, user, haptic } = useApp();

  const tabs: Tab[] = user?.is_admin
    ? [...BASE_TABS, { id: 'admin', icon: <ShieldCheck size={22} />, label: 'Admin' }]
    : BASE_TABS;

  function navigate(id: ViewType) {
    if (currentView === id) return;
    haptic('light');
    setCurrentView(id);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'linear-gradient(180deg, rgba(10,5,25,0.0) 0%, rgba(10,5,25,0.98) 20%)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        paddingTop: '8px',
      }}
    >
      <div className="flex items-end justify-around px-2 pb-2">
        {tabs.map((tab) => {
          const active = currentView === tab.id;
          const isHome = tab.id === 'home';

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-300 active:scale-90 select-none ${
                isHome ? 'flex-[1.3] -mt-4' : 'flex-1'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                minHeight: isHome ? '64px' : '52px',
              }}
            >
              {/* Home button special styling */}
              {isHome ? (
                <>
                  {/* Glowing background for home */}
                  <div
                    className="absolute inset-0 rounded-2xl transition-all duration-300"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(191,0,255,0.4) 0%, rgba(0,212,255,0.4) 100%)'
                        : 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.1) 100%)',
                      boxShadow: active
                        ? '0 0 20px rgba(191,0,255,0.5), 0 0 40px rgba(0,212,255,0.3)'
                        : '0 0 15px rgba(255,215,0,0.3)',
                      border: '2px solid rgba(255,215,0,0.5)',
                    }}
                  />
                  {/* Home icon with 3D brain emoji */}
                  <div
                    className="relative z-10 flex items-center justify-center"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #bf00ff 0%, #00d4ff 100%)',
                      boxShadow: '0 4px 15px rgba(191,0,255,0.5), 0 0 30px rgba(0,212,255,0.3)',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <span className="text-2xl">🧠</span>
                  </div>
                  <span
                    className="relative z-10 text-xs font-bold"
                    style={{ color: '#ffd700' }}
                  >
                    Home
                  </span>
                </>
              ) : (
                <>
                  {/* Active pill background */}
                  <span
                    className="absolute inset-0 rounded-2xl transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(191,0,255,0.25) 0%, rgba(0,212,255,0.25) 100%)',
                      opacity: active ? 1 : 0,
                      transform: active ? 'scale(1)' : 'scale(0.85)',
                      transition: 'opacity 0.3s, transform 0.3s',
                    }}
                  />

                  {/* Dot indicator */}
                  <span
                    className="absolute top-0 w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #bf00ff, #00d4ff)',
                      opacity: active ? 1 : 0,
                      transform: active ? 'scale(1)' : 'scale(0)',
                    }}
                  />

                  {/* Icon */}
                  <span
                    className="relative transition-all duration-300"
                    style={{
                      color: active ? '#ffd700' : '#9ca3af',
                      filter: active ? 'drop-shadow(0 0 8px rgba(255,215,0,0.6))' : 'none',
                      transform: active ? 'translateY(-1px) scale(1.15)' : 'translateY(0) scale(1)',
                    }}
                  >
                    {tab.icon}
                  </span>

                  {/* Label */}
                  <span
                    className="relative text-[10px] font-bold tracking-wide transition-all duration-300"
                    style={{
                      color: active ? '#ffd700' : '#9ca3af',
                      opacity: active ? 1 : 0.9,
                    }}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
