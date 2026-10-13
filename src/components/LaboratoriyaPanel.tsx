import React, { useState, useMemo, useCallback } from 'react';
import { HasabatRecord, HepdelikKriteriya } from '../types';
import { OfflineStorageService } from '../services/offlineStorage';
import {
  PARNIK_LIST,
  getParnikConfig,
  getParnikSectors,
  BARLAG_ROUNDS,
  determineBarlagNo,
} from '../utils/parnikConfig';
import { 
  FlaskConical, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Filter, 
  Info,
  Droplet,
  Send,
  Plus,
  X,
  Clock,
  Hourglass,
  Check,
  CheckCheck,
  Layers,
  Sparkles
} from 'lucide-react';

interface LaboratoriyaPanelProps {
  records: HasabatRecord[];
  kriteriyalar: HepdelikKriteriya[];
  onRecordUpdated: () => void;
}

export const LaboratoriyaPanel: React.FC<LaboratoriyaPanelProps> = ({
  records,
  kriteriyalar,
  onRecordUpdated,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  // Filters
  const [filterSane, setFilterSane] = useState<string>(todayStr);
  const [filterParnik, setFilterParnik] = useState<string>('');
  const [filterSektor, setFilterSektor] = useState<string>('');
  const [filterRound, setFilterRound] = useState<string>(''); // '', '1', '2', '3', 'pending'

  // Row edit state
  const [editingRows, setEditingRows] = useState<{ [id: number]: Partial<HasabatRecord> }>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ id: number; alerts: string[] } | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  // New record modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newRecSane, setNewRecSane] = useState<string>(todayStr);
  const [newRecWagt, setNewRecWagt] = useState<string>(nowTime);
  const [newRecBarlagNo, setNewRecBarlagNo] = useState<1 | 2 | 3>(() => determineBarlagNo(nowTime));
  const [newRecParnik, setNewRecParnik] = useState<number>(1);
  const [newRecSektor, setNewRecSektor] = useState<number>(1);
  const [newRecDripMl, setNewRecDripMl] = useState<string>('420');
  const [newRecDripEc, setNewRecDripEc] = useState<string>('2.9');
  const [newRecDripPh, setNewRecDripPh] = useState<string>('5.8');
  const [newRecDrainMl, setNewRecDrainMl] = useState<string>('130');
  const [newRecDrainEc, setNewRecDrainEc] = useState<string>('4.8');
  const [newRecDrainPh, setNewRecDrainPh] = useState<string>('6.1');
  const [newRecNightDrop, setNewRecNightDrop] = useState<string>('6.0');
  const [isSubmittingNew, setIsSubmittingNew] = useState<boolean>(false);

  // Update modal sector if invalid for selected parnik
  const newRecParnikCfg = getParnikConfig(newRecParnik);
  if (!newRecParnikCfg.sectors.includes(newRecSektor)) {
    setNewRecSektor(1);
  }

  // Fast pre-indexed criteria Map
  const criteriaMap = useMemo(() => {
    const map = new Map<string, HepdelikKriteriya>();
    for (const k of kriteriyalar) {
      map.set(`${k.yil}-${k.hepde}`, k);
    }
    return map;
  }, [kriteriyalar]);

  // Date -> criteria cache
  const getActiveKriteriya = useCallback((recordDate: string) => {
    if (!recordDate) return null;
    const d = new Date(recordDate);
    const year = d.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

    return criteriaMap.get(`${year}-${week}`) || null;
  }, [criteriaMap]);

  // Memoized filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterSane && r.sane !== filterSane) return false;
      if (filterParnik && Number(r.parnik) !== Number(filterParnik)) return false;
      if (filterSektor && Number(r.sektor) !== Number(filterSektor)) return false;
      const bNo = determineBarlagNo(r.wagt, r.barlag_no);
      if (filterRound === 'pending') {
        if (r.drain_ml !== null && r.drain_ml !== undefined) return false;
      } else if (filterRound && Number(filterRound) !== bNo) {
        return false;
      }
      return true;
    });
  }, [records, filterSane, filterParnik, filterSektor, filterRound]);

  // Today's records for 3-barlag monitoring & quick entry
  const todayDateRecords = useMemo(() => {
    const targetDate = filterSane || todayStr;
    return records.filter((r) => r.sane === targetDate);
  }, [records, filterSane, todayStr]);

  const pendingDrainCount = useMemo(() => {
    return todayDateRecords.filter(
      (r) => r.drip_ml !== null && (r.drain_ml === null || r.drain_ml === undefined)
    ).length;
  }, [todayDateRecords]);

  const handleInputChange = (id: number, field: keyof HasabatRecord, value: string) => {
    setEditingRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value === '' ? null : value,
      },
    }));
  };

  const parseNum = (v: any) => {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'string') v = v.replace(',', '.').trim();
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const isOutOfBound = (val: number | null | undefined, min?: number, max?: number) => {
    if (val === null || val === undefined || min === undefined || max === undefined) return false;
    return val < min || val > max;
  };

  const handleSave = async (record: HasabatRecord) => {
    const changes = editingRows[record.id] || {};
    setSavingId(record.id);
    setAlertInfo(null);
    setSuccessId(null);

    const d = new Date(record.sane);
    const year = d.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

    const payload = {
      id: record.id,
      drip_ec: changes.drip_ec !== undefined ? parseNum(changes.drip_ec) : record.drip_ec,
      drip_ph: changes.drip_ph !== undefined ? parseNum(changes.drip_ph) : record.drip_ph,
      drain_ml: changes.drain_ml !== undefined ? parseNum(changes.drain_ml) : record.drain_ml,
      drain_ec: changes.drain_ec !== undefined ? parseNum(changes.drain_ec) : record.drain_ec,
      drain_ph: changes.drain_ph !== undefined ? parseNum(changes.drain_ph) : record.drain_ph,
      night_drop: changes.night_drop !== undefined ? parseNum(changes.night_drop) : record.night_drop,
      barlag_no: record.barlag_no || determineBarlagNo(record.wagt),
      yil: year,
      hepde: week,
      parnik: record.parnik,
      sektor: record.sektor,
      wagt: record.wagt,
    };

    if (!navigator.onLine) {
      OfflineStorageService.updateRecordOffline(record.id, payload, 'UPDATE_LAB_RECORD');
      setSuccessId(record.id);
      setTimeout(() => setSuccessId(null), 3000);
      onRecordUpdated();
      setSavingId(null);
      return;
    }

    try {
      const res = await fetch('/api/laboratoriya/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.status === 'WARNING') {
        setAlertInfo({ id: record.id, alerts: result.alerts || [] });
      } else {
        setSuccessId(record.id);
        setTimeout(() => setSuccessId(null), 3000);
      }

      onRecordUpdated();
    } catch (err: any) {
      console.warn('Update server failed, saving offline:', err);
      OfflineStorageService.updateRecordOffline(record.id, payload, 'UPDATE_LAB_RECORD');
      setSuccessId(record.id);
      setTimeout(() => setSuccessId(null), 3000);
      onRecordUpdated();
    } finally {
      setSavingId(null);
    }
  };

  const handleAddNewRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNew(true);

    const payload = {
      sane: newRecSane,
      wagt: newRecWagt,
      barlag_no: newRecBarlagNo,
      parnik: Number(newRecParnik),
      sektor: Number(newRecSektor),
      drip_ml: parseNum(newRecDripMl),
      drip_ec: parseNum(newRecDripEc),
      drip_ph: parseNum(newRecDripPh),
      drain_ml: parseNum(newRecDrainMl),
      drain_ec: parseNum(newRecDrainEc),
      drain_ph: parseNum(newRecDrainPh),
      night_drop: parseNum(newRecNightDrop),
    };

    if (!navigator.onLine) {
      OfflineStorageService.addRecordOffline(payload);
      setIsSubmittingNew(false);
      setShowAddModal(false);
      onRecordUpdated();
      return;
    }

    try {
      const res = await fetch('/api/laboratoriya/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowAddModal(false);
        onRecordUpdated();
      } else {
        throw new Error('Serwer ýalňyşlygy');
      }
    } catch (err) {
      OfflineStorageService.addRecordOffline(payload);
      setShowAddModal(false);
      onRecordUpdated();
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-600" />
              Laboratoriýa Paneli: Drip we Drenaž Seljermesi (Günüň 3 Barlagy)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Operator suwaryş (drip) girizenden soň, Laboratoriýa her barlagyň drenaž möçberini (ml), EC we pH görkezijilerini girizýär. Her sektordan günüň dowamynda 3 gezek drenaž alynýar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {pendingDrainCount > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-900 font-bold animate-pulse">
                <Hourglass className="w-4 h-4 text-amber-600" />
                <span>{pendingDrainCount} barlagda drenaž garaşylýar!</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px]">Duýduryş e-poçta: <b>nurmyradowsahy@gmail.com</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-600 font-semibold">
          <Filter className="w-4 h-4 text-slate-500" />
          <span>Süzgüç:</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <label className="text-slate-500">Sene:</label>
          <input
            type="date"
            value={filterSane}
            onChange={(e) => setFilterSane(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs focus:bg-white focus:outline-none"
          />
        </div>

        {/* Round Filter */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setFilterRound('')}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              filterRound === '' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hemme Barlaglar
          </button>
          <button
            type="button"
            onClick={() => setFilterRound('pending')}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
              filterRound === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Hourglass className="w-3 h-3" />
            ⏳ Drenaž Garaşylýan ({pendingDrainCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterRound('1')}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              filterRound === '1' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            1-nji Barlag (Irden)
          </button>
          <button
            type="button"
            onClick={() => setFilterRound('2')}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              filterRound === '2' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2-nji Barlag (Günortan)
          </button>
          <button
            type="button"
            onClick={() => setFilterRound('3')}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              filterRound === '3' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            3-nji Barlag (Öýlän)
          </button>
        </div>

        {/* Parnik Filter */}
        <div className="flex items-center space-x-1.5 ml-2">
          <label className="text-slate-500">Parnik:</label>
          <select
            value={filterParnik}
            onChange={(e) => setFilterParnik(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs focus:bg-white focus:outline-none font-semibold"
          >
            <option value="">Ähli Parnikler (1-5)</option>
            {PARNIK_LIST.map((p) => {
              const cfg = getParnikConfig(p);
              return (
                <option key={p} value={p}>
                  {p}-nji Parnik ({cfg.varietyLabel}, {cfg.sectorCount} sekt.)
                </option>
              );
            })}
          </select>
        </div>

        {/* Sektor Filter */}
        <div className="flex items-center space-x-1.5">
          <label className="text-slate-500">Sektor:</label>
          <select
            value={filterSektor}
            onChange={(e) => setFilterSektor(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs focus:bg-white focus:outline-none"
          >
            <option value="">Hemmesi</option>
            {(filterParnik ? getParnikSectors(Number(filterParnik)) : [1, 2, 3, 4, 5]).map((s) => (
              <option key={s} value={s}>{s}-nji Sektor {s === 5 && !filterParnik ? '(Diňe P-3)' : ''}</option>
            ))}
          </select>
        </div>

        {(filterParnik || filterSektor || filterRound || (filterSane && filterSane !== todayStr)) && (
          <button
            onClick={() => {
              setFilterSane(todayStr);
              setFilterParnik('');
              setFilterSektor('');
              setFilterRound('');
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline ml-1"
          >
            Arassala
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-slate-400">
            Tapylan: <strong>{filteredRecords.length}</strong> barlag
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Täze Seljerme Goş</span>
          </button>
        </div>
      </div>

      {/* Alert Banner if any row triggered out-of-range */}
      {alertInfo && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2 text-rose-900 shadow-sm animate-pulse">
          <div className="flex items-center justify-between font-bold text-rose-700">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>⚠️ Duýduryş: Kriteriýadan Çykma Hasaba Alyndy!</span>
            </div>
            <span className="text-[11px] font-normal bg-rose-100 border border-rose-300 px-2 py-0.5 rounded text-rose-800">
              E-poçta ugradyldy: <strong>nurmyradowsahy@gmail.com</strong>
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-2 text-rose-800 font-medium">
            {alertInfo.alerts.map((al, idx) => (
              <li key={idx}>{al}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Drainage Entry Cards for Pending Inspections */}
      {pendingDrainCount > 0 && filterRound !== '1' && filterRound !== '2' && filterRound !== '3' && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-900 flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-amber-600" />
              Garaşylýan Drenaž Seljermeleri (Operator Drip girizdi, Drenaž garaşylýar):
            </h3>
            <span className="text-[11px] text-amber-800 font-semibold">
              Her barlagyň drenažyny girizip «Ýatda Sakla» basyň
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayDateRecords
              .filter((r) => r.drip_ml !== null && (r.drain_ml === null || r.drain_ml === undefined))
              .map((rec) => {
                const edits = editingRows[rec.id] || {};
                const dr_ml = edits.drain_ml !== undefined ? edits.drain_ml : '';
                const dr_ec = edits.drain_ec !== undefined ? edits.drain_ec : (rec.drain_ec ?? '4.8');
                const dr_ph = edits.drain_ph !== undefined ? edits.drain_ph : (rec.drain_ph ?? '6.1');
                const bNo = determineBarlagNo(rec.wagt, rec.barlag_no);
                const pCfg = getParnikConfig(rec.parnik);

                const liveDrainPercent = dr_ml && rec.drip_ml && Number(rec.drip_ml) > 0
                  ? ((Number(dr_ml) / Number(rec.drip_ml)) * 100).toFixed(1)
                  : null;

                return (
                  <div key={rec.id} className="bg-white border border-amber-300 rounded-xl p-3.5 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">Parnik {rec.parnik}</span>
                        <span className="font-bold text-emerald-700 text-xs">Sektor {rec.sektor}</span>
                        <span className="text-[10px] text-slate-500">({pCfg.variety})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {bNo}-nji Barlag ({rec.wagt})
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 px-2 py-1 rounded">
                      <span>Operator Drip: <b className="font-mono text-blue-700">{rec.drip_ml} ml</b></span>
                      {liveDrainPercent && (
                        <span>Drenaž: <b className="font-mono text-purple-700">{liveDrainPercent}%</b></span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Drenaž (ml) *</label>
                        <input
                          type="number"
                          placeholder="*"
                          value={dr_ml ?? ''}
                          onChange={(e) => handleInputChange(rec.id, 'drain_ml', e.target.value)}
                          className="w-full bg-purple-50 border border-purple-300 rounded px-2 py-1 text-xs font-mono font-bold text-purple-900 focus:bg-white focus:outline-none placeholder:text-purple-400 placeholder:font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Dren EC</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="*"
                          value={dr_ec ?? ''}
                          onChange={(e) => handleInputChange(rec.id, 'drain_ec', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none placeholder:text-slate-400 placeholder:font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Dren pH</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="*"
                          value={dr_ph ?? ''}
                          onChange={(e) => handleInputChange(rec.id, 'drain_ph', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none placeholder:text-slate-400 placeholder:font-black"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={savingId === rec.id}
                      onClick={() => handleSave(rec)}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingId === rec.id ? 'Ýatda saklanýar...' : 'Drenažy Ýatda Sakla'}</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Ähli Barlaglaryň Drenaž we Iýmit Tablisasy</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Öýjükleriň üstünde gös-göni düzedip «Ýatda Sakla» basyp bilersiňiz
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b font-semibold">
                <th className="py-3 px-3">Sene / Wagt</th>
                <th className="py-3 px-3">Barlag</th>
                <th className="py-3 px-3">Parnik / Sektor</th>
                <th className="py-3 px-3 text-blue-700">Drip (ml)</th>
                <th className="py-3 px-3">Drip EC</th>
                <th className="py-3 px-3">Drip pH</th>
                <th className="py-3 px-3 text-purple-700">Drenaž (ml)</th>
                <th className="py-3 px-3">Drenaž EC</th>
                <th className="py-3 px-3">Drenaž pH</th>
                <th className="py-3 px-3 text-emerald-700">Drenaž %</th>
                <th className="py-3 px-3">Gijeki Ýitgi %</th>
                <th className="py-3 px-3 text-center">Hereket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    Süzgüçlere laýyk gelýän barlag ýazgysy tapylmady.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const edits = editingRows[rec.id] || {};
                  const d_ec = edits.drip_ec !== undefined ? edits.drip_ec : rec.drip_ec;
                  const d_ph = edits.drip_ph !== undefined ? edits.drip_ph : rec.drip_ph;
                  const dr_ml = edits.drain_ml !== undefined ? edits.drain_ml : rec.drain_ml;
                  const dr_ec = edits.drain_ec !== undefined ? edits.drain_ec : rec.drain_ec;
                  const dr_ph = edits.drain_ph !== undefined ? edits.drain_ph : rec.drain_ph;
                  const n_drop = edits.night_drop !== undefined ? edits.night_drop : rec.night_drop;

                  const crit = getActiveKriteriya(rec.sane);
                  const bNo = determineBarlagNo(rec.wagt, rec.barlag_no);
                  const pCfg = getParnikConfig(rec.parnik);

                  // Live drain percent
                  const liveDrip = rec.drip_ml || 0;
                  const liveDrain = dr_ml ? Number(dr_ml) : 0;
                  const liveDrainPercent =
                    liveDrip > 0 && liveDrain > 0
                      ? Number(((liveDrain / liveDrip) * 100).toFixed(1))
                      : rec.drain_percent;

                  const isSaving = savingId === rec.id;
                  const isSuccess = successId === rec.id;

                  const isDrainMlOutOfBound =
                    crit &&
                    dr_ml !== null &&
                    dr_ml !== undefined &&
                    !isNaN(Number(dr_ml)) &&
                    (([1, 2, 4, 6].includes(rec.parnik) &&
                      crit.drenaj_ml_hosa_min != null &&
                      crit.drenaj_ml_hosa_max != null &&
                      isOutOfBound(Number(dr_ml), crit.drenaj_ml_hosa_min, crit.drenaj_ml_hosa_max)) ||
                      ([3, 5].includes(rec.parnik) &&
                        crit.drenaj_ml_gulgune_min != null &&
                        crit.drenaj_ml_gulgune_max != null &&
                        isOutOfBound(Number(dr_ml), crit.drenaj_ml_gulgune_min, crit.drenaj_ml_gulgune_max)));

                  const isNightDropOutOfBound =
                    crit &&
                    n_drop !== null &&
                    n_drop !== undefined &&
                    !isNaN(Number(n_drop)) &&
                    crit.gijeki_yenleme_min != null &&
                    crit.gijeki_yenleme_max != null &&
                    isOutOfBound(Number(n_drop), crit.gijeki_yenleme_min, crit.gijeki_yenleme_max);

                  const hasAlert =
                    crit &&
                    (isOutOfBound(Number(d_ec), crit.besin_ec_min, crit.besin_ec_max) ||
                      isOutOfBound(Number(d_ph), crit.besin_ph_min, crit.besin_ph_max) ||
                      isOutOfBound(Number(dr_ec), crit.drenaj_ec_min, crit.drenaj_ec_max) ||
                      isOutOfBound(Number(dr_ph), crit.drenaj_ph_min, crit.drenaj_ph_max) ||
                      isDrainMlOutOfBound ||
                      isNightDropOutOfBound);

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        hasAlert ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-800">{rec.sane}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{rec.wagt}</div>
                      </td>

                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          bNo === 1 ? 'bg-amber-100 text-amber-800' : bNo === 2 ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {bNo}-nji Barlag
                        </span>
                      </td>

                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-700">
                          {rec.parnik}-nji Parnik <span className="text-[10px] font-normal text-slate-500">({pCfg.variety})</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold">{rec.sektor}-nji Sektor</div>
                      </td>

                      <td className="py-2 px-3 font-mono font-bold text-blue-700">
                        {rec.drip_ml ? `${rec.drip_ml} ml` : '*'}
                      </td>

                      {/* Drip EC */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="*"
                          value={d_ec ?? ''}
                          onChange={(e) => handleInputChange(rec.id, 'drip_ec', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-xs font-mono font-bold text-center focus:bg-white focus:outline-none placeholder:text-slate-400 placeholder:font-black ${
                            crit && isOutOfBound(Number(d_ec), crit.besin_ec_min, crit.besin_ec_max)
                              ? 'bg-rose-100 border-rose-500 text-rose-800'
                              : 'bg-slate-50 border-slate-300 text-slate-800'
                          }`}
                        />
                      </td>

                      {/* Drip pH */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="*"
                          value={d_ph ?? ''}
                          onChange={(e) => handleInputChange(rec.id, 'drip_ph', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-xs font-mono font-bold text-center focus:bg-white focus:outline-none placeholder:text-slate-400 placeholder:font-black ${
                            crit && isOutOfBound(Number(d_ph), crit.besin_ph_min, crit.besin_ph_max)
                              ? 'bg-rose-100 border-rose-500 text-rose-800'
                              : 'bg-slate-50 border-slate-300 text-slate-800'
                          }`}
                        />
                      </td>

                      {/* Drain (ml) */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="*"
                          value={dr_ml ?? ''}
                          onChange={(e) => handleInputChange(rec.id, 'drain_ml', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-xs font-mono font-bold text-center focus:bg-white focus:outline-none placeholder:text-amber-500 placeholder:font-black ${
                            isDrainMlOutOfBound
                              ? 'bg-rose-100 border-rose-500 text-rose-800'
                              : !dr_ml ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-slate-50 border-slate-300 text-purple-800'
                          }`}
                        />
                      </td>

                      {/* Drain EC */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="*"
                          value={dr_ec ?? ''}
                          onChange={(e) => handleInputChange(rec.id, 'drain_ec', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-xs font-mono font-bold text-center focus:bg-white focus:outline-none placeholder:text-slate-400 placeholder:font-black ${
                            crit && isOutOfBound(Number(dr_ec), crit.drenaj_ec_min, crit.drenaj_ec_max)
                              ? 'bg-rose-100 border-rose-500 text-rose-800'
                              : 'bg-slate-50 border-slate-300 text-slate-800'
                          }`}
                        />
                      </td>

                      {/* Drain pH */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="*"
                          value={dr_ph ?? ''}
                          onChange={(e) => handleInputChange(rec.id, 'drain_ph', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-xs font-mono font-bold text-center focus:bg-white focus:outline-none placeholder:text-slate-400 placeholder:font-black ${
                            crit && isOutOfBound(Number(dr_ph), crit.drenaj_ph_min, crit.drenaj_ph_max)
                              ? 'bg-rose-100 border-rose-500 text-rose-800'
                              : 'bg-slate-50 border-slate-300 text-slate-800'
                          }`}
                        />
                      </td>

                      {/* Drain % */}
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                        {liveDrainPercent !== null ? `${liveDrainPercent}%` : '*'}
                      </td>

                      {/* Night Drop */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="*"
                          value={n_drop ?? ''}
                          onChange={(e) => handleInputChange(rec.id, 'night_drop', e.target.value)}
                          className={`w-16 px-2 py-1 border rounded text-xs font-mono text-center focus:bg-white focus:outline-none placeholder:text-slate-400 placeholder:font-black ${
                            isNightDropOutOfBound
                              ? 'bg-rose-100 border-rose-500 text-rose-800 font-bold'
                              : 'bg-slate-50 border-slate-300 text-slate-800'
                          }`}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleSave(rec)}
                            disabled={isSaving}
                            className={`p-1.5 rounded transition ${
                              isSuccess
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                            title="Ýatda sakla"
                          >
                            {isSaving ? (
                              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            ) : isSuccess ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Täze Seljerme Goş */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="px-5 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FlaskConical className="w-5 h-5" />
                <h3 className="font-bold text-sm">Täze Barlag Seljermesini Goş</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-indigo-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewRecord} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sene</label>
                  <input
                    type="date"
                    value={newRecSane}
                    onChange={(e) => setNewRecSane(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Wagt</label>
                  <input
                    type="time"
                    value={newRecWagt}
                    onChange={(e) => setNewRecWagt(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Barlag Tapgyry</label>
                  <select
                    value={newRecBarlagNo}
                    onChange={(e) => setNewRecBarlagNo(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold focus:bg-white focus:outline-none"
                  >
                    <option value={1}>1-nji Barlag (Irden)</option>
                    <option value={2}>2-nji Barlag (Günortan)</option>
                    <option value={3}>3-nji Barlag (Öýlän)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Parnik No</label>
                  <select
                    value={newRecParnik}
                    onChange={(e) => setNewRecParnik(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold focus:bg-white focus:outline-none"
                  >
                    {PARNIK_LIST.map((p) => {
                      const cfg = getParnikConfig(p);
                      return (
                        <option key={p} value={p}>
                          {p}-nji Parnik ({cfg.varietyLabel}, {cfg.sectorCount} sekt.)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sektor No</label>
                  <select
                    value={newRecSektor}
                    onChange={(e) => setNewRecSektor(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold focus:bg-white focus:outline-none"
                  >
                    {newRecParnikCfg.sectors.map((s) => (
                      <option key={s} value={s}>{s}-nji Sektor</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drip Parameters */}
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 space-y-2">
                <div className="font-bold text-blue-900 text-xs">1. Iýmit Ergini (Drip) Girişi</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Drip (ml)</label>
                    <input
                      type="number"
                      value={newRecDripMl}
                      onChange={(e) => setNewRecDripMl(e.target.value)}
                      placeholder="420"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Drip EC</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRecDripEc}
                      onChange={(e) => setNewRecDripEc(e.target.value)}
                      placeholder="2.90"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Drip pH</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRecDripPh}
                      onChange={(e) => setNewRecDripPh(e.target.value)}
                      placeholder="5.80"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Drain Parameters */}
              <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200 space-y-2">
                <div className="font-bold text-purple-900 text-xs">2. Drenaž Suwy Çykyşy</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Drenaž (ml)</label>
                    <input
                      type="number"
                      value={newRecDrainMl}
                      onChange={(e) => setNewRecDrainMl(e.target.value)}
                      placeholder="130"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-purple-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Drenaž EC</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRecDrainEc}
                      onChange={(e) => setNewRecDrainEc(e.target.value)}
                      placeholder="4.80"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Drenaž pH</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRecDrainPh}
                      onChange={(e) => setNewRecDrainPh(e.target.value)}
                      placeholder="6.10"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-0.5">Gijeki Ýeňleme (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRecNightDrop}
                    onChange={(e) => setNewRecNightDrop(e.target.value)}
                    placeholder="6.0"
                    className="w-32 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Ýatyr
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingNew ? 'Goşulýar...' : 'Ýatda Sakla we Goş'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
