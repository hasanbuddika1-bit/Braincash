import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Home, Gamepad2, Tv, Users, Wallet, User } from 'lucide-react';

interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function TabItem({ icon, label, active, onClick }: TabItemProps) {
  const { haptic } = useApp();

  const handleClick = () => {
    haptic('light');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`tab-item flex-1 ${active ? 'active' : ''}`}
    >
      <div className={`tab-icon text-xl transition-all duration-300 ${active ? 'text-gold-400' : 'text-gray-400'}`}>
        {icon}
      </div>
      <span className={`text-xs font-semibold ${active ? 'text-gold-400' : 'text-gray-400'}`}>
        {label}
      </span>
    </button>
  );
}

export function TabBar() {
  const { currentView, setCurrentView, user } = useApp();

  const tabs = [
    { id: 'home' as const, icon: <Home size={22} />, label: 'Home' },
    { id: 'games' as const, icon: <Gamepad2 size={22} />, label: 'Games' },
    { id: 'ads' as const, icon: <Tv size={22} />, label: 'Earn' },
    { id: 'referrals' as const, icon: <Users size={22} />, label: 'Refer' },
    { id: 'withdraw' as const, icon: <Wallet size={22} />, label: 'Cash' },
  ];

  return (
    <nav className="tab-bar">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={currentView === tab.id}
            onClick={() => setCurrentView(tab.id)}
          />
        ))}
        {user?.is_admin && (
          <TabItem
            icon={<User size={22} />}
            label="Admin"
            active={currentView === 'admin'}
            onClick={() => setCurrentView('admin')}
          />
        )}
      </div>
    </nav>
  );
}
