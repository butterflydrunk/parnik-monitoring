import React, { useState } from 'react';
import { ActiveTab, AuthUser } from '../types';
import { 
  Sprout, 
  FlaskConical, 
  Wheat, 
  LineChart, 
  SlidersHorizontal, 
  RefreshCw,
  Droplets,
  LogOut,
  User,
  KeyRound
} from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onRefresh: () => void;
  isLoading: boolean;
  recordCount: number;
  currentUser: AuthUser;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onRefresh,
  isLoading,
  recordCount,
  currentUser,
  onLogout,
}) => {
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);

  // All available system tabs
  const allTabs: { id: ActiveTab; label: string; icon: React.FC<any>; roles: string[] }[] = [
    { id: 'operator', label: 'Operator Paneli', icon: Sprout, roles: ['operator', 'admin'] },
    { id: 'laboratoriya', label: 'Laboratoriýa Paneli', icon: FlaskConical, roles: ['laboratoriya', 'admin'] },
    { id: 'agronom', label: 'Agronom & Kriteriýalar', icon: Wheat, roles: ['agronom', 'admin'] },
    { id: 'monitoring', label: 'Monitoring & Grafikler', icon: LineChart, roles: ['monitoring', 'admin'] },
    { id: 'redaktor', label: 'Redaktor & Baza', icon: SlidersHorizontal, roles: ['redaktor', 'admin'] },
  ];

  // Filter tabs strictly according to the authenticated user's role
  const accessibleTabs = allTabs.filter(
    (tab) => currentUser.role === 'admin' || tab.roles.includes(currentUser.role)
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'laboratoriya':
        return 'bg-blue-800 text-blue-200 border-blue-600';
      case 'operator':
        return 'bg-emerald-800 text-emerald-200 border-emerald-600';
      case 'agronom':
        return 'bg-amber-800 text-amber-200 border-amber-600';
      case 'monitoring':
        return 'bg-purple-800 text-purple-200 border-purple-600';
      case 'redaktor':
        return 'bg-rose-800 text-rose-200 border-rose-600';
      default:
        return 'bg-emerald-800 text-emerald-300 border-emerald-700';
    }
  };

  return (
    <>
      <header className="bg-emerald-900 border-b border-emerald-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center shadow-inner text-emerald-200">
                <Droplets className="w-6 h-6 text-emerald-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg tracking-tight text-white">PARNIK</span>
                  <span className="text-[11px] uppercase tracking-wider bg-emerald-800 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-700">
                    Belent Agro
                  </span>
                </div>
                <p className="text-xs text-emerald-200">
                  Gündelik Hasabat we Monitoring Paneli
                </p>
              </div>
            </div>

            {/* PWA Install Button, User info, Password Change, Refresh & Logout */}
            <div className="flex items-center space-x-2 self-end md:self-auto flex-wrap gap-y-2">
              {/* PWA In-App Install Prompt */}
              <PWAInstallButton />

              {/* Authenticated User Badge */}
              <div className="flex items-center space-x-2 bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs shadow-inner">
                <div className="w-6 h-6 rounded-lg bg-emerald-800 flex items-center justify-center text-emerald-200 font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-white leading-tight">{currentUser.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Password Change Button */}
              <button
                type="button"
                onClick={() => setIsChangePassOpen(true)}
                title="Açar sözüni (paroly) çalşyrmak"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/90 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-700/80 transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Paroly Çalyş</span>
              </button>

              <span className="text-xs text-emerald-200 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800 font-mono hidden lg:inline-block">
                Jemi: <strong>{recordCount}</strong> ýazgy
              </span>

              {/* Refresh Button */}
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="Maglumatlary täzele"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Täzele</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                title="Ulgamdan çykmak (Başga hasap bilen girmek üçin)"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-700/80 transition cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Çykyş</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation (Filtered by Role - strictly locked) */}
          <nav className="flex space-x-1.5 overflow-x-auto py-2 border-t border-emerald-800/80 scrollbar-none items-center">
            <div className="text-[11px] font-semibold text-emerald-300 pr-2 uppercase tracking-wider hidden md:block">
              Rugsatly Paneliňiz:
            </div>
            {accessibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                      : 'text-emerald-100 hover:bg-emerald-800/90 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-300'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
};
