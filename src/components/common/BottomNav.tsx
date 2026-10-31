import React from 'react';
import { LayoutDashboard, Bike, MapPin, Building2, Wrench, Shield } from 'lucide-react';
import { UserRole } from '../../types';
import { translations, Language } from '../../lib/i18n';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentRole: UserRole;
  lang: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  currentRole,
  lang,
}) => {
  const t = translations[lang];

  const tabs = [
    { id: 'rider', label: t.rider, icon: Bike },
    { id: 'passenger', label: 'Ride', icon: MapPin },
    { id: 'stage', label: 'Stage', icon: Building2 },
    { id: 'business', label: 'Garage', icon: Wrench },
    { id: 'admin', label: 'Admin', icon: Shield },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1 safe-area-pb">
      <div className="grid grid-cols-5 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors touch-target cursor-pointer ${
                isActive ? 'text-[#0B192C]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-amber-400 text-slate-950 font-bold scale-105' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[58px] ${
                  isActive ? 'font-bold text-slate-900' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
