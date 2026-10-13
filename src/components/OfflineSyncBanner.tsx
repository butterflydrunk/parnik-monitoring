import React, { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { OfflineStorageService } from '../services/offlineStorage';
import { Wifi, WifiOff, RefreshCw, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface OfflineSyncBannerProps {
  onSyncComplete?: () => void;
  pendingCount?: number;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  onSyncComplete,
  pendingCount = 0,
}) => {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSyncNow = async () => {
    if (!isOnline) {
      setErrorMessage('Internet birikmesi ýok! Birikme dikeldilende awtomatiki sinhronlanar.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);
    setErrorMessage(null);

    try {
      const result = await OfflineStorageService.syncQueue();
      if (result.success) {
        setSyncMessage(`Üstünlikli sinhronlandy! ${result.syncedCount} sany ýazgy serwere ýüklendi.`);
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        setErrorMessage(`Käbir ýazgylar serwere geçmedi (${result.failedCount} sany). Gaýtadan synanyşyň.`);
      }
    } catch (e: any) {
      setErrorMessage('Serwer bilen aragatnaşykda säwlik ýüze çykdy.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncMessage(null);
        setErrorMessage(null);
      }, 5000);
    }
  };

  const handleExportBackup = () => {
    OfflineStorageService.exportLocalBackup();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = OfflineStorageService.importLocalBackup(content);
        if (res.success) {
          setSyncMessage(res.message);
          if (onSyncComplete) onSyncComplete();
        } else {
          setErrorMessage(res.message);
        }
        setTimeout(() => {
          setSyncMessage(null);
          setErrorMessage(null);
        }, 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Connection Status indicator */}
        <div className="flex items-center gap-2.5">
          {isOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Wifi className="w-3.5 h-3.5" />
              <span>Onlaýn (Serwer birigen)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Oflaýn Tertip (Internet ýok — Maglumatlar ýerli saklanýar)</span>
            </div>
          )}

          {pendingCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-200">
              <span>{pendingCount} sany garaşýan üýtgetme</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {pendingCount > 0 && isOnline && (
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinhronlanýar...' : 'Serwere Ýükle (Sync)'}</span>
            </button>
          )}

          {/* Export / Backup Local Records */}
          <button
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-300 transition"
            title="Ähli ýazgylary oflaýn faýla (JSON) göçürip almak"
          >
            <Download className="w-3 h-3 text-slate-600" />
            <span className="hidden sm:inline">Ätiýaçlyk Göçür (Eksport)</span>
          </button>

          {/* Import / Restore Local Records */}
          <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-300 transition cursor-pointer">
            <Upload className="w-3 h-3 text-slate-600" />
            <span className="hidden sm:inline">Dikelt (Import)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Messages */}
      {syncMessage && (
        <div className="mt-2.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
