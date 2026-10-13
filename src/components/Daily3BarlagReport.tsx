import React, { useState, useMemo } from 'react';
import { HasabatRecord, HepdelikKriteriya } from '../types';
import {
  PARNIK_LIST,
  getParnikConfig,
  getParnikSectors,
  BARLAG_ROUNDS,
  determineBarlagNo,
} from '../utils/parnikConfig';
import {
  Droplets,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Calendar,
  Filter,
  FileSpreadsheet,
  Info,
  ChevronRight,
  X,
  Hourglass,
  Layers,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';

interface Daily3BarlagReportProps {
  records: HasabatRecord[];
  kriteriyalar: HepdelikKriteriya[];
}

export interface DailySectorRow {
  parnik: number;
  sektor: number;
  variety: 'Hoşa' | 'Gülgüne';
  varietyLabel: string;
  round1: {
    drip: number | null;
    drain: number | null;
    pct: number | null;
    ec: number | null;
    ph: number | null;
    time?: string;
    record?: HasabatRecord;
  };
  round2: {
    drip: number | null;
    drain: number | null;
    pct: number | null;
    ec: number | null;
    ph: number | null;
    time?: string;
    record?: HasabatRecord;
  };
  round3: {
    drip: number | null;
    drain: number | null;
    pct: number | null;
    ec: number | null;
    ph: number | null;
    time?: string;
    record?: HasabatRecord;
  };
  totalDrip: number;
  totalDrain: number;
  drainPercent: number | null;
  avgDrainEc: number | null;
  avgDrainPh: number | null;
  avgDripEc: number | null;
  avgDripPh: number | null;
  nightDrop: number | null;
  status: 'normal' | 'warning' | 'critical';
  statusLabel: string;
  completedChecks: number;
  pendingChecks: number;
  evaluationNotes: string[];
}

export const Daily3BarlagReport: React.FC<Daily3BarlagReportProps> = ({
  records,
  kriteriyalar = [],
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [filterParnik, setFilterParnik] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'normal' | 'pending'>('all');
  const [selectedSector, setSelectedSector] = useState<DailySectorRow | null>(null);

  // Criteria for selected date
  const activeCriteria = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      const year = d.getFullYear();
      const firstDay = new Date(year, 0, 1);
      const pastDays = (d.getTime() - firstDay.getTime()) / 86400000;
      const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
      return kriteriyalar.find((k) => k.yil === year && k.hepde === week) || kriteriyalar[0] || null;
    } catch {
      return kriteriyalar[0] || null;
    }
  }, [selectedDate, kriteriyalar]);

  // Aggregate day data for all 26 sectors (P1..P6, P3 has 6 sectors, others have 4)
  const sectorRows = useMemo<DailySectorRow[]>(() => {
    const dayRecords = records.filter((r) => r.sane === selectedDate);
    const rows: DailySectorRow[] = [];

    for (const p of PARNIK_LIST) {
      if (filterParnik !== 'all' && filterParnik !== p) continue;
      const pCfg = getParnikConfig(p);

      for (const s of pCfg.sectors) {
        const sectorRecs = dayRecords.filter(
          (r) => Number(r.parnik) === p && Number(r.sektor) === s
        );

        const getRoundData = (roundNo: 1 | 2 | 3) => {
          const roundRecs = sectorRecs.filter((r) => determineBarlagNo(r.wagt, r.barlag_no) === roundNo);
          if (roundRecs.length === 0) {
            return { drip: null, drain: null, pct: null, ec: null, ph: null, time: undefined, record: undefined };
          }
          const totalRoundDrip = roundRecs.reduce((sum, r) => sum + (Number(r.drip_ml) || 0), 0);
          const drip = totalRoundDrip > 0 ? totalRoundDrip : null;
          const recWithDrain = roundRecs.find((r) => r.drain_ml !== null && r.drain_ml !== undefined) || roundRecs[roundRecs.length - 1];
          const drain = recWithDrain?.drain_ml !== null && recWithDrain?.drain_ml !== undefined ? Number(recWithDrain.drain_ml) : null;
          const pct =
            recWithDrain?.drain_percent !== null && recWithDrain?.drain_percent !== undefined
              ? Number(recWithDrain.drain_percent)
              : drip && drain && drip > 0
              ? Number(((drain / drip) * 100).toFixed(1))
              : null;

          return {
            drip,
            drain,
            pct,
            ec: recWithDrain?.drain_ec !== null && recWithDrain?.drain_ec !== undefined ? Number(recWithDrain.drain_ec) : null,
            ph: recWithDrain?.drain_ph !== null && recWithDrain?.drain_ph !== undefined ? Number(recWithDrain.drain_ph) : null,
            time: roundRecs.map((r) => r.wagt).join(', '),
            record: recWithDrain || roundRecs[0],
          };
        };

        const r1 = getRoundData(1);
        const r2 = getRoundData(2);
        const r3 = getRoundData(3);

        const totalDrip = sectorRecs.reduce((sum, r) => sum + (Number(r.drip_ml) || 0), 0);
        const validDrains = [r1.drain, r2.drain, r3.drain].filter((v): v is number => v !== null && v > 0);
        const totalDrain = validDrains.reduce((a, b) => a + b, 0);
        const drainPercent = totalDrip > 0 ? Number(((totalDrain / totalDrip) * 100).toFixed(1)) : null;

        const drainEcs = [r1.ec, r2.ec, r3.ec].filter((v): v is number => v !== null);
        const avgDrainEc = drainEcs.length > 0 ? Number((drainEcs.reduce((a, b) => a + b, 0) / drainEcs.length).toFixed(2)) : null;

        const drainPhs = [r1.ph, r2.ph, r3.ph].filter((v): v is number => v !== null);
        const avgDrainPh = drainPhs.length > 0 ? Number((drainPhs.reduce((a, b) => a + b, 0) / drainPhs.length).toFixed(2)) : null;

        // Drip EC & pH
        const dripEcs = [r1.record?.drip_ec, r2.record?.drip_ec, r3.record?.drip_ec].filter((v): v is number => v !== null && v !== undefined);
        const avgDripEc = dripEcs.length > 0 ? Number((dripEcs.reduce((a, b) => a + b, 0) / dripEcs.length).toFixed(2)) : null;

        const dripPhs = [r1.record?.drip_ph, r2.record?.drip_ph, r3.record?.drip_ph].filter((v): v is number => v !== null && v !== undefined);
        const avgDripPh = dripPhs.length > 0 ? Number((dripPhs.reduce((a, b) => a + b, 0) / dripPhs.length).toFixed(2)) : null;

        const nightDrops = [r1.record?.night_drop, r2.record?.night_drop, r3.record?.night_drop].filter((v): v is number => v !== null && v !== undefined);
        const nightDrop = nightDrops.length > 0 ? Number(nightDrops[nightDrops.length - 1]) : null;

        // Completed & pending drainage
        const checksWithDrip = [r1, r2, r3].filter((r) => r.drip !== null).length;
        const checksWithDrain = [r1, r2, r3].filter((r) => r.drain !== null).length;
        const pendingChecks = Math.max(0, checksWithDrip - checksWithDrain);

        // Evaluation notes
        const notes: string[] = [];
        let status: 'normal' | 'warning' | 'critical' = 'normal';

        const crit = activeCriteria;
        const targetDrainMin = pCfg.variety === 'Hoşa' ? (crit?.drenaj_ml_hosa_min ?? 300) : (crit?.drenaj_ml_gulgune_min ?? 320);
        const targetDrainMax = pCfg.variety === 'Hoşa' ? (crit?.drenaj_ml_hosa_max ?? 450) : (crit?.drenaj_ml_gulgune_max ?? 500);

        if (totalDrain > 0) {
          if (totalDrain < targetDrainMin) {
            notes.push(`Drenaž möçberi pes (${totalDrain} ml < ${targetDrainMin} ml). Suwaryş dozasyny artdyryň.`);
            status = 'warning';
          } else if (totalDrain > targetDrainMax) {
            notes.push(`Drenaž möçberi aşa köp (${totalDrain} ml > ${targetDrainMax} ml). Suwaryş dozasyny peseldiň.`);
            status = 'warning';
          }
        }

        if (drainPercent !== null) {
          if (drainPercent < 20) {
            notes.push(`Drenaž gatnaşygy pes (${drainPercent}% < 20%). Ösümlik iýmiti doly alyp bilmän biler.`);
            status = 'warning';
          } else if (drainPercent > 40) {
            notes.push(`Drenaž gatnaşygy aşa ýokary (${drainPercent}% > 40%). Dökün we suw ýitgisi köpelýär.`);
            status = 'warning';
          }
        }

        if (avgDrainEc !== null && crit) {
          if (avgDrainEc < crit.drenaj_ec_min) {
            notes.push(`Drenaž EC pes (${avgDrainEc} mS < ${crit.drenaj_ec_min} mS). Kök gurşawynda iýmit ýetmezçiligi.`);
            status = 'critical';
          } else if (avgDrainEc > crit.drenaj_ec_max) {
            notes.push(`Drenaž EC ýokary (${avgDrainEc} mS > ${crit.drenaj_ec_max} mS). Kök gurşawynda duzlanma howpy.`);
            status = 'critical';
          }
        }

        if (avgDrainPh !== null && crit) {
          if (avgDrainPh < crit.drenaj_ph_min) {
            notes.push(`Drenaž pH kislotaly (${avgDrainPh} < ${crit.drenaj_ph_min}).`);
            status = 'critical';
          } else if (avgDrainPh > crit.drenaj_ph_max) {
            notes.push(`Drenaž pH aşgar (${avgDrainPh} > ${crit.drenaj_ph_max}).`);
            status = 'critical';
          }
        }

        if (notes.length === 0 && totalDrain > 0) {
          notes.push(`Ähli görkezijiler kadaly (${pCfg.variety} kada: ${targetDrainMin}-${targetDrainMax} ml, Dren %: 25-35%).`);
        } else if (totalDrain === 0) {
          notes.push('Drenaž seljermesi heniz alynyp ýetişilmedi.');
        }

        const statusLabel =
          status === 'critical' ? 'Kritiki' : status === 'warning' ? 'Duýduryş' : totalDrain > 0 ? 'Kadaly' : 'Garaşylýar';

        rows.push({
          parnik: p,
          sektor: s,
          variety: pCfg.variety,
          varietyLabel: pCfg.varietyLabel,
          round1: r1,
          round2: r2,
          round3: r3,
          totalDrip,
          totalDrain,
          drainPercent,
          avgDrainEc,
          avgDrainPh,
          avgDripEc,
          avgDripPh,
          nightDrop,
          status,
          statusLabel,
          completedChecks: checksWithDrain,
          pendingChecks,
          evaluationNotes: notes,
        });
      }
    }

    return rows;
  }, [selectedDate, filterParnik, records, activeCriteria]);

  // Filtered rows by status
  const filteredRows = useMemo(() => {
    return sectorRows.filter((row) => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'pending') return row.pendingChecks > 0;
      return row.status === filterStatus;
    });
  }, [sectorRows, filterStatus]);

  // Day KPIs
  const dayStats = useMemo(() => {
    const totalDrip = sectorRows.reduce((a, b) => a + b.totalDrip, 0);
    const totalDrain = sectorRows.reduce((a, b) => a + b.totalDrain, 0);
    const overallPct = totalDrip > 0 ? Number(((totalDrain / totalDrip) * 100).toFixed(1)) : 0;
    const completedSectors = sectorRows.filter((r) => r.completedChecks === 3).length;
    const pendingSectors = sectorRows.filter((r) => r.pendingChecks > 0).length;
    const criticalCount = sectorRows.filter((r) => r.status === 'critical').length;
    const warningCount = sectorRows.filter((r) => r.status === 'warning').length;

    return {
      totalDrip,
      totalDrain,
      overallPct,
      completedSectors,
      pendingSectors,
      criticalCount,
      warningCount,
    };
  }, [sectorRows]);

  // Export CSV
  const handleExportCSV = () => {
    if (sectorRows.length === 0) return;
    const headers = [
      'Sene',
      'Parnik',
      'Sort',
      'Sektor',
      '1_Barlag_Drip_ml',
      '1_Barlag_Drain_ml',
      '1_Barlag_Drain_%',
      '2_Barlag_Drip_ml',
      '2_Barlag_Drain_ml',
      '2_Barlag_Drain_%',
      '3_Barlag_Drip_ml',
      '3_Barlag_Drain_ml',
      '3_Barlag_Drain_%',
      'Gunluk_Jemi_Drip_ml',
      'Gunluk_Jemi_Drain_ml',
      'Gunluk_Drain_%',
      'Drain_EC',
      'Drain_pH',
      'Yagdayy',
      'Agronom_Bellikler',
    ];

    const rows = sectorRows.map((r) => [
      selectedDate,
      `Parnik ${r.parnik}`,
      r.variety,
      `Sektor ${r.sektor}`,
      r.round1.drip ?? '-',
      r.round1.drain ?? '-',
      r.round1.pct ? `${r.round1.pct}%` : '-',
      r.round2.drip ?? '-',
      r.round2.drain ?? '-',
      r.round2.pct ? `${r.round2.pct}%` : '-',
      r.round3.drip ?? '-',
      r.round3.drain ?? '-',
      r.round3.pct ? `${r.round3.pct}%` : '-',
      r.totalDrip,
      r.totalDrain,
      r.drainPercent ? `${r.drainPercent}%` : '-',
      r.avgDrainEc ?? '-',
      r.avgDrainPh ?? '-',
      r.statusLabel,
      `"${r.evaluationNotes.join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gunluk_3_barlag_netijesi_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Day Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Droplets className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Günüň 3 Barlagy Boýunça Sektorlaryň Doly Netijesi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Her sektordan günüň dowamynda 3 gezek alynýan drenaž we iýmit ergini (Drip). 3-nji parnik 6 sektor, beýleki 5 parnik 4 sektordan ybarat (Jemi 26 sektor).
                </p>
              </div>
            </div>
          </div>

          {/* Date Selector & Export */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <label className="text-xs font-semibold text-slate-600">Sene:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV Hasabat</span>
            </button>
          </div>
        </div>

        {/* Daily KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Parnikler & Sektorlar</span>
            <div className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1">
              <span>6 Parnik</span>
              <span className="text-xs text-emerald-700 font-bold">(26 Sektor)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">P-3: 6 sekt; P-1,2,4,5,6: 4 sekt</div>
          </div>

          <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200">
            <span className="text-[10px] font-bold uppercase text-blue-700">Jemi Drip (Giriş)</span>
            <div className="text-base font-black text-blue-900 mt-0.5">
              {(dayStats.totalDrip / 1000).toFixed(1)} <span className="text-xs font-bold">L</span>
            </div>
            <div className="text-[10px] text-blue-600 font-mono">{(dayStats.totalDrip).toLocaleString()} ml</div>
          </div>

          <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-200">
            <span className="text-[10px] font-bold uppercase text-purple-700">Jemi Drenaž (Çykyş)</span>
            <div className="text-base font-black text-purple-900 mt-0.5">
              {(dayStats.totalDrain / 1000).toFixed(1)} <span className="text-xs font-bold">L</span>
            </div>
            <div className="text-[10px] text-purple-600 font-mono">{(dayStats.totalDrain).toLocaleString()} ml</div>
          </div>

          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase text-emerald-700">Günüň Drenaž %</span>
            <div className="text-base font-black text-emerald-900 mt-0.5">
              {dayStats.overallPct}%
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">Kada: 25% — 35%</div>
          </div>

          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200">
            <span className="text-[10px] font-bold uppercase text-amber-700">Drenaž Garaşylýan</span>
            <div className="text-base font-black text-amber-900 mt-0.5 flex items-center gap-1.5">
              <span>{dayStats.pendingSectors}</span>
              <span className="text-xs font-normal text-amber-700">sektorda</span>
            </div>
            <div className="text-[10px] text-amber-600 font-semibold">Operator girizdi, Lab garaşýar</div>
          </div>

          <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-200">
            <span className="text-[10px] font-bold uppercase text-rose-700">Gyşarma & Duýduryş</span>
            <div className="text-base font-black text-rose-900 mt-0.5 flex items-center gap-2">
              <span>{dayStats.criticalCount}</span>
              <span className="text-xs text-amber-600 font-bold">+{dayStats.warningCount}</span>
            </div>
            <div className="text-[10px] text-rose-600 font-semibold">Kriteriýadan daşary</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Parnik selection buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterParnik('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${
              filterParnik === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ähli Parnikler (26 Sektor)
          </button>

          {PARNIK_LIST.map((p) => {
            const cfg = getParnikConfig(p);
            const isP3 = p === 3;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setFilterParnik(p)}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
                  filterParnik === p
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isP3
                    ? 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{p}-nji Parnik</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                  filterParnik === p ? 'bg-white/20 text-white' : isP3 ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  {cfg.sectorCount} sekt
                </span>
                {isP3 && <span className="text-[10px]">🌸</span>}
              </button>
            );
          })}
        </div>

        {/* Status filter buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded text-xs font-semibold ${
              filterStatus === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hemmesi ({sectorRows.length})
          </button>
          {dayStats.pendingSectors > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                filterStatus === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Hourglass className="w-3 h-3" />
              <span>Garaşylýan ({dayStats.pendingSectors})</span>
            </button>
          )}
          {dayStats.criticalCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus('critical')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                filterStatus === 'critical' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              Kritiki ({dayStats.criticalCount})
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Round Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>
              {selectedDate} Senesindäki 3 Barlagyň Tablisasy ({filteredRows.length} sektor)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Doly giňişleýin seljerme görmek üçin islendik hataryň üstüne basyň
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                <th className="py-3 px-3">Parnik & Sektor</th>
                <th className="py-3 px-3">Sort</th>
                <th className="py-3 px-2 text-center bg-amber-50/50 border-x border-amber-200/60">
                  <div className="text-amber-900 font-bold">1-nji Barlag (Irden)</div>
                  <div className="text-[9.5px] font-normal text-amber-700">Drip / Drenaž / %</div>
                </th>
                <th className="py-3 px-2 text-center bg-sky-50/50 border-r border-sky-200/60">
                  <div className="text-sky-900 font-bold">2-nji Barlag (Günortan)</div>
                  <div className="text-[9.5px] font-normal text-sky-700">Drip / Drenaž / %</div>
                </th>
                <th className="py-3 px-2 text-center bg-purple-50/50 border-r border-purple-200/60">
                  <div className="text-purple-900 font-bold">3-nji Barlag (Öýlän)</div>
                  <div className="text-[9.5px] font-normal text-purple-700">Drip / Drenaž / %</div>
                </th>
                <th className="py-3 px-3 text-right text-blue-800">Jemi Drip</th>
                <th className="py-3 px-3 text-right text-purple-800">Jemi Drenaž</th>
                <th className="py-3 px-3 text-center text-emerald-800">Drenaž %</th>
                <th className="py-3 px-3 text-center">Dren EC / pH</th>
                <th className="py-3 px-3">Agronom Baha</th>
                <th className="py-3 px-2 text-center">Gör</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    Bu sene üçin maglumat tapylmady ýa-da süzgüçlere laýyk gelýän ýazgy ýok.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isP3 = row.parnik === 3;
                  const isCritical = row.status === 'critical';
                  const isWarning = row.status === 'warning';

                  return (
                    <tr
                      key={`${row.parnik}-${row.sektor}`}
                      onClick={() => setSelectedSector(row)}
                      className={`hover:bg-blue-50/40 transition cursor-pointer ${
                        isCritical
                          ? 'bg-rose-50/30'
                          : isWarning
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      {/* Parnik & Sektor */}
                      <td className="py-2.5 px-3">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                            isP3 ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {row.parnik}
                          </span>
                          <span>Parnik {row.parnik}</span>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-700 ml-6.5">
                          Sektor {row.sektor}
                        </div>
                      </td>

                      {/* Sort */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.variety === 'Hoşa'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {row.variety === 'Hoşa' ? '🍅 Hoşa' : '🌸 Gülgüne'}
                        </span>
                      </td>

                      {/* Round 1 */}
                      <td className="py-2 px-2 text-center bg-amber-50/20 border-x border-amber-200/40">
                        {row.round1.drip !== null ? (
                          <div className="font-mono text-[11px] space-y-0.5">
                            <div className="text-slate-700">Drip: <b>{row.round1.drip}</b> ml</div>
                            {row.round1.drain !== null ? (
                              <div className="text-purple-800">Dren: <b>{row.round1.drain}</b> ml ({row.round1.pct}%)</div>
                            ) : (
                              <div className="text-[10px] text-amber-700 font-bold animate-pulse">⏳ Garaşylýar</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Round 2 */}
                      <td className="py-2 px-2 text-center bg-sky-50/20 border-r border-sky-200/40">
                        {row.round2.drip !== null ? (
                          <div className="font-mono text-[11px] space-y-0.5">
                            <div className="text-slate-700">Drip: <b>{row.round2.drip}</b> ml</div>
                            {row.round2.drain !== null ? (
                              <div className="text-purple-800">Dren: <b>{row.round2.drain}</b> ml ({row.round2.pct}%)</div>
                            ) : (
                              <div className="text-[10px] text-amber-700 font-bold animate-pulse">⏳ Garaşylýar</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Round 3 */}
                      <td className="py-2 px-2 text-center bg-purple-50/20 border-r border-purple-200/40">
                        {row.round3.drip !== null ? (
                          <div className="font-mono text-[11px] space-y-0.5">
                            <div className="text-slate-700">Drip: <b>{row.round3.drip}</b> ml</div>
                            {row.round3.drain !== null ? (
                              <div className="text-purple-800">Dren: <b>{row.round3.drain}</b> ml ({row.round3.pct}%)</div>
                            ) : (
                              <div className="text-[10px] text-amber-700 font-bold animate-pulse">⏳ Garaşylýar</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Total Drip */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                        {row.totalDrip > 0 ? `${row.totalDrip} ml` : '—'}
                      </td>

                      {/* Total Drain */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-900">
                        {row.totalDrain > 0 ? `${row.totalDrain} ml` : '—'}
                      </td>

                      {/* Drain % */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {row.drainPercent !== null ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                            row.drainPercent >= 20 && row.drainPercent <= 38
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.drainPercent < 20
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-purple-100 text-purple-900'
                          }`}>
                            {row.drainPercent}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Drain EC / pH */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                        {row.avgDrainEc !== null ? (
                          <div>
                            <span className="font-bold text-slate-800">{row.avgDrainEc} mS</span>
                            {row.avgDrainPh !== null && (
                              <span className="text-slate-500 ml-1">/ {row.avgDrainPh} pH</span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Status / Notes */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                            row.status === 'critical'
                              ? 'bg-rose-600 text-white'
                              : row.status === 'warning'
                              ? 'bg-amber-500 text-white'
                              : row.totalDrain > 0
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {row.statusLabel}
                          </span>
                          <span className="text-[11px] text-slate-600 truncate max-w-[180px]">
                            {row.evaluationNotes[0] || 'Kadaly'}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        <ChevronRight className="w-4 h-4 inline-block hover:text-slate-700" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Greenhouse Visual Cards Grid (All 6 Greenhouses) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>6 Parnik Boýunça Sektorlaryň Görnüşi (Kartlar)</span>
          </h4>
          <span className="text-[11px] text-slate-500">
            3-nji parnik: 6 sektor | Beýleki parnikler: 4 sektor
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {PARNIK_LIST.map((pNum) => {
            const pCfg = getParnikConfig(pNum);
            const pRows = sectorRows.filter((r) => r.parnik === pNum);
            const isP3 = pNum === 3;

            return (
              <div
                key={pNum}
                className={`bg-white border rounded-2xl p-3.5 shadow-xs flex flex-col justify-between transition ${
                  isP3 ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200'
                }`}
              >
                {/* Parnik Header */}
                <div className="border-b border-slate-100 pb-2.5 mb-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                        isP3 ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {pNum}
                      </span>
                      <span>{pNum}-nji Parnik</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        pCfg.variety === 'Hoşa' ? 'bg-red-50 text-red-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {pCfg.varietyLabel}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {pCfg.sectorCount} sekt.
                  </span>
                </div>

                {/* Sectors inside this greenhouse */}
                <div className="space-y-2">
                  {pCfg.sectors.map((sNum) => {
                    const row = pRows.find((r) => r.sektor === sNum);
                    if (!row) return null;

                    return (
                      <div
                        key={sNum}
                        onClick={() => setSelectedSector(row)}
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                          row.status === 'critical'
                            ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
                            : row.status === 'warning'
                            ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'
                            : row.totalDrain > 0
                            ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/50'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-800">Sektor {sNum}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase ${
                            row.status === 'critical'
                              ? 'bg-rose-600 text-white'
                              : row.status === 'warning'
                              ? 'bg-amber-500 text-white'
                              : row.totalDrain > 0
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-300 text-slate-700'
                          }`}>
                            {row.statusLabel}
                          </span>
                        </div>

                        {/* 3 Checks Progress Badges */}
                        <div className="grid grid-cols-3 gap-1 my-1 text-[9.5px] text-center font-mono">
                          <div className={`p-1 rounded ${row.round1.drain ? 'bg-emerald-100 text-emerald-900 font-bold' : row.round1.drip ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-400'}`}>
                            1: {row.round1.drain ? `${row.round1.drain}m` : row.round1.drip ? '⏳' : '—'}
                          </div>
                          <div className={`p-1 rounded ${row.round2.drain ? 'bg-emerald-100 text-emerald-900 font-bold' : row.round2.drip ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-400'}`}>
                            2: {row.round2.drain ? `${row.round2.drain}m` : row.round2.drip ? '⏳' : '—'}
                          </div>
                          <div className={`p-1 rounded ${row.round3.drain ? 'bg-emerald-100 text-emerald-900 font-bold' : row.round3.drip ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-400'}`}>
                            3: {row.round3.drain ? `${row.round3.drain}m` : row.round3.drip ? '⏳' : '—'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono mt-1 pt-1 border-t border-slate-200/50">
                          <span>Jemi: <b>{row.totalDrain} ml</b></span>
                          <span>Gatn: <b>{row.drainPercent ? `${row.drainPercent}%` : '—'}</b></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector Inspection Detail Modal */}
      {selectedSector && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-500 text-white">
                    Parnik {selectedSector.parnik}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-black bg-emerald-500 text-white">
                    Sektor {selectedSector.sektor}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">
                    ({selectedSector.varietyLabel})
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Sene: <b>{selectedDate}</b> — Günüň 3 Barlagynyň Doly Seljermesi
                </div>
              </div>

              <button
                onClick={() => setSelectedSector(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* 3 Rounds Comparison Table */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>3 Barlag Boýunça Gözegçilik:</span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Barlag</th>
                        <th className="py-2 px-3">Wagt</th>
                        <th className="py-2 px-3 text-right">Drip (ml)</th>
                        <th className="py-2 px-3 text-right">Drenaž (ml)</th>
                        <th className="py-2 px-3 text-center">Gatnaşyk %</th>
                        <th className="py-2 px-3 text-center">Dren EC</th>
                        <th className="py-2 px-3 text-center">Dren pH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {[
                        { title: '1-nji Barlag (Irden)', data: selectedSector.round1 },
                        { title: '2-nji Barlag (Günortan)', data: selectedSector.round2 },
                        { title: '3-nji Barlag (Öýlän)', data: selectedSector.round3 },
                      ].map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-bold text-slate-800">{item.title}</td>
                          <td className="py-2 px-3 text-slate-500">{item.data.time || '—'}</td>
                          <td className="py-2 px-3 text-right font-bold text-blue-700">{item.data.drip ?? '—'}</td>
                          <td className="py-2 px-3 text-right font-bold text-purple-700">{item.data.drain ?? '—'}</td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-700">
                            {item.data.pct !== null ? `${item.data.pct}%` : '—'}
                          </td>
                          <td className="py-2 px-3 text-center">{item.data.ec ?? '—'}</td>
                          <td className="py-2 px-3 text-center">{item.data.ph ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Day Totals Strip */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono">
                <div>
                  <div className="text-[10px] font-sans font-semibold text-slate-500">Jemi Drip</div>
                  <div className="text-sm font-bold text-blue-700 mt-0.5">{selectedSector.totalDrip} ml</div>
                </div>
                <div>
                  <div className="text-[10px] font-sans font-semibold text-slate-500">Jemi Drenaž</div>
                  <div className="text-sm font-bold text-purple-700 mt-0.5">{selectedSector.totalDrain} ml</div>
                </div>
                <div>
                  <div className="text-[10px] font-sans font-semibold text-slate-500">Gatnaşyk %</div>
                  <div className="text-sm font-bold text-emerald-700 mt-0.5">{selectedSector.drainPercent ?? '—'}%</div>
                </div>
                <div>
                  <div className="text-[10px] font-sans font-semibold text-slate-500">Ortaça EC/pH</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">
                    {selectedSector.avgDrainEc ?? '—'} / {selectedSector.avgDrainPh ?? '—'}
                  </div>
                </div>
              </div>

              {/* Agronomic Recommendations */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                <h5 className="font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Agronomik Bahalandyrma we Maslahat:</span>
                </h5>
                <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                  {selectedSector.evaluationNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSector(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition"
              >
                Ýap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
