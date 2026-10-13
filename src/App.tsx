import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, HasabatRecord, HepdelikKriteriya, AuthUser, UserRole } from './types';
import { Navbar } from './components/Navbar';
import { OperatorPanel } from './components/OperatorPanel';
import { LaboratoriyaPanel } from './components/LaboratoriyaPanel';
import { AgronomPanel } from './components/AgronomPanel';
import { MonitoringPanel } from './components/MonitoringPanel';
import { RedaktorPanel } from './components/RedaktorPanel';
import { LoginModal } from './components/LoginModal';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { OfflineStorageService } from './services/offlineStorage';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('parnik_auth_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing stored user:', e);
    }
    return null;
  });

  const getDefaultTabForRole = (role: UserRole): ActiveTab => {
    switch (role) {
      case 'laboratoriya':
        return 'laboratoriya';
      case 'operator':
        return 'operator';
      case 'agronom':
        return 'agronom';
      case 'monitoring':
        return 'monitoring';
      case 'redaktor':
        return 'redaktor';
      default:
        return 'operator';
    }
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('operator');
  // Load cached records immediately so app works without network lag or in pure offline mode
  const [records, setRecords] = useState<HasabatRecord[]>(() => OfflineStorageService.getCachedRecords());
  const [kriteriyalar, setKriteriyalar] = useState<HepdelikKriteriya[]>(() => OfflineStorageService.getCachedCriteria());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(() => OfflineStorageService.getQueue().length);

  // Adjust active tab whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      const allowedRolesForTab: Record<ActiveTab, UserRole[]> = {
        operator: ['operator', 'admin'],
        laboratoriya: ['laboratoriya', 'admin'],
        agronom: ['agronom', 'admin'],
        monitoring: ['monitoring', 'admin'],
        redaktor: ['redaktor', 'admin'],
        kriteriyalar: ['agronom', 'admin'],
      };

      if (!allowedRolesForTab[activeTab]?.includes(currentUser.role)) {
        setActiveTab(getDefaultTabForRole(currentUser.role));
      }
    }
  }, [currentUser]);

  // Sync tab with URL
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveTab(getDefaultTabForRole(user.role));
  };

  const handleLogout = () => {
    localStorage.removeItem('parnik_auth_user');
    setCurrentUser(null);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);

    // Always refresh pending queue count
    setPendingQueueCount(OfflineStorageService.getQueue().length);

    // If online, sync queued items first if any
    if (navigator.onLine && OfflineStorageService.getQueue().length > 0) {
      try {
        await OfflineStorageService.syncQueue();
        setPendingQueueCount(OfflineStorageService.getQueue().length);
      } catch (syncErr) {
        console.warn('Queue sync error:', syncErr);
      }
    }

    try {
      if (!navigator.onLine) {
        throw new Error('Offline');
      }

      const [recRes, critRes] = await Promise.all([
        fetch('/api/records'),
        fetch('/api/kriteriyalar'),
      ]);

      if (recRes.ok) {
        const recData = await recRes.json();
        setRecords(recData);
        OfflineStorageService.saveCachedRecords(recData);
      }

      if (critRes.ok) {
        const critData = await critRes.json();
        setKriteriyalar(critData);
        OfflineStorageService.saveCachedCriteria(critData);
      }
    } catch (err) {
      // Offline fallback: load from cached records in storage
      const cachedRecs = OfflineStorageService.getCachedRecords();
      const cachedCrits = OfflineStorageService.getCachedCriteria();
      setRecords(cachedRecs);
      setKriteriyalar(cachedCrits);
    } finally {
      setIsLoading(false);
      setPendingQueueCount(OfflineStorageService.getQueue().length);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Auto sync when coming back online
    const handleOnline = () => {
      loadData();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [loadData]);

  // Role Access Checker
  const canAccessTab = (tab: ActiveTab): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;

    switch (tab) {
      case 'laboratoriya':
        return currentUser.role === 'laboratoriya';
      case 'operator':
        return currentUser.role === 'operator';
      case 'agronom':
      case 'kriteriyalar':
        return currentUser.role === 'agronom';
      case 'monitoring':
        return currentUser.role === 'monitoring';
      case 'redaktor':
        return currentUser.role === 'redaktor';
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* If not logged in, prompt Login Modal */}
      {!currentUser && <LoginModal onLoginSuccess={handleLoginSuccess} />}

      {/* Parnik Navigation Header */}
      {currentUser && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onRefresh={loadData}
          isLoading={isLoading}
          recordCount={records.length}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full space-y-5">
        {currentUser ? (
          <>
            {/* Offline and Online Status & Synchronization Bar */}
            <OfflineSyncBanner
              onSyncComplete={loadData}
              pendingCount={pendingQueueCount}
            />

            {/* Role Protected Active Parnik Tab */}
            {!canAccessTab(activeTab) ? (
              <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-sm max-w-lg mx-auto my-12">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Giriş Gadagan</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Siziň roluňyz (<strong className="capitalize">{currentUser.role}</strong>) bu bölüm üçin rugsatly däl.
                  Diňe öz bölümiňiziň panelinde işläp bilersiňiz.
                </p>
                <button
                  onClick={() => setActiveTab(getDefaultTabForRole(currentUser.role))}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition"
                >
                  Öz Paneliňize Dolanyň
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'operator' && (
                  <OperatorPanel onRecordAdded={loadData} recentRecords={records} />
                )}

                {activeTab === 'laboratoriya' && (
                  <LaboratoriyaPanel
                    records={records}
                    kriteriyalar={kriteriyalar}
                    onRecordUpdated={loadData}
                  />
                )}

                {activeTab === 'agronom' && (
                  <AgronomPanel
                    records={records}
                    onRecordUpdated={loadData}
                    kriteriyalar={kriteriyalar}
                    onCriteriaSaved={loadData}
                  />
                )}

                {activeTab === 'monitoring' && (
                  <MonitoringPanel records={records} kriteriyalar={kriteriyalar} />
                )}

                {activeTab === 'redaktor' && (
                  <RedaktorPanel records={records} onRecordUpdated={loadData} />
                )}
              </>
            )}
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-700">Parnik Hasabat Serweri Işleýär</span>
            <span>•</span>
            <span>Belent Agro Awtomatizasiýa Ulgamy (Oflaýn & Onlaýn)</span>
          </div>

          <div className="flex items-center space-x-3 text-slate-400">
            <span>© 2026 Belent Agro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
