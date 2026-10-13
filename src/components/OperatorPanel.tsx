import React, { useState, useEffect, useMemo } from 'react';
import { HasabatRecord, EnvData } from '../types';
import { OfflineStorageService } from '../services/offlineStorage';
import {
  PARNIK_LIST,
  getParnikConfig,
  getParnikSectors,
  determineBarlagNo,
} from '../utils/parnikConfig';
import { 
  Sprout, 
  Sun, 
  Sunset, 
  Thermometer, 
  Droplets, 
  CheckCircle2, 
  Clock, 
  Calendar,
  AlertCircle,
  Plus,
  Layers,
  Check,
  Hourglass,
  Trash2,
  TrendingUp,
  Filter,
  Sparkles
} from 'lucide-react';

interface OperatorPanelProps {
  onRecordAdded: () => void;
  recentRecords: HasabatRecord[];
}

// Preset standard irrigation hours for rapid one-touch selection
const QUICK_HOURS = [
  '07:30', '08:30', '09:30', '10:30', '11:30', '12:30',
  '13:30', '14:30', '15:30', '16:30', '17:30', '18:30',
];

// Preset drip dosages in ml
const QUICK_DOSES = ['100', '120', '140', '150', '180', '200', '250', '300'];

export const OperatorPanel: React.FC<OperatorPanelProps> = ({
  onRecordAdded,
  recentRecords,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [sane, setSane] = useState<string>(todayStr);
  const [wagt, setWagt] = useState<string>(nowTime);
  const [parnik, setParnik] = useState<number>(1);
  const [sektor, setSektor] = useState<number>(1);
  const [dripMl, setDripMl] = useState<string>('150');

  // Environment data ("galan zatlary sol onki onkilik")
  const [sunrise, setSunrise] = useState<string>('06:15');
  const [sunset, setSunset] = useState<string>('19:40');
  const [solarRad, setSolarRad] = useState<string>('1950');
  const [avgTemp, setAvgTemp] = useState<string>('23.5');

  const [autoFilled, setAutoFilled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bottom table filters
  const [tableFilterParnik, setTableFilterParnik] = useState<string>('');
  const [tableFilterSektor, setTableFilterSektor] = useState<string>('');

  const parnikConfig = getParnikConfig(parnik);
  const allowedSectors = parnikConfig.sectors;

  // Ensure sector is within allowed bounds when parnik changes
  useEffect(() => {
    if (!allowedSectors.includes(sektor)) {
      setSektor(allowedSectors[0] || 1);
    }
  }, [parnik, allowedSectors, sektor]);

  // Auto-fetch today's environment data
  useEffect(() => {
    fetch(`/api/operator/env?date=${sane}`)
      .then((res) => res.json())
      .then((data: EnvData) => {
        if (data && (data.sunrise || data.solar_rad || data.avg_temp)) {
          if (data.sunrise) setSunrise(data.sunrise);
          if (data.sunset) setSunset(data.sunset);
          if (data.solar_rad !== null && data.solar_rad !== undefined) setSolarRad(String(data.solar_rad));
          if (data.avg_temp !== null && data.avg_temp !== undefined) setAvgTemp(String(data.avg_temp));
          setAutoFilled(true);
        } else {
          setAutoFilled(false);
        }
      })
      .catch((e) => console.error('Daşky gurşaw maglumaty çekilmedi:', e));
  }, [sane]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dripMl || parseFloat(dripMl) <= 0) {
      setMessage({ type: 'error', text: 'Goýberilen drip möçberini (ml) dogry giriziň!' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    let savedLocally = false;
    const barlagNo = determineBarlagNo(wagt);

    try {
      const payload = {
        sane,
        wagt,
        parnik,
        sektor,
        barlag_no: barlagNo,
        drip_ml: parseFloat(dripMl),
        sunrise,
        sunset,
        solar_rad: solarRad ? parseFloat(solarRad) : null,
        avg_temp: avgTemp ? parseFloat(avgTemp) : null,
      };

      if (!navigator.onLine) {
        OfflineStorageService.addRecordOffline(payload);
        savedLocally = true;
      } else {
        try {
          const res = await fetch('/api/operator/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            throw new Error('Serwer birikmesi ýalňyşlygy');
          }
        } catch (networkErr) {
          // If server call fails, fallback to offline storage
          OfflineStorageService.addRecordOffline(payload);
          savedLocally = true;
        }
      }

      setMessage({
        type: 'success',
        text: savedLocally
          ? `${sane} senesi, sagat ${wagt}, Parnik ${parnik}, Sektor ${sektor} üçin ${dripMl} ml drip OFLAÝN saklandy!`
          : `${sane} senesi, sagat ${wagt}, Parnik ${parnik}, Sektor ${sektor} üçin ${dripMl} ml drip üstünlikli girizildi!`,
      });

      onRecordAdded();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Maglumat goşulmady.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an entered record if wrong
  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm('Bu suwaryş ýazgysyny aýyrmak isleýärsiňizmi?')) return;
    try {
      if (!navigator.onLine) {
        OfflineStorageService.deleteRecordOffline(id);
      } else {
        await fetch(`/api/redaktor/delete/${id}`, { method: 'DELETE' });
      }
      onRecordAdded();
    } catch (err) {
      console.error('Ýazgy aýrylmady:', err);
    }
  };

  // Filter today's records
  const todayRecords = useMemo(() => {
    return recentRecords.filter((r) => r.sane === sane);
  }, [recentRecords, sane]);

  // Records for current selected parnik and sector ordered by hour
  const currentSectorDrips = useMemo(() => {
    return todayRecords
      .filter((r) => Number(r.parnik) === parnik && Number(r.sektor) === sektor && r.drip_ml !== null && r.drip_ml !== undefined)
      .sort((a, b) => (a.wagt || '').localeCompare(b.wagt || ''));
  }, [todayRecords, parnik, sektor]);

  // Metrics for selected sector
  const totalSectorDripToday = currentSectorDrips.reduce((sum, r) => sum + (Number(r.drip_ml) || 0), 0);
  const sectorDripCount = currentSectorDrips.length;
  const avgSectorDrip = sectorDripCount > 0 ? Math.round(totalSectorDripToday / sectorDripCount) : 0;

  // Filtered list for the bottom log table
  const tableRecords = useMemo(() => {
    return todayRecords
      .filter((r) => {
        if (tableFilterParnik && Number(r.parnik) !== Number(tableFilterParnik)) return false;
        if (tableFilterSektor && Number(r.sektor) !== Number(tableFilterSektor)) return false;
        return true;
      })
      .sort((a, b) => (b.wagt || '').localeCompare(a.wagt || ''));
  }, [todayRecords, tableFilterParnik, tableFilterSektor]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-emerald-100 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-600" />
              Operator Paneli: Sagatlar Boýunça Suwaryş (Drip) Girizmek
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Operator damjalaýyn suwaryşda goýberen drip möçberini (ml) sagatlary boýunça girizýär (3 barlag talap edilmeýär). Her goýberilen suwaryş sagadyna görä hasaba alynýar.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 font-semibold">
            <span>🌿 3-nji Parnik: <b>5 sektor</b> | Galan 4 Parnik (P1, 2, 4, 5): <b>4 sektor</b></span>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          {message.type === 'success' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const maxS = parnikConfig.sectorCount;
                  const nextS = sektor < maxS ? sektor + 1 : 1;
                  const nextP = sektor < maxS ? parnik : (parnik < 5 ? parnik + 1 : 1);
                  setParnik(nextP);
                  setSektor(nextS);
                  setMessage(null);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-xs"
              >
                {sektor < parnikConfig.sectorCount
                  ? `➡️ Parnik ${parnik}, Sektor ${sektor + 1}-e geç`
                  : `➡️ Parnik ${parnik < 5 ? parnik + 1 : 1}, Sektor 1-e geç`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Form & Overview Section */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bölüm 1: Sagatlyk Suwaryş we Ýerleşiş */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-600" />
                1. Sagatlyk Drip (Suwaryş) Girizmek
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                parnikConfig.variety === 'Hoşa' ? 'bg-amber-100 text-amber-900' : 'bg-pink-100 text-pink-900'
              }`}>
                {parnikConfig.varietyLabel} ({parnikConfig.sectorCount} sektor)
              </span>
            </h3>

            {/* Sene we Sagat (Wagt) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Sene
                </label>
                <input
                  type="date"
                  value={sane}
                  onChange={(e) => setSane(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Suwaryş Sagady (Wagt)
                  </label>
                  <button
                    type="button"
                    onClick={() => setWagt(new Date().toTimeString().slice(0, 5))}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Häzirki wagt
                  </button>
                </div>
                <input
                  type="time"
                  value={wagt}
                  onChange={(e) => setWagt(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 font-bold focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Hour Selector Chips */}
            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-medium">
                Ýygy ulanylýan suwaryş sagatlary (çalt saýlamak):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_HOURS.map((h) => {
                  const isCur = wagt === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setWagt(h)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition ${
                        isCur
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parnik Saýlawy */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parnik Saýlaň (1 - 5)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {PARNIK_LIST.map((p) => {
                  const isSelected = parnik === p;
                  const pCfg = getParnikConfig(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setParnik(p)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold text-center border transition flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="leading-none">P-{p}</span>
                      <span className={`text-[9px] font-normal mt-1 leading-none ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {pCfg.sectorCount} sekt.
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sektor Saýlawy */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Sektor Saýlaň ({parnik}-nji Parnik: {allowedSectors.length} sektor)
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {parnik === 3 ? '★ 3-nji Parnikde 5 sektor bar' : '1, 2, 4, 5-nji parniklerde 4 sektor bar'}
                </span>
              </div>
              <div className={`grid gap-1.5 ${allowedSectors.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                {allowedSectors.map((sNum) => {
                  const sectorRecs = todayRecords.filter(
                    (r) => Number(r.parnik) === parnik && Number(r.sektor) === sNum && r.drip_ml !== null && r.drip_ml !== undefined
                  );
                  const isSelected = sektor === sNum;
                  const countDrips = sectorRecs.length;
                  const totalMl = sectorRecs.reduce((sum, r) => sum + (Number(r.drip_ml) || 0), 0);

                  return (
                    <button
                      key={sNum}
                      type="button"
                      onClick={() => setSektor(sNum)}
                      className={`px-1.5 py-2.5 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center border text-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="leading-tight">Sektor {sNum}</span>
                      {countDrips > 0 ? (
                        <span className={`text-[9px] font-mono leading-none mt-1 ${isSelected ? 'text-emerald-100' : 'text-emerald-700 font-semibold'}`}>
                          ✓ {countDrips} drip ({totalMl}ml)
                        </span>
                      ) : (
                        <span className={`text-[9px] font-normal leading-none mt-1 ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                          ○ Entek ýok
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Suwaryş Mukdary (Goýberen Drip ml) */}
            <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-2.5">
              <label className="block text-xs font-bold text-blue-900">
                Goýberen Drip Mukdary (ml) — Şu Sagatdaky Suwaryş Dozasy <span className="text-rose-500">*</span>
              </label>
              
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={dripMl}
                  onChange={(e) => setDripMl(e.target.value)}
                  placeholder="Meselem: 150"
                  required
                  className="w-full text-base bg-white border border-blue-300 rounded-lg px-3.5 py-2.5 pr-12 text-slate-900 focus:border-blue-600 focus:outline-none font-mono font-bold"
                />
                <span className="absolute right-3.5 top-3 text-xs text-blue-600 font-mono font-bold">ml</span>
              </div>

              {/* Quick Dosage Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-blue-800 font-semibold mr-1">Tiz saýlaw:</span>
                {QUICK_DOSES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDripMl(d)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition ${
                      dripMl === d
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {d} ml
                  </button>
                ))}
              </div>

              <div className="text-[10px] text-blue-700 flex items-center justify-between pt-1">
                <span>Her bir suwaryşda (sagadyna görä) goýberilýän möçber</span>
                <span className="font-semibold">Kadaly doza: 120 - 200 ml / sagat</span>
              </div>
            </div>
          </div>

          {/* Bölüm 2: Saýlanan Sektoryň Gündelik Sagatlyk Suwaryş Ýagdaýy we Gurşaw */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                2. Sektoryň Gündelik Sagatlyk Drip Ýagdaýy (P-{parnik}, S-{sektor})
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {sane}
              </span>
            </h3>

            {/* KPI Cards for the selected sector today */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Jemi Drip</div>
                <div className="text-base font-bold font-mono text-blue-700 mt-0.5">
                  {totalSectorDripToday} <span className="text-[10px] font-normal">ml</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Suwaryş Sany</div>
                <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                  {sectorDripCount} <span className="text-[10px] font-normal">gezek</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Ortalama Doza</div>
                <div className="text-base font-bold font-mono text-purple-700 mt-0.5">
                  {avgSectorDrip} <span className="text-[10px] font-normal">ml/sagat</span>
                </div>
              </div>
            </div>

            {/* Hourly Drips Timeline for Selected Sector */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-200">
                <span>Şu günki goýberilen suwaryşlar:</span>
                <span className="text-slate-500 font-mono text-[11px]">{sectorDripCount} ýazgy</span>
              </div>

              {currentSectorDrips.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Şu gün Parnik {parnik}, Sektor {sektor} üçin entek drip girizilmedi.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {currentSectorDrips.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold rounded">
                          {item.wagt}
                        </span>
                        <span className="font-mono font-bold text-blue-700 text-xs">
                          {item.drip_ml} ml
                        </span>
                        {item.solar_rad && (
                          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                            {item.solar_rad} J/cm²
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.drain_ml ? (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                            Lab: {item.drain_ml}ml ({item.drain_percent ?? ((Number(item.drain_ml) / Number(item.drip_ml)) * 100).toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Lab barlagy garaşylýar
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(item.id)}
                          title="Aýyrmak"
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daşky Gurşaw Maglumatlary ("galan zatlary sol onki onkilik") */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-500" />
                Daşky Gurşaw Şertleri
                {autoFilled && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-normal">
                    Awtomatiki Dolduryldy
                  </span>
                )}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" />
                    Gün Doguşy
                  </label>
                  <input
                    type="time"
                    value={sunrise}
                    onChange={(e) => setSunrise(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Sunset className="w-3 h-3 text-orange-500" />
                    Gün Ýaşyşy
                  </label>
                  <input
                    type="time"
                    value={sunset}
                    onChange={(e) => setSunset(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-600" />
                    Radiasiýa (J/cm²)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={solarRad}
                    onChange={(e) => setSolarRad(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-rose-500" />
                    24s Ort. Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={avgTemp}
                    onChange={(e) => setAvgTemp(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Ýatda saklanýar...'
                : `Parnik ${parnik}, Sektor ${sektor} — Sagat ${wagt} Dripini Ýatda Sakla`}
            </span>
          </button>
        </div>
      </form>

      {/* Şol günki barlaglar we sagatlyk drip tablisasy */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Şu Günki Girizilen Sagatlyk Drip Ýazgylary ({tableRecords.length} ýazgy)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Operatorlaryň sagatlar boýunça goýberen suwaryş maglumatlary
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={tableFilterParnik}
                onChange={(e) => setTableFilterParnik(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none text-xs font-semibold"
              >
                <option value="">Ähli Parnikler</option>
                {PARNIK_LIST.map((p) => (
                  <option key={p} value={p}>Parnik {p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <select
                value={tableFilterSektor}
                onChange={(e) => setTableFilterSektor(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none text-xs font-semibold"
              >
                <option value="">Ähli Sektorlar</option>
                {[1, 2, 3, 4, 5].map((s) => (
                  <option key={s} value={s}>Sektor {s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {tableRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
            Şu günki sene üçin entek drip ýazgysy ýok. Ýokardaky formadan sagat boýunça drip goşuň.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b">
                  <th className="py-2.5 px-3">Sagat (Wagt)</th>
                  <th className="py-2.5 px-3">Parnik</th>
                  <th className="py-2.5 px-3">Sektor</th>
                  <th className="py-2.5 px-3">Goýberen Drip (ml)</th>
                  <th className="py-2.5 px-3">Drenaž (Lab ml)</th>
                  <th className="py-2.5 px-3">Gatnaşyk (%)</th>
                  <th className="py-2.5 px-3">Radiasiýa</th>
                  <th className="py-2.5 px-3">Ort. Temp</th>
                  <th className="py-2.5 px-3">Laboratoriýa Ýagdaýy</th>
                  <th className="py-2.5 px-3 text-right">Hereket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRecords.map((rec) => {
                  const pct = rec.drain_percent ?? (rec.drip_ml && rec.drain_ml && Number(rec.drip_ml) > 0 ? Number(((Number(rec.drain_ml) / Number(rec.drip_ml)) * 100).toFixed(1)) : null);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {rec.wagt}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{rec.parnik}-nji Parnik</td>
                      <td className="py-2 px-3 font-semibold text-emerald-700">{rec.sektor}-nji Sektor</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{rec.drip_ml ?? '-'} ml</td>
                      <td className="py-2 px-3 font-mono font-bold text-purple-700">{rec.drain_ml ? `${rec.drain_ml} ml` : '-'}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-700">{pct ? `${pct}%` : '-'}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{rec.solar_rad ?? '-'} J/cm²</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{rec.avg_temp ?? '-'} °C</td>
                      <td className="py-2 px-3">
                        {rec.drain_ml ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1 w-fit">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Drenaž bar ({rec.drain_ml}ml)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-medium flex items-center gap-1 w-fit">
                            <Hourglass className="w-3 h-3 text-amber-600" />
                            Lab garaşylýar
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                          title="Pozmak"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
