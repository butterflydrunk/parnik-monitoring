import React, { useState, useMemo } from 'react';
import { HasabatRecord, HepdelikKriteriya } from '../types';
import {
  PARNIK_LIST,
  getParnikConfig,
  getParnikSectors,
  getWeekNumber,
} from '../utils/parnikConfig';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  Droplets,
  FlaskConical,
  FileSpreadsheet,
  ChevronRight,
  X,
  Info,
  Building2,
  TrendingUp,
  Activity
} from 'lucide-react';

interface WeeklyParnikSektorCriteriaProps {
  records: HasabatRecord[];
  kriteriyalar: HepdelikKriteriya[];
  initialWeek?: number;
  initialYear?: number;
}

export interface SectorWeeklyEvaluation {
  parnik: number;
  sektor: number;
  variety: 'Hoşa' | 'Gülgüne';
  varietyLabel: string;
  totalChecks: number;
  // Averages (null if no data, displays '*')
  avgDripMl: number | null;
  avgDrainMl: number | null;
  avgDrainPct: number | null;
  avgDripEc: number | null;
  avgDripPh: number | null;
  avgDrainEc: number | null;
  avgDrainPh: number | null;
  avgNightDrop: number | null;
  // Criteria targets
  targetDrainMin: number;
  targetDrainMax: number;
  targetDrainEcMin: number;
  targetDrainEcMax: number;
  targetDrainPhMin: number;
  targetDrainPhMax: number;
  targetDripEcMin: number;
  targetDripEcMax: number;
  targetDripPhMin: number;
  targetDripPhMax: number;
  targetNightDropMin: number;
  targetNightDropMax: number;
  // Status & notes
  status: 'normal' | 'warning' | 'critical' | 'no_data';
  statusLabel: string;
  breachesCount: number;
  recommendations: string[];
  records: HasabatRecord[];
}

export const WeeklyParnikSektorCriteria: React.FC<WeeklyParnikSektorCriteriaProps> = ({
  records,
  kriteriyalar = [],
  initialWeek = 38,
  initialYear = 2026,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<number>(initialWeek);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [filterParnik, setFilterParnik] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'normal' | 'no_data'>('all');
  const [selectedSector, setSelectedSector] = useState<SectorWeeklyEvaluation | null>(null);

  // Available weeks from criteria and records
  const availableWeeks = useMemo(() => {
    const map = new Map<number, { year: number; week: number }>();
    kriteriyalar.forEach((k) => {
      map.set(k.hepde, { year: k.yil, week: k.hepde });
    });
    records.forEach((r) => {
      const { year, week } = getWeekNumber(r.sane);
      if (!map.has(week)) {
        map.set(week, { year, week });
      }
    });
    if (!map.has(38)) {
      map.set(38, { year: 2026, week: 38 });
    }
    return Array.from(map.values()).sort((a, b) => b.week - a.week);
  }, [kriteriyalar, records]);

  // Active criteria for the selected week
  const activeCriteria = useMemo(() => {
    return (
      kriteriyalar.find((k) => k.yil === selectedYear && k.hepde === selectedWeek) ||
      kriteriyalar.find((k) => k.hepde === selectedWeek) ||
      kriteriyalar[0] ||
      null
    );
  }, [kriteriyalar, selectedWeek, selectedYear]);

  // Evaluate all 21 sectors weekly (P1: 4, P2: 4, P3: 5, P4: 4, P5: 4)
  const evaluations = useMemo<SectorWeeklyEvaluation[]>(() => {
    const crit = activeCriteria;
    const result: SectorWeeklyEvaluation[] = [];

    // Filter records for this week
    const weekRecords = records.filter((r) => {
      const { year, week } = getWeekNumber(r.sane);
      return week === selectedWeek && (selectedYear ? year === selectedYear : true);
    });

    for (const p of PARNIK_LIST) {
      if (filterParnik !== 'all' && filterParnik !== p) continue;
      const pCfg = getParnikConfig(p);
      const isHosa = pCfg.variety === 'Hoşa';

      const targetDrainMin = isHosa ? (crit?.drenaj_ml_hosa_min ?? 300) : (crit?.drenaj_ml_gulgune_min ?? 320);
      const targetDrainMax = isHosa ? (crit?.drenaj_ml_hosa_max ?? 450) : (crit?.drenaj_ml_gulgune_max ?? 500);
      const targetDrainEcMin = crit?.drenaj_ec_min ?? 4.2;
      const targetDrainEcMax = crit?.drenaj_ec_max ?? 5.2;
      const targetDrainPhMin = crit?.drenaj_ph_min ?? 5.8;
      const targetDrainPhMax = crit?.drenaj_ph_max ?? 6.6;
      const targetDripEcMin = crit?.besin_ec_min ?? 2.7;
      const targetDripEcMax = crit?.besin_ec_max ?? 3.1;
      const targetDripPhMin = crit?.besin_ph_min ?? 5.5;
      const targetDripPhMax = crit?.besin_ph_max ?? 6.2;
      const targetNightDropMin = crit?.gijeki_yenleme_min ?? 3;
      const targetNightDropMax = crit?.gijeki_yenleme_max ?? 8;

      for (const s of pCfg.sectors) {
        const sectorRecs = weekRecords.filter(
          (r) => Number(r.parnik) === p && Number(r.sektor) === s
        );

        const totalChecks = sectorRecs.length;

        // Drip ML
        const validDrips = sectorRecs
          .map((r) => Number(r.drip_ml))
          .filter((v) => !isNaN(v) && v > 0);
        const avgDripMl = validDrips.length > 0 ? Math.round(validDrips.reduce((a, b) => a + b, 0) / validDrips.length) : null;

        // Drain ML
        const validDrains = sectorRecs
          .map((r) => (r.drain_ml !== null && r.drain_ml !== undefined ? Number(r.drain_ml) : null))
          .filter((v): v is number => v !== null && !isNaN(v) && v > 0);
        const avgDrainMl = validDrains.length > 0 ? Math.round(validDrains.reduce((a, b) => a + b, 0) / validDrains.length) : null;

        // Drain Percent
        const validPcts = sectorRecs
          .map((r) => {
            if (r.drain_percent !== null && r.drain_percent !== undefined) return Number(r.drain_percent);
            if (r.drip_ml && r.drain_ml && Number(r.drip_ml) > 0) {
              return (Number(r.drain_ml) / Number(r.drip_ml)) * 100;
            }
            return null;
          })
          .filter((v): v is number => v !== null && !isNaN(v) && v > 0);
        const avgDrainPct = validPcts.length > 0 ? Number((validPcts.reduce((a, b) => a + b, 0) / validPcts.length).toFixed(1)) : null;

        // Drip EC & pH
        const validDripEcs = sectorRecs.map((r) => Number(r.drip_ec)).filter((v) => !isNaN(v) && v > 0);
        const avgDripEc = validDripEcs.length > 0 ? Number((validDripEcs.reduce((a, b) => a + b, 0) / validDripEcs.length).toFixed(2)) : null;

        const validDripPhs = sectorRecs.map((r) => Number(r.drip_ph)).filter((v) => !isNaN(v) && v > 0);
        const avgDripPh = validDripPhs.length > 0 ? Number((validDripPhs.reduce((a, b) => a + b, 0) / validDripPhs.length).toFixed(2)) : null;

        // Drain EC & pH
        const validDrainEcs = sectorRecs.map((r) => (r.drain_ec !== null ? Number(r.drain_ec) : null)).filter((v): v is number => v !== null && !isNaN(v) && v > 0);
        const avgDrainEc = validDrainEcs.length > 0 ? Number((validDrainEcs.reduce((a, b) => a + b, 0) / validDrainEcs.length).toFixed(2)) : null;

        const validDrainPhs = sectorRecs.map((r) => (r.drain_ph !== null ? Number(r.drain_ph) : null)).filter((v): v is number => v !== null && !isNaN(v) && v > 0);
        const avgDrainPh = validDrainPhs.length > 0 ? Number((validDrainPhs.reduce((a, b) => a + b, 0) / validDrainPhs.length).toFixed(2)) : null;

        // Night Drop
        const validDrops = sectorRecs.map((r) => (r.night_drop !== null ? Number(r.night_drop) : null)).filter((v): v is number => v !== null && !isNaN(v) && v > 0);
        const avgNightDrop = validDrops.length > 0 ? Number((validDrops.reduce((a, b) => a + b, 0) / validDrops.length).toFixed(1)) : null;

        // Agronomic analysis against weekly criteria
        const recommendations: string[] = [];
        let breachesCount = 0;
        let isCritical = false;
        let isWarning = false;

        if (totalChecks === 0 || (avgDrainMl === null && avgDrainEc === null)) {
          recommendations.push('Bu hepde üçin laboratoriya ýa-da operator maglumaty heniz doly girizilmedi (*).');
        } else {
          // 1. Drain ML
          if (avgDrainMl !== null) {
            if (avgDrainMl < targetDrainMin) {
              breachesCount++;
              isWarning = true;
              recommendations.push(`Hepdelik drenaž pes (${avgDrainMl} ml < ${targetDrainMin} ml). Suwaryş möçberini 5-10% artdyrmaly.`);
            } else if (avgDrainMl > targetDrainMax) {
              breachesCount++;
              isWarning = true;
              recommendations.push(`Hepdelik drenaž ýokary (${avgDrainMl} ml > ${targetDrainMax} ml). Suwaryş normasyny peseltmeli.`);
            }
          }

          // 2. Drain Percent
          if (avgDrainPct !== null) {
            if (avgDrainPct < 20) {
              breachesCount++;
              isWarning = true;
              recommendations.push(`Drenaž gatnaşygy pes (${avgDrainPct}% < 20%). Dökün toplanma howpy bar.`);
            } else if (avgDrainPct > 40) {
              breachesCount++;
              isWarning = true;
              recommendations.push(`Drenaž gatnaşygy aşa köp (${avgDrainPct}% > 40%). Dökün ýitgisi köpelýär.`);
            }
          }

          // 3. Drain EC
          if (avgDrainEc !== null) {
            if (avgDrainEc < targetDrainEcMin) {
              breachesCount++;
              isCritical = true;
              recommendations.push(`Drenaž EC pes (${avgDrainEc} mS < ${targetDrainEcMin} mS). Kök gurşawynda iýmit ýetmezçiligi.`);
            } else if (avgDrainEc > targetDrainEcMax) {
              breachesCount++;
              isCritical = true;
              recommendations.push(`Drenaž EC aşa ýokary (${avgDrainEc} mS > ${targetDrainEcMax} mS). Duzlanma howpy! Drip EC-ni peseltmeli.`);
            }
          }

          // 4. Drain pH
          if (avgDrainPh !== null) {
            if (avgDrainPh < targetDrainPhMin) {
              breachesCount++;
              isCritical = true;
              recommendations.push(`Drenaž pH pes/kislotaly (${avgDrainPh} < ${targetDrainPhMin}). Kökler iýmiti doly özleşdirip bilmeýär.`);
            } else if (avgDrainPh > targetDrainPhMax) {
              breachesCount++;
              isCritical = true;
              recommendations.push(`Drenaž pH ýokary/aşgar (${avgDrainPh} > ${targetDrainPhMax}). Kislota dozasyny kadalaşdyrmaly.`);
            }
          }

          // 5. Night drop
          if (avgNightDrop !== null) {
            if (avgNightDrop < targetNightDropMin) {
              breachesCount++;
              isWarning = true;
              recommendations.push(`Gijeki ýeňleme pes (${avgNightDrop}% < ${targetNightDropMin}%). Matada çyglyk aşa köp, kök howpsuzlygyny goraň.`);
            } else if (avgNightDrop > targetNightDropMax) {
              breachesCount++;
              isWarning = true;
              recommendations.push(`Gijeki ýeňleme ýokary (${avgNightDrop}% > ${targetNightDropMax}%). Matanyň aşa guramagyna ýol bermäň.`);
            }
          }

          if (recommendations.length === 0) {
            recommendations.push(`Görkezijiler hepdäniň bellenen kriteriýasyna doly laýyk gelýär (${pCfg.variety}, Dren: ${targetDrainMin}-${targetDrainMax} ml, EC: ${targetDrainEcMin}-${targetDrainEcMax} mS).`);
          }
        }

        const status: 'normal' | 'warning' | 'critical' | 'no_data' =
          totalChecks === 0 || (avgDrainMl === null && avgDrainEc === null)
            ? 'no_data'
            : isCritical
            ? 'critical'
            : isWarning
            ? 'warning'
            : 'normal';

        const statusLabel =
          status === 'critical'
            ? 'Kritiki'
            : status === 'warning'
            ? 'Duýduryş'
            : status === 'normal'
            ? 'Kadaly'
            : 'Maglumat Ýok (*)';

        result.push({
          parnik: p,
          sektor: s,
          variety: pCfg.variety,
          varietyLabel: pCfg.varietyLabel,
          totalChecks,
          avgDripMl,
          avgDrainMl,
          avgDrainPct,
          avgDripEc,
          avgDripPh,
          avgDrainEc,
          avgDrainPh,
          avgNightDrop,
          targetDrainMin,
          targetDrainMax,
          targetDrainEcMin,
          targetDrainEcMax,
          targetDrainPhMin,
          targetDrainPhMax,
          targetDripEcMin,
          targetDripEcMax,
          targetDripPhMin,
          targetDripPhMax,
          targetNightDropMin,
          targetNightDropMax,
          status,
          statusLabel,
          breachesCount,
          recommendations,
          records: sectorRecs,
        });
      }
    }

    return result;
  }, [records, activeCriteria, selectedWeek, selectedYear, filterParnik]);

  // Filtered evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((ev) => {
      if (filterStatus === 'all') return true;
      return ev.status === filterStatus;
    });
  }, [evaluations, filterStatus]);

  // Week KPIs
  const weekStats = useMemo(() => {
    const totalSectors = evaluations.length;
    const normalCount = evaluations.filter((e) => e.status === 'normal').length;
    const warningCount = evaluations.filter((e) => e.status === 'warning').length;
    const criticalCount = evaluations.filter((e) => e.status === 'critical').length;
    const noDataCount = evaluations.filter((e) => e.status === 'no_data').length;

    return {
      totalSectors,
      normalCount,
      warningCount,
      criticalCount,
      noDataCount,
    };
  }, [evaluations]);

  // Export CSV
  const handleExportCSV = () => {
    if (evaluations.length === 0) return;
    const headers = [
      'Hepde',
      'Parnik',
      'Sort',
      'Sektor',
      'Barlag_Sany',
      'Orta_Drip_ml',
      'Orta_Drain_ml',
      'Drain_Kada_Min',
      'Drain_Kada_Max',
      'Orta_Drain_%',
      'Orta_Drip_EC',
      'Orta_Drip_pH',
      'Orta_Drain_EC',
      'Drain_EC_Kada',
      'Orta_Drain_pH',
      'Drain_pH_Kada',
      'Orta_Gijeki_Yenleme_%',
      'Yagdayy',
      'Agronom_Maslahaty',
    ];

    const rows = evaluations.map((e) => [
      `${selectedWeek}-nji hepde (${selectedYear})`,
      `Parnik ${e.parnik}`,
      e.variety,
      `Sektor ${e.sektor}`,
      e.totalChecks,
      e.avgDripMl ?? '*',
      e.avgDrainMl ?? '*',
      e.targetDrainMin,
      e.targetDrainMax,
      e.avgDrainPct ? `${e.avgDrainPct}%` : '*',
      e.avgDripEc ?? '*',
      e.avgDripPh ?? '*',
      e.avgDrainEc ?? '*',
      `${e.targetDrainEcMin}-${e.targetDrainEcMax}`,
      e.avgDrainPh ?? '*',
      `${e.targetDrainPhMin}-${e.targetDrainPhMax}`,
      e.avgNightDrop ? `${e.avgNightDrop}%` : '*',
      e.statusLabel,
      `"${e.recommendations.join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `hepdelik_kriteriya_parnik_sektor_${selectedWeek}_hepde_${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Week Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Her Parnik & Sektor Boýunça Hepdelik Kriteriýa Hasaplamasy</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                    {selectedWeek}-nji hepde ({selectedYear})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  5 sany parnikdäki 21 sektoryň hemmesiniň (P-3: 5 sektor; P-1,2,4,5: 4 sektor) hepdäniň bellenen kriteriýalary esasynda doly hasaplamasy we agronomik seljermesi.
                </p>
              </div>
            </div>
          </div>

          {/* Week Selector Bar & CSV Export */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Week dropdown */}
            <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-blue-600" />
              <label className="text-xs font-bold text-blue-900">Hepde:</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-transparent text-xs font-black text-blue-950 focus:outline-none cursor-pointer"
              >
                {availableWeeks.map((w) => (
                  <option key={w.week} value={w.week}>
                    {w.week}-nji hepde ({w.year})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick week buttons */}
            <div className="flex items-center space-x-1">
              {[38, 39].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeek(w)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedWeek === w
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {w}-nji hepde
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Hepdelik CSV</span>
            </button>
          </div>
        </div>

        {/* Weekly Criteria Target Reference Strip */}
        {activeCriteria ? (
          <div className="mt-4 p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-700" />
              <span>{selectedWeek}-nji Hepdä Bellenen Kriteriýa Kadalary:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-800">
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                🍅 Hoşa Dren: <b>{activeCriteria.drenaj_ml_hosa_min}—{activeCriteria.drenaj_ml_hosa_max} ml</b>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                🌸 Gülgüne Dren: <b>{activeCriteria.drenaj_ml_gulgune_min}—{activeCriteria.drenaj_ml_gulgune_max} ml</b>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                Dren EC: <b>{activeCriteria.drenaj_ec_min}—{activeCriteria.drenaj_ec_max} mS</b>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                Dren pH: <b>{activeCriteria.drenaj_ph_min}—{activeCriteria.drenaj_ph_max}</b>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                Drip EC: <b>{activeCriteria.besin_ec_min}—{activeCriteria.besin_ec_max}</b>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                Gijeki Ýeňleme: <b>{activeCriteria.gijeki_yenleme_min}—{activeCriteria.gijeki_yenleme_max}%</b>
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-2 bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold">
            Bu hepde üçin kriteriýa tapylmady, standart agronomik kadalar ulanylýar.
          </div>
        )}

        {/* Weekly KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Jemi Sektor</span>
            <div className="text-base font-black text-slate-900 mt-0.5">
              21 Sektor <span className="text-xs text-slate-500 font-normal">(5 Parnik)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">P-3: 5 sekt; P-1,2,4,5: 4 sekt</div>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase text-emerald-700">Doly Kadaly</span>
            <div className="text-base font-black text-emerald-900 mt-0.5">
              {weekStats.normalCount} <span className="text-xs text-emerald-600 font-normal">sektor</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">Kriteriýalara laýyk</div>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200">
            <span className="text-[10px] font-bold uppercase text-amber-700">Duýduryş</span>
            <div className="text-base font-black text-amber-900 mt-0.5">
              {weekStats.warningCount} <span className="text-xs text-amber-600 font-normal">sektor</span>
            </div>
            <div className="text-[10px] text-amber-600 font-semibold">Gözegçilik gerek</div>
          </div>

          <div className="bg-rose-50/70 rounded-xl p-3 border border-rose-200">
            <span className="text-[10px] font-bold uppercase text-rose-700">Kritiki Gyşarma</span>
            <div className="text-base font-black text-rose-900 mt-0.5">
              {weekStats.criticalCount} <span className="text-xs text-rose-600 font-normal">sektor</span>
            </div>
            <div className="text-[10px] text-rose-600 font-semibold">Derrew çäre görmeli</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500">Maglumat Ýok (*)</span>
            <div className="text-base font-black text-slate-700 mt-0.5">
              {weekStats.noDataCount} <span className="text-xs text-slate-500 font-normal">sektor</span>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">Lab girizilmedik (*)</div>
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
            Ähli Parnikler (21 Sektor)
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
                    ? 'bg-amber-600 text-white shadow-xs'
                    : isP3
                    ? 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{p}-nji Parnik</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                  filterParnik === p ? 'bg-white/20 text-white' : isP3 ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  {cfg.sectorCount} sekt.
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
            Hemmesi ({evaluations.length})
          </button>
          {weekStats.criticalCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus('critical')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                filterStatus === 'critical' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              Kritiki ({weekStats.criticalCount})
            </button>
          )}
          {weekStats.warningCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus('warning')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                filterStatus === 'warning' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Duýduryş ({weekStats.warningCount})
            </button>
          )}
          {weekStats.noDataCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus('no_data')}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${
                filterStatus === 'no_data' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Maglumat Ýok * ({weekStats.noDataCount})
            </button>
          )}
        </div>
      </div>

      {/* Main Weekly Evaluation Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-700" />
            <span>
              {selectedWeek}-nji Hepdäniň Netijeleri ({filteredEvaluations.length} sektor)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Girizilmedik maglumatlar «*» belligi bilen görkezilýär
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                <th className="py-3 px-3">Parnik & Sektor</th>
                <th className="py-3 px-3">Sort</th>
                <th className="py-3 px-3 text-center">Barlag Sany</th>
                <th className="py-3 px-3 text-right text-blue-800">Ortaça Drip</th>
                <th className="py-3 px-3 text-right text-purple-800">Ortaça Drenaž</th>
                <th className="py-3 px-3 text-center">Dren Kada</th>
                <th className="py-3 px-3 text-center text-emerald-800">Drenaž %</th>
                <th className="py-3 px-3 text-center">Dren EC</th>
                <th className="py-3 px-3 text-center">Dren pH</th>
                <th className="py-3 px-3 text-center">Ýeňleme %</th>
                <th className="py-3 px-3">Ýagdaýy & Agronom Maslahaty</th>
                <th className="py-3 px-2 text-center">Gör</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400">
                    Süzgüçlere laýyk gelýän sektor tapylmady.
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((row) => {
                  const isP3 = row.parnik === 3;
                  const isCritical = row.status === 'critical';
                  const isWarning = row.status === 'warning';
                  const isNoData = row.status === 'no_data';

                  // Drain ML boundary
                  const drainOutOfBound =
                    row.avgDrainMl !== null &&
                    (row.avgDrainMl < row.targetDrainMin || row.avgDrainMl > row.targetDrainMax);

                  // Drain EC boundary
                  const drainEcOutOfBound =
                    row.avgDrainEc !== null &&
                    (row.avgDrainEc < row.targetDrainEcMin || row.avgDrainEc > row.targetDrainEcMax);

                  // Drain pH boundary
                  const drainPhOutOfBound =
                    row.avgDrainPh !== null &&
                    (row.avgDrainPh < row.targetDrainPhMin || row.avgDrainPh > row.targetDrainPhMax);

                  return (
                    <tr
                      key={`${row.parnik}-${row.sektor}`}
                      onClick={() => setSelectedSector(row)}
                      className={`hover:bg-amber-50/30 transition cursor-pointer ${
                        isCritical
                          ? 'bg-rose-50/40'
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

                      {/* Check count */}
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-600">
                        {row.totalChecks > 0 ? `${row.totalChecks} barlag` : <span className="font-black text-slate-400">*</span>}
                      </td>

                      {/* Avg Drip */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                        {row.avgDripMl !== null ? `${row.avgDripMl} ml` : <span className="font-black text-slate-400">*</span>}
                      </td>

                      {/* Avg Drain */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {row.avgDrainMl !== null ? (
                          <span className={drainOutOfBound ? 'text-rose-700 font-black' : 'text-purple-900'}>
                            {row.avgDrainMl} ml
                          </span>
                        ) : (
                          <span className="font-black text-slate-400">*</span>
                        )}
                      </td>

                      {/* Drain Target */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                        {row.targetDrainMin} — {row.targetDrainMax} ml
                      </td>

                      {/* Avg Drain % */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {row.avgDrainPct !== null ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                            row.avgDrainPct >= 20 && row.avgDrainPct <= 38
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-900'
                          }`}>
                            {row.avgDrainPct}%
                          </span>
                        ) : (
                          <span className="font-black text-slate-400">*</span>
                        )}
                      </td>

                      {/* Drain EC */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {row.avgDrainEc !== null ? (
                          <span className={drainEcOutOfBound ? 'text-rose-700 font-black bg-rose-50 px-1.5 py-0.5 rounded' : 'text-slate-800 font-bold'}>
                            {row.avgDrainEc} mS
                          </span>
                        ) : (
                          <span className="font-black text-slate-400">*</span>
                        )}
                      </td>

                      {/* Drain pH */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {row.avgDrainPh !== null ? (
                          <span className={drainPhOutOfBound ? 'text-rose-700 font-black bg-rose-50 px-1.5 py-0.5 rounded' : 'text-slate-800 font-bold'}>
                            {row.avgDrainPh}
                          </span>
                        ) : (
                          <span className="font-black text-slate-400">*</span>
                        )}
                      </td>

                      {/* Night Drop */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {row.avgNightDrop !== null ? (
                          <span className="font-semibold text-slate-700">{row.avgNightDrop}%</span>
                        ) : (
                          <span className="font-black text-slate-400">*</span>
                        )}
                      </td>

                      {/* Status & Recommendation */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-600 text-white'
                              : isWarning
                              ? 'bg-amber-500 text-white'
                              : isNoData
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {row.statusLabel}
                          </span>
                          <span className="text-[11px] text-slate-600 truncate max-w-[200px]">
                            {row.recommendations[0] || 'Kadaly'}
                          </span>
                        </div>
                      </td>

                      {/* View Action */}
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

      {/* Sector Weekly Inspection Detail Modal */}
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
                  <b>{selectedWeek}-nji hepde ({selectedYear})</b> — Hepdelik Kriteriýa Deňeşdirmesi
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
              {/* Weekly Comparison Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Ortaça Drip</span>
                  <div className="text-base font-black text-blue-800 mt-0.5">
                    {selectedSector.avgDripMl !== null ? `${selectedSector.avgDripMl} ml` : '*'}
                  </div>
                  <span className="text-[9.5px] text-slate-400">EC: {selectedSector.avgDripEc ?? '*'} | pH: {selectedSector.avgDripPh ?? '*'}</span>
                </div>

                <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-purple-700">Ortaça Drenaž</span>
                  <div className="text-base font-black text-purple-900 mt-0.5">
                    {selectedSector.avgDrainMl !== null ? `${selectedSector.avgDrainMl} ml` : '*'}
                  </div>
                  <span className="text-[9.5px] text-purple-600 font-semibold">
                    Kada: {selectedSector.targetDrainMin}—{selectedSector.targetDrainMax} ml
                  </span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-700">Drenaž Gatnaşygy</span>
                  <div className="text-base font-black text-emerald-900 mt-0.5">
                    {selectedSector.avgDrainPct !== null ? `${selectedSector.avgDrainPct}%` : '*'}
                  </div>
                  <span className="text-[9.5px] text-emerald-600 font-semibold">Kada: 25% — 35%</span>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold uppercase text-amber-700">Dren EC / pH</span>
                  <div className="text-base font-black text-slate-800 mt-0.5">
                    {selectedSector.avgDrainEc ?? '*'} / {selectedSector.avgDrainPh ?? '*'}
                  </div>
                  <span className="text-[9.5px] text-slate-500">
                    Kada: {selectedSector.targetDrainEcMin}-{selectedSector.targetDrainEcMax} mS
                  </span>
                </div>
              </div>

              {/* Agronomic Recommendations */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Agronomik Bahalandyrma & Maslahat ({selectedWeek}-nji hepde):</span>
                </h5>
                <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                  {selectedSector.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>

              {/* Weekly Records Log */}
              <div>
                <h5 className="font-bold text-slate-800 mb-2">
                  Bu hepdä degişli girizilen barlaglar ({selectedSector.records.length} sany):
                </h5>
                {selectedSector.records.length === 0 ? (
                  <div className="text-slate-400 p-4 border rounded-xl text-center">
                    Bu hepdede bu sektor üçin barlag ýazgysy girizilmedik (*).
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                        <tr>
                          <th className="py-2 px-3">Sene</th>
                          <th className="py-2 px-3">Wagt</th>
                          <th className="py-2 px-3 text-right">Drip (ml)</th>
                          <th className="py-2 px-3 text-right">Drenaž (ml)</th>
                          <th className="py-2 px-3 text-center">Dren %</th>
                          <th className="py-2 px-3 text-center">Dren EC</th>
                          <th className="py-2 px-3 text-center">Dren pH</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono">
                        {selectedSector.records.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-sans text-slate-800">{r.sane}</td>
                            <td className="py-2 px-3 text-slate-500">{r.wagt}</td>
                            <td className="py-2 px-3 text-right font-bold text-blue-700">{r.drip_ml ?? '*'}</td>
                            <td className="py-2 px-3 text-right font-bold text-purple-700">{r.drain_ml ?? '*'}</td>
                            <td className="py-2 px-3 text-center font-bold text-emerald-700">
                              {r.drain_percent ? `${r.drain_percent}%` : '*'}
                            </td>
                            <td className="py-2 px-3 text-center">{r.drain_ec ?? '*'}</td>
                            <td className="py-2 px-3 text-center">{r.drain_ph ?? '*'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
