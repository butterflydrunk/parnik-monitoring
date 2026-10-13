import React, { useState, useMemo } from 'react';
import { 
  HasabatRecord, 
  HepdelikKriteriya,
  ParnikSektorCriteriaSummary,
  ParnikMetricEvaluation 
} from '../types';
import { 
  PARNIK_LIST,
  getParnikConfig,
  getParnikSectors,
  BARLAG_ROUNDS,
  determineBarlagNo
} from '../utils/parnikConfig';
import { Daily3BarlagReport } from './Daily3BarlagReport';
import { 
  LineChart, 
  Droplets, 
  Activity, 
  Filter, 
  Sun,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  Download,
  Info,
  Layers,
  FlaskConical,
  Gauge,
  Thermometer,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  FileSpreadsheet,
  Moon,
  Building2,
  Eye,
  X,
  LayoutGrid,
  ChevronRight,
  Sparkles,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  ComposedChart,
  Area,
  ReferenceLine
} from 'recharts';

interface MonitoringPanelProps {
  records: HasabatRecord[];
  kriteriyalar?: HepdelikKriteriya[];
}

export interface DetectedCriterionEvent {
  id: string;
  recordId: number;
  sane: string;
  wagt: string;
  parnik: number;
  sektor: number;
  paramName: string;
  paramCode:
    | 'drip_ph'
    | 'drip_ec'
    | 'drain_ph'
    | 'drain_ec'
    | 'drain_percent'
    | 'drain_ml_hosa'
    | 'drain_ml_gulgune'
    | 'night_drop'
    | 'solar_rad'
    | 'temp';
  value: number;
  unit: string;
  min: number;
  max: number;
  severity: 'critical' | 'warning';
  direction: 'high' | 'low';
  deviation: number;
  criteriaWeek: number;
  recommendation: string;
}

// Helper to evaluate a greenhouse & sector against weekly criteria
export function evaluateParnikSektor(
  parnik: number,
  sektor: number,
  records: HasabatRecord[],
  crit: HepdelikKriteriya | undefined,
  sane?: string
): ParnikSektorCriteriaSummary {
  const variety: 'Hoşa' | 'Gülgüne' = [1, 2, 4, 6].includes(parnik) ? 'Hoşa' : 'Gülgüne';
  const varietyLabel = [1, 2, 4, 6].includes(parnik) 
    ? 'Hoşa Pomidor (P-1, 2, 4, 6)' 
    : 'Gülgüne Pomidor (P-3, 5)';

  const count = records.length;

  // Helper to extract drain_ml safely even if string, or derive from drip_ml & drain_percent
  const getRecordDrainMl = (r: HasabatRecord): number | null => {
    if (r.drain_ml !== null && r.drain_ml !== undefined && (r.drain_ml as any) !== '') {
      const n = typeof r.drain_ml === 'string' ? Number(String(r.drain_ml).replace(',', '.')) : Number(r.drain_ml);
      if (!isNaN(n) && n > 0) return n;
    }
    // Fallback: derive from drip_ml and drain_percent if available
    if (r.drip_ml && r.drain_percent) {
      const drip = typeof r.drip_ml === 'string' ? Number(String(r.drip_ml).replace(',', '.')) : Number(r.drip_ml);
      const pct = typeof r.drain_percent === 'string' ? Number(String(r.drain_percent).replace(',', '.')) : Number(r.drain_percent);
      if (!isNaN(drip) && !isNaN(pct) && drip > 0 && pct > 0) {
        return Math.round((drip * pct) / 100);
      }
    }
    return null;
  };

  const calcAvg = (getter: (r: HasabatRecord) => number | null | undefined) => {
    const valid = records
      .map(getter)
      .map((v) => {
        if (v === null || v === undefined || (v as any) === '') return null;
        const num = typeof v === 'string' ? Number(String(v).replace(',', '.')) : Number(v);
        return isNaN(num) ? null : num;
      })
      .filter((v): v is number => v !== null);
    if (valid.length === 0) return null;
    return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
  };

  const avg_drip_ph = calcAvg((r) => r.drip_ph);
  const avg_drip_ec = calcAvg((r) => r.drip_ec);
  const avg_drain_ph = calcAvg((r) => r.drain_ph);
  const avg_drain_ec = calcAvg((r) => r.drain_ec);
  const avg_drip_ml = calcAvg((r) => r.drip_ml);
  const avg_drain_ml = calcAvg(getRecordDrainMl);
  const avg_night_drop = calcAvg((r) => r.night_drop);
  const avg_solar_rad = calcAvg((r) => r.solar_rad);

  const total_drip_ml = records.reduce((acc, r) => {
    const drip = r.drip_ml ? Number(String(r.drip_ml).replace(',', '.')) : 0;
    return acc + (isNaN(drip) ? 0 : drip);
  }, 0);

  const total_drain_ml = records.reduce((acc, r) => {
    const dMl = getRecordDrainMl(r);
    return acc + (dMl || 0);
  }, 0);

  const drain_percent = total_drip_ml > 0 && total_drain_ml > 0
    ? Number(((total_drain_ml / total_drip_ml) * 100).toFixed(1))
    : calcAvg((r) => r.drain_percent);

  // Criteria thresholds
  const dripPhMin = crit?.besin_ph_min ?? 5.5;
  const dripPhMax = crit?.besin_ph_max ?? 6.2;
  const dripEcMin = crit?.besin_ec_min ?? 2.8;
  const dripEcMax = crit?.besin_ec_max ?? 3.2;

  const drainPhMin = crit?.drenaj_ph_min ?? 5.8;
  const drainPhMax = crit?.drenaj_ph_max ?? 6.5;
  const drainEcMin = crit?.drenaj_ec_min ?? 4.5;
  const drainEcMax = crit?.drenaj_ec_max ?? 5.5;

  const drainMlMin = variety === 'Hoşa' 
    ? (crit?.drenaj_ml_hosa_min ?? 300) 
    : (crit?.drenaj_ml_gulgune_min ?? 320);
  const drainMlMax = variety === 'Hoşa' 
    ? (crit?.drenaj_ml_hosa_max ?? 450) 
    : (crit?.drenaj_ml_gulgune_max ?? 500);

  const drainPercentMin = 20;
  const drainPercentMax = 35;

  const nightDropMin = crit?.gijeki_yenleme_min ?? 3.0;
  const nightDropMax = crit?.gijeki_yenleme_max ?? 8.0;

  const solarRadMin = crit?.radiasiya_min ?? 1200;
  const solarRadMax = crit?.radiasiya_max ?? 2400;

  const evaluations: ParnikMetricEvaluation[] = [];

  // 1. Drip pH
  if (avg_drip_ph !== null) {
    if (avg_drip_ph < dripPhMin) {
      const dev = Number((dripPhMin - avg_drip_ph).toFixed(2));
      evaluations.push({
        paramCode: 'drip_ph',
        paramName: 'Iýmit Drip pH',
        value: avg_drip_ph,
        unit: 'pH',
        min: dripPhMin,
        max: dripPhMax,
        deviation: dev,
        direction: 'low',
        status: dev > 0.4 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Drip pH pes (${avg_drip_ph}). Kislota dozasyny sazlaň, kökleriň kislotalaşmagynyň öňüni alyň.`,
      });
    } else if (avg_drip_ph > dripPhMax) {
      const dev = Number((avg_drip_ph - dripPhMax).toFixed(2));
      evaluations.push({
        paramCode: 'drip_ph',
        paramName: 'Iýmit Drip pH',
        value: avg_drip_ph,
        unit: 'pH',
        min: dripPhMin,
        max: dripPhMax,
        deviation: dev,
        direction: 'high',
        status: dev > 0.4 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Drip pH ýokary (${avg_drip_ph}). Nitrat kislotasyny köpeldiň, mikroelement siňmegini goraň.`,
      });
    } else {
      evaluations.push({
        paramCode: 'drip_ph',
        paramName: 'Iýmit Drip pH',
        value: avg_drip_ph,
        unit: 'pH',
        min: dripPhMin,
        max: dripPhMax,
        deviation: 0,
        direction: 'normal',
        status: 'normal',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Drip pH doly kadasynda (${avg_drip_ph} pH).`,
      });
    }
  }

  // 2. Drip EC
  if (avg_drip_ec !== null) {
    if (avg_drip_ec < dripEcMin) {
      const dev = Number((dripEcMin - avg_drip_ec).toFixed(2));
      evaluations.push({
        paramCode: 'drip_ec',
        paramName: 'Iýmit Drip EC',
        value: avg_drip_ec,
        unit: 'mS/cm',
        min: dripEcMin,
        max: dripEcMax,
        deviation: dev,
        direction: 'low',
        status: dev > 0.5 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Iýmit ergin konsentrasiýasy gowşak (${avg_drip_ec} mS). Ene ergin doňaklygyny gowulandyryň.`,
      });
    } else if (avg_drip_ec > dripEcMax) {
      const dev = Number((avg_drip_ec - dripEcMax).toFixed(2));
      evaluations.push({
        paramCode: 'drip_ec',
        paramName: 'Iýmit Drip EC',
        value: avg_drip_ec,
        unit: 'mS/cm',
        min: dripEcMin,
        max: dripEcMax,
        deviation: dev,
        direction: 'high',
        status: dev > 0.5 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Iýmit EC aşa ýokary (${avg_drip_ec} mS). Suwaryş dozasyna arassa suw paýyny goşuň.`,
      });
    } else {
      evaluations.push({
        paramCode: 'drip_ec',
        paramName: 'Iýmit Drip EC',
        value: avg_drip_ec,
        unit: 'mS/cm',
        min: dripEcMin,
        max: dripEcMax,
        deviation: 0,
        direction: 'normal',
        status: 'normal',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Iýmit EC kadasynda (${avg_drip_ec} mS/cm).`,
      });
    }
  }

  // 3. Drain pH
  if (avg_drain_ph !== null) {
    if (avg_drain_ph < drainPhMin) {
      const dev = Number((drainPhMin - avg_drain_ph).toFixed(2));
      evaluations.push({
        paramCode: 'drain_ph',
        paramName: 'Drenaž pH',
        value: avg_drain_ph,
        unit: 'pH',
        min: drainPhMin,
        max: drainPhMax,
        deviation: dev,
        direction: 'low',
        status: dev > 0.4 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Kök gurşawy turşulaşýar (${avg_drain_ph} pH). Ýuwuş suwaryşyny geçiriň.`,
      });
    } else if (avg_drain_ph > drainPhMax) {
      const dev = Number((avg_drain_ph - drainPhMax).toFixed(2));
      evaluations.push({
        paramCode: 'drain_ph',
        paramName: 'Drenaž pH',
        value: avg_drain_ph,
        unit: 'pH',
        min: drainPhMin,
        max: drainPhMax,
        deviation: dev,
        direction: 'high',
        status: dev > 0.4 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Drenaž pH ýokary (${avg_drain_ph} pH). Kislotalylyk deňagramlylygyny durnuklaşdyryň.`,
      });
    } else {
      evaluations.push({
        paramCode: 'drain_ph',
        paramName: 'Drenaž pH',
        value: avg_drain_ph,
        unit: 'pH',
        min: drainPhMin,
        max: drainPhMax,
        deviation: 0,
        direction: 'normal',
        status: 'normal',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Drenaž pH kadasynda (${avg_drain_ph} pH).`,
      });
    }
  }

  // 4. Drain EC
  if (avg_drain_ec !== null) {
    if (avg_drain_ec < drainEcMin) {
      const dev = Number((drainEcMin - avg_drain_ec).toFixed(2));
      evaluations.push({
        paramCode: 'drain_ec',
        paramName: 'Drenaž EC',
        value: avg_drain_ec,
        unit: 'mS/cm',
        min: drainEcMin,
        max: drainEcMax,
        deviation: dev,
        direction: 'low',
        status: dev > 0.5 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Matda duz ýetmezçiligi bar (${avg_drain_ec} mS). Suwaryş EC-sini güýçlendiriň.`,
      });
    } else if (avg_drain_ec > drainEcMax) {
      const dev = Number((avg_drain_ec - drainEcMax).toFixed(2));
      evaluations.push({
        paramCode: 'drain_ec',
        paramName: 'Drenaž EC',
        value: avg_drain_ec,
        unit: 'mS/cm',
        min: drainEcMin,
        max: drainEcMax,
        deviation: dev,
        direction: 'high',
        status: dev > 0.8 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Kök gurşawynda duz toplanýar (${avg_drain_ec} mS). Drenaž göterimini artdyryp ýuwuň.`,
      });
    } else {
      evaluations.push({
        paramCode: 'drain_ec',
        paramName: 'Drenaž EC',
        value: avg_drain_ec,
        unit: 'mS/cm',
        min: drainEcMin,
        max: drainEcMax,
        deviation: 0,
        direction: 'normal',
        status: 'normal',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Drenaž EC kadasynda (${avg_drain_ec} mS/cm).`,
      });
    }
  }

  // 5. Drain Volume ml (Hoşa vs Gülgüne)
  if (avg_drain_ml !== null) {
    const paramName = variety === 'Hoşa' 
      ? 'Drenaž Mukdary (Hoşa pomidor)' 
      : 'Drenaž Mukdary (Gülgüne pomidor)';
    if (avg_drain_ml < drainMlMin) {
      const dev = Number((drainMlMin - avg_drain_ml).toFixed(1));
      evaluations.push({
        paramCode: variety === 'Hoşa' ? 'drain_ml_hosa' : 'drain_ml_gulgune',
        paramName,
        value: avg_drain_ml,
        unit: 'ml',
        min: drainMlMin,
        max: drainMlMax,
        deviation: dev,
        direction: 'low',
        status: dev > 60 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor} (${varietyLabel}): Drenaž mukdary az (${avg_drain_ml} ml, kada: ${drainMlMin}-${drainMlMax} ml). Suwaryş dozasyny ýokarlandyryň.`,
      });
    } else if (avg_drain_ml > drainMlMax) {
      const dev = Number((avg_drain_ml - drainMlMax).toFixed(1));
      evaluations.push({
        paramCode: variety === 'Hoşa' ? 'drain_ml_hosa' : 'drain_ml_gulgune',
        paramName,
        value: avg_drain_ml,
        unit: 'ml',
        min: drainMlMin,
        max: drainMlMax,
        deviation: dev,
        direction: 'high',
        status: dev > 60 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor} (${varietyLabel}): Drenaž aşa köp (${avg_drain_ml} ml, kada: ${drainMlMin}-${drainMlMax} ml). Ergin ýitgisiniň öňüni alyň.`,
      });
    } else {
      evaluations.push({
        paramCode: variety === 'Hoşa' ? 'drain_ml_hosa' : 'drain_ml_gulgune',
        paramName,
        value: avg_drain_ml,
        unit: 'ml',
        min: drainMlMin,
        max: drainMlMax,
        deviation: 0,
        direction: 'normal',
        status: 'normal',
        recommendation: `Parnik ${parnik} Sektor ${sektor} (${varietyLabel}): Drenaž mukdary doly kadasynda (${avg_drain_ml} ml).`,
      });
    }
  } else {
    const paramName = variety === 'Hoşa' 
      ? 'Drenaž Mukdary (Hoşa pomidor)' 
      : 'Drenaž Mukdary (Gülgüne pomidor)';
    evaluations.push({
      paramCode: variety === 'Hoşa' ? 'drain_ml_hosa' : 'drain_ml_gulgune',
      paramName,
      value: null,
      unit: 'ml',
      min: drainMlMin,
      max: drainMlMax,
      deviation: 0,
      direction: 'normal',
      status: 'warning',
      recommendation: `Parnik ${parnik} Sektor ${sektor} (${varietyLabel}): Drenaž suw mukdary entek girizilmedi. Operator ýa-da Laboratoriýadan drenaž mukdaryny (ml) giriziň.`,
    });
  }

  // 6. Drain %
  if (drain_percent !== null) {
    if (drain_percent < drainPercentMin) {
      const dev = Number((drainPercentMin - drain_percent).toFixed(1));
      evaluations.push({
        paramCode: 'drain_percent',
        paramName: 'Drenaž Göterimi (%)',
        value: drain_percent,
        unit: '%',
        min: drainPercentMin,
        max: drainPercentMax,
        deviation: dev,
        direction: 'low',
        status: dev > 5 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Drenaž % pes (${drain_percent}%). Suw mukdaryny ýokarlandyryň.`,
      });
    } else if (drain_percent > drainPercentMax) {
      const dev = Number((drain_percent - drainPercentMax).toFixed(1));
      evaluations.push({
        paramCode: 'drain_percent',
        paramName: 'Drenaž Göterimi (%)',
        value: drain_percent,
        unit: '%',
        min: drainPercentMin,
        max: drainPercentMax,
        deviation: dev,
        direction: 'high',
        status: dev > 8 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Drenaž % ýokary (${drain_percent}%). Suwaryş dozasyny azaldyň.`,
      });
    } else {
      evaluations.push({
        paramCode: 'drain_percent',
        paramName: 'Drenaž Göterimi (%)',
        value: drain_percent,
        unit: '%',
        min: drainPercentMin,
        max: drainPercentMax,
        deviation: 0,
        direction: 'normal',
        status: 'normal',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Drenaž göterimi kadasynda (${drain_percent}%).`,
      });
    }
  }

  // 7. Night drop
  if (avg_night_drop !== null) {
    if (avg_night_drop < nightDropMin) {
      const dev = Number((nightDropMin - avg_night_drop).toFixed(1));
      evaluations.push({
        paramCode: 'night_drop',
        paramName: 'Gijeki Ýeňleme (%)',
        value: avg_night_drop,
        unit: '%',
        min: nightDropMin,
        max: nightDropMax,
        deviation: dev,
        direction: 'low',
        status: 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Gijeki ýeňleme gowşak (${avg_night_drop}%). Gijeki şemalladyşy sazlaň.`,
      });
    } else if (avg_night_drop > nightDropMax) {
      const dev = Number((avg_night_drop - nightDropMax).toFixed(1));
      evaluations.push({
        paramCode: 'night_drop',
        paramName: 'Gijeki Ýeňleme (%)',
        value: avg_night_drop,
        unit: '%',
        min: nightDropMin,
        max: nightDropMax,
        deviation: dev,
        direction: 'high',
        status: dev > 3 ? 'critical' : 'warning',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Gijeki agram ýitgisi köp (${avg_night_drop}%). Ösümligiň suwsuzlyk stresini goraň.`,
      });
    } else {
      evaluations.push({
        paramCode: 'night_drop',
        paramName: 'Gijeki Ýeňleme (%)',
        value: avg_night_drop,
        unit: '%',
        min: nightDropMin,
        max: nightDropMax,
        deviation: 0,
        direction: 'normal',
        status: 'normal',
        recommendation: `Parnik ${parnik} Sektor ${sektor}: Gijeki ýeňleme kadasynda (${avg_night_drop}%).`,
      });
    }
  }

  // 8. Solar radiation
  if (avg_solar_rad !== null) {
    if (avg_solar_rad < solarRadMin) {
      const dev = Number((solarRadMin - avg_solar_rad).toFixed(0));
      evaluations.push({
        paramCode: 'solar_rad',
        paramName: 'Gün Radiasiýasy (J/cm²)',
        value: avg_solar_rad,
        unit: 'J/cm²',
        min: solarRadMin,
        max: solarRadMax,
        deviation: dev,
        direction: 'low',
        status: 'warning',
        recommendation: `Parnik ${parnik}: Radiasiýa pes (${avg_solar_rad} J/cm²). Suwaryş dozasyny azaldyň.`,
      });
    } else if (avg_solar_rad > solarRadMax) {
      const dev = Number((avg_solar_rad - solarRadMax).toFixed(0));
      evaluations.push({
        paramCode: 'solar_rad',
        paramName: 'Gün Radiasiýasy (J/cm²)',
        value: avg_solar_rad,
        unit: 'J/cm²',
        min: solarRadMin,
        max: solarRadMax,
        deviation: dev,
        direction: 'high',
        status: 'warning',
        recommendation: `Parnik ${parnik}: Radiasiýa güýçli (${avg_solar_rad} J/cm²). Kölegeli ekranlary işe giriziň.`,
      });
    } else {
      evaluations.push({
        paramCode: 'solar_rad',
        paramName: 'Gün Radiasiýasy (J/cm²)',
        value: avg_solar_rad,
        unit: 'J/cm²',
        min: solarRadMin,
        max: solarRadMax,
        deviation: 0,
        direction: 'normal',
        status: 'normal',
        recommendation: `Parnik ${parnik}: Gün radiasiýasy kadaly (${avg_solar_rad} J/cm²).`,
      });
    }
  }

  const criticalCount = evaluations.filter((e) => e.status === 'critical').length;
  const warningCount = evaluations.filter((e) => e.status === 'warning').length;

  let overallStatus: 'normal' | 'warning' | 'critical' = 'normal';
  if (criticalCount > 0) overallStatus = 'critical';
  else if (warningCount > 0) overallStatus = 'warning';

  return {
    key: sane ? `${sane}_P${parnik}_S${sektor}` : `P${parnik}_S${sektor}`,
    parnik,
    sektor,
    sane,
    variety,
    varietyLabel,
    recordCount: count,
    avg_drip_ph,
    avg_drip_ec,
    avg_drain_ph,
    avg_drain_ec,
    avg_drip_ml,
    avg_drain_ml,
    total_drip_ml,
    total_drain_ml,
    drain_percent,
    avg_night_drop,
    avg_solar_rad,
    overallStatus,
    evaluations,
    warningCount,
    criticalCount,
  };
}

export const MonitoringPanel: React.FC<MonitoringPanelProps> = ({ 
  records, 
  kriteriyalar = [] 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'barlaglar_netije' | 'kriteriyalar' | 'grafikler'>('barlaglar_netije');
  const [criteriaViewMode, setCriteriaViewMode] = useState<'parnik_sektor' | 'daily_parnik_sektor' | 'individual_records'>('parnik_sektor');
  const [period, setPeriod] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterParnik, setFilterParnik] = useState<string>('');
  const [filterSektor, setFilterSektor] = useState<string>('');

  // Specific criteria sub-tab filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [paramFilter, setParamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSummary, setSelectedSummary] = useState<ParnikSektorCriteriaSummary | null>(null);

  // Time-filtered records across all parniks and sectors
  const timeFiltered = useMemo(() => {
    return records.filter((r) => {
      if (filterDate && r.sane !== filterDate) return false;

      if (period === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        return r.sane === today;
      } else if (period === 'weekly') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        return r.sane >= sevenDaysAgo;
      }
      return true;
    });
  }, [records, filterDate, period]);

  // Memoized filtered records (includes parnik and sektor filters for individual view)
  const filtered = useMemo(() => {
    return timeFiltered.filter((r) => {
      if (filterParnik && Number(r.parnik) !== Number(filterParnik)) return false;
      if (filterSektor && Number(r.sektor) !== Number(filterSektor)) return false;
      return true;
    });
  }, [timeFiltered, filterParnik, filterSektor]);

  // Calculate year and week helper
  const getRecordWeek = (saneStr: string) => {
    try {
      const d = new Date(saneStr);
      if (isNaN(d.getTime())) return { year: new Date().getFullYear(), week: 1 };
      const year = d.getFullYear();
      const firstDay = new Date(year, 0, 1);
      const pastDays = (d.getTime() - firstDay.getTime()) / 86400000;
      const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
      return { year, week };
    } catch {
      return { year: new Date().getFullYear(), week: 1 };
    }
  };

  // Detect criteria breaches / anomalies across records
  const detectedEvents = useMemo(() => {
    const events: DetectedCriterionEvent[] = [];

    filtered.forEach((r) => {
      const { year, week } = getRecordWeek(r.sane);
      const crit = kriteriyalar.find((k) => k.yil === year && k.hepde === week);

      // Thresholds: use weekly specific criteria or agronomic baselines
      const dripPhMin = crit?.besin_ph_min ?? 5.5;
      const dripPhMax = crit?.besin_ph_max ?? 6.2;
      const dripEcMin = crit?.besin_ec_min ?? 2.8;
      const dripEcMax = crit?.besin_ec_max ?? 3.2;

      const drainPhMin = crit?.drenaj_ph_min ?? 5.8;
      const drainPhMax = crit?.drenaj_ph_max ?? 6.5;
      const drainEcMin = crit?.drenaj_ec_min ?? 4.5;
      const drainEcMax = crit?.drenaj_ec_max ?? 5.5;

      const drainPercentMin = 20;
      const drainPercentMax = 35;

      // 1. Drip pH check
      if (r.drip_ph !== null && r.drip_ph !== undefined) {
        if (r.drip_ph < dripPhMin) {
          const dev = Number((dripPhMin - r.drip_ph).toFixed(2));
          events.push({
            id: `drip_ph_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Iýmit Drip pH',
            paramCode: 'drip_ph',
            value: r.drip_ph,
            unit: 'pH',
            min: dripPhMin,
            max: dripPhMax,
            severity: dev > 0.4 ? 'critical' : 'warning',
            direction: 'low',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Drip pH aşa pes (kislotaly). Dozator kislota paýlaýjysyny derrew barlap sazlaň, ösümligiň kökleri zaýalanmagy mümkin.',
          });
        } else if (r.drip_ph > dripPhMax) {
          const dev = Number((r.drip_ph - dripPhMax).toFixed(2));
          events.push({
            id: `drip_ph_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Iýmit Drip pH',
            paramCode: 'drip_ph',
            value: r.drip_ph,
            unit: 'pH',
            min: dripPhMin,
            max: dripPhMax,
            severity: dev > 0.4 ? 'critical' : 'warning',
            direction: 'high',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Drip pH kadadan ýokary (aşgar). Iýmit ergindäki nitrat kislotany köpeldiň, mikroelementleriň (demir, sink) siňmegini goraň.',
          });
        }
      }

      // 2. Drip EC check
      if (r.drip_ec !== null && r.drip_ec !== undefined) {
        if (r.drip_ec < dripEcMin) {
          const dev = Number((dripEcMin - r.drip_ec).toFixed(2));
          events.push({
            id: `drip_ec_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Iýmit Drip EC',
            paramCode: 'drip_ec',
            value: r.drip_ec,
            unit: 'mS/cm',
            min: dripEcMin,
            max: dripEcMax,
            severity: dev > 0.5 ? 'critical' : 'warning',
            direction: 'low',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Iýmit konsentrasiýasy gowşak. Ene erginiň (A/B baklary) sorujylaryny we dökün garyndysyny barlaň.',
          });
        } else if (r.drip_ec > dripEcMax) {
          const dev = Number((r.drip_ec - dripEcMax).toFixed(2));
          events.push({
            id: `drip_ec_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Iýmit Drip EC',
            paramCode: 'drip_ec',
            value: r.drip_ec,
            unit: 'mS/cm',
            min: dripEcMin,
            max: dripEcMax,
            severity: dev > 0.4 ? 'critical' : 'warning',
            direction: 'high',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Drip EC aşa güýçli (duz konsentrasiýasy ýokary). Dökün dozasyny peseldiň, arassa suw mukdaryny artyp kök stresini aýyryň.',
          });
        }
      }

      // 3. Drain pH check
      if (r.drain_ph !== null && r.drain_ph !== undefined) {
        if (r.drain_ph < drainPhMin) {
          const dev = Number((drainPhMin - r.drain_ph).toFixed(2));
          events.push({
            id: `drain_ph_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Drenaž pH',
            paramCode: 'drain_ph',
            value: r.drain_ph,
            unit: 'pH',
            min: drainPhMin,
            max: drainPhMax,
            severity: dev > 0.5 ? 'critical' : 'warning',
            direction: 'low',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Matadaky drenaž turşy bolup barýar. Kök zonasynda anaerob ýagdaýlaryň ýa-da suw köplüginiň öňüni alyň.',
          });
        } else if (r.drain_ph > drainPhMax) {
          const dev = Number((r.drain_ph - drainPhMax).toFixed(2));
          events.push({
            id: `drain_ph_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Drenaž pH',
            paramCode: 'drain_ph',
            value: r.drain_ph,
            unit: 'pH',
            min: drainPhMin,
            max: drainPhMax,
            severity: dev > 0.5 ? 'critical' : 'warning',
            direction: 'high',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Drenaž pH aşa ýokary. Drip pH-y wagtlaýyn 5.6-5.7 aralygynda saklap matadaky aşgarlygy aşaklaň.',
          });
        }
      }

      // 4. Drain EC check
      if (r.drain_ec !== null && r.drain_ec !== undefined) {
        if (r.drain_ec < drainEcMin) {
          const dev = Number((drainEcMin - r.drain_ec).toFixed(2));
          events.push({
            id: `drain_ec_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Drenaž EC',
            paramCode: 'drain_ec',
            value: r.drain_ec,
            unit: 'mS/cm',
            min: drainEcMin,
            max: drainEcMax,
            severity: 'warning',
            direction: 'low',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Drenaž duzlulygy pes. Ösümlik iýmiti çalt ulanýar ýa-da suwaryş mukdary aşa köp bolup iýmiti ýuwup çykarýar.',
          });
        } else if (r.drain_ec > drainEcMax) {
          const dev = Number((r.drain_ec - drainEcMax).toFixed(2));
          events.push({
            id: `drain_ec_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Drenaž EC',
            paramCode: 'drain_ec',
            value: r.drain_ec,
            unit: 'mS/cm',
            min: drainEcMin,
            max: drainEcMax,
            severity: dev > 0.8 ? 'critical' : 'warning',
            direction: 'high',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Matada duzlulyk ýygnandy (Salinization). Drenaž göterimini artyp, arassa suw / pes EC-li ergin bilen ýuwujy suwaryş geçiriň.',
          });
        }
      }

      // 5. Drain Percentage check
      if (r.drain_percent !== null && r.drain_percent !== undefined) {
        if (r.drain_percent < drainPercentMin) {
          const dev = Number((drainPercentMin - r.drain_percent).toFixed(1));
          events.push({
            id: `drain_pct_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Drenaž Göterimi',
            paramCode: 'drain_percent',
            value: r.drain_percent,
            unit: '%',
            min: drainPercentMin,
            max: drainPercentMax,
            severity: dev > 8 ? 'critical' : 'warning',
            direction: 'low',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Drenaž mukdary az (öndürijilik pes). Suwaryş dozasyny köpeldiň ýa-da aralyk wagtyny gysgaldyň.',
          });
        } else if (r.drain_percent > drainPercentMax) {
          const dev = Number((r.drain_percent - drainPercentMax).toFixed(1));
          events.push({
            id: `drain_pct_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Drenaž Göterimi',
            paramCode: 'drain_percent',
            value: r.drain_percent,
            unit: '%',
            min: drainPercentMin,
            max: drainPercentMax,
            severity: dev > 15 ? 'critical' : 'warning',
            direction: 'high',
            deviation: dev,
            criteriaWeek: week,
            recommendation: 'Drenaž aşa köp. Suw we dökün ýitgisi köpelýär, suwaryş dozasyny azaldyp matanyň gury galmagyna ýol bermäň.',
          });
        }
      }

      // 6. Drenaž ml: 1, 2, 4, 6-njy Parnikler (Hoşa Pomidor)
      if ([1, 2, 4, 6].includes(Number(r.parnik)) && r.drain_ml !== null && r.drain_ml !== undefined) {
        const hosaMin = crit?.drenaj_ml_hosa_min ?? 300;
        const hosaMax = crit?.drenaj_ml_hosa_max ?? 450;
        if (r.drain_ml < hosaMin) {
          const dev = Number((hosaMin - r.drain_ml).toFixed(0));
          events.push({
            id: `dr_ml_hosa_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: `Hoşa Pomidor Drenaž ml (P-${r.parnik})`,
            paramCode: 'drain_ml_hosa',
            value: r.drain_ml,
            unit: 'ml',
            min: hosaMin,
            max: hosaMax,
            severity: dev > 70 ? 'critical' : 'warning',
            direction: 'low',
            deviation: dev,
            criteriaWeek: week,
            recommendation: `1-2-4 parnikleriň (Hoşa pomidor) drenažy ${r.drain_ml} ml bolup, ${hosaMin} ml-den pes. Ösümlik suwsyz galmaz ýaly suwaryş mukdaryny artdyryň.`,
          });
        } else if (r.drain_ml > hosaMax) {
          const dev = Number((r.drain_ml - hosaMax).toFixed(0));
          events.push({
            id: `dr_ml_hosa_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: `Hoşa Pomidor Drenaž ml (P-${r.parnik})`,
            paramCode: 'drain_ml_hosa',
            value: r.drain_ml,
            unit: 'ml',
            min: hosaMin,
            max: hosaMax,
            severity: dev > 80 ? 'critical' : 'warning',
            direction: 'high',
            deviation: dev,
            criteriaWeek: week,
            recommendation: `1-2-4 parnikleriň (Hoşa pomidor) drenažy ${r.drain_ml} ml bolup, ${hosaMax} ml-den aşa ýokary. Suwaryş dozasyny peseldiň.`,
          });
        }
      }

      // 7. Drenaž ml: 3 we 5-nji Parnikler (Gülgüne Pomidor)
      if ([3, 5].includes(Number(r.parnik)) && r.drain_ml !== null && r.drain_ml !== undefined) {
        const gulguneMin = crit?.drenaj_ml_gulgune_min ?? 320;
        const gulguneMax = crit?.drenaj_ml_gulgune_max ?? 500;
        if (r.drain_ml < gulguneMin) {
          const dev = Number((gulguneMin - r.drain_ml).toFixed(0));
          events.push({
            id: `dr_ml_gulgune_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: `Gülgüne Pomidor Drenaž ml (P-${r.parnik})`,
            paramCode: 'drain_ml_gulgune',
            value: r.drain_ml,
            unit: 'ml',
            min: gulguneMin,
            max: gulguneMax,
            severity: dev > 70 ? 'critical' : 'warning',
            direction: 'low',
            deviation: dev,
            criteriaWeek: week,
            recommendation: `3-5 parnikleriň (Gülgüne pomidor) drenažy ${r.drain_ml} ml bolup, ${gulguneMin} ml-den pes. Gülgüne pomidor üçin suwaryş wagtyny we mukdaryny sazlaň.`,
          });
        } else if (r.drain_ml > gulguneMax) {
          const dev = Number((r.drain_ml - gulguneMax).toFixed(0));
          events.push({
            id: `dr_ml_gulgune_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: `Gülgüne Pomidor Drenaž ml (P-${r.parnik})`,
            paramCode: 'drain_ml_gulgune',
            value: r.drain_ml,
            unit: 'ml',
            min: gulguneMin,
            max: gulguneMax,
            severity: dev > 80 ? 'critical' : 'warning',
            direction: 'high',
            deviation: dev,
            criteriaWeek: week,
            recommendation: `3-5 parnikleriň (Gülgüne pomidor) drenažy ${r.drain_ml} ml bolup, ${gulguneMax} ml-den köp. Suwaryş normasyny azaldyň.`,
          });
        }
      }

      // 8. Gijeki Ýeňleme (Night drop %)
      if (r.night_drop !== null && r.night_drop !== undefined) {
        const nightMin = crit?.gijeki_yenleme_min ?? 3;
        const nightMax = crit?.gijeki_yenleme_max ?? 8;
        if (r.night_drop < nightMin) {
          const dev = Number((nightMin - r.night_drop).toFixed(1));
          events.push({
            id: `night_drop_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Gijeki Ýeňleme (Night Drop)',
            paramCode: 'night_drop',
            value: r.night_drop,
            unit: '%',
            min: nightMin,
            max: nightMax,
            severity: dev > 1.5 ? 'critical' : 'warning',
            direction: 'low',
            deviation: dev,
            criteriaWeek: week,
            recommendation: `Gijeki agram ýeňlemesi ${r.night_drop}% (kadadan pes). Ösümligiň gijeki dem alşy pes, parnik howalandyryşyny we temperaturasyny barlaň.`,
          });
        } else if (r.night_drop > nightMax) {
          const dev = Number((r.night_drop - nightMax).toFixed(1));
          events.push({
            id: `night_drop_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Gijeki Ýeňleme (Night Drop)',
            paramCode: 'night_drop',
            value: r.night_drop,
            unit: '%',
            min: nightMin,
            max: nightMax,
            severity: dev > 2.0 ? 'critical' : 'warning',
            direction: 'high',
            deviation: dev,
            criteriaWeek: week,
            recommendation: `Gijeki agram ýeňlemesi ${r.night_drop}% (kadadan ýokary). Ösümlik gije köp çyg ýitirýär, gijeki ýyladyş we çyglylyk derejesini barlaň.`,
          });
        }
      }

      // 9. Gün Radiasiýasy (J/cm²)
      if (r.solar_rad !== null && r.solar_rad !== undefined) {
        const radMin = crit?.radiasiya_min ?? 1200;
        const radMax = crit?.radiasiya_max ?? 2400;
        if (r.solar_rad < radMin) {
          const dev = Number((radMin - r.solar_rad).toFixed(0));
          events.push({
            id: `solar_rad_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Gün Radiasiýasy',
            paramCode: 'solar_rad',
            value: r.solar_rad,
            unit: 'J/cm²',
            min: radMin,
            max: radMax,
            severity: 'warning',
            direction: 'low',
            deviation: dev,
            criteriaWeek: week,
            recommendation: `Radiasiýa pes (${r.solar_rad} J/cm²). Fotosintez pes bolandygy sebäpli suwaryş sanyny we dozasyny azaldyň.`,
          });
        } else if (r.solar_rad > radMax) {
          const dev = Number((r.solar_rad - radMax).toFixed(0));
          events.push({
            id: `solar_rad_${r.id}`,
            recordId: r.id,
            sane: r.sane,
            wagt: r.wagt,
            parnik: r.parnik,
            sektor: r.sektor,
            paramName: 'Gün Radiasiýasy',
            paramCode: 'solar_rad',
            value: r.solar_rad,
            unit: 'J/cm²',
            min: radMin,
            max: radMax,
            severity: dev > 400 ? 'critical' : 'warning',
            direction: 'high',
            deviation: dev,
            criteriaWeek: week,
            recommendation: `Radiasiýa aşa ýokary (${r.solar_rad} J/cm²). Ösümlikleriň gury galmazlygy üçin kölegelendiriş ulanyň we suwaryşy köpeldiň.`,
          });
        }
      }
    });

    return events;
  }, [filtered, kriteriyalar]);

  // Filtered criteria events
  const filteredEvents = useMemo(() => {
    return detectedEvents.filter((ev) => {
      if (severityFilter !== 'all' && ev.severity !== severityFilter) return false;
      if (paramFilter !== 'all' && ev.paramCode !== paramFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          ev.sane.includes(q) ||
          ev.paramName.toLowerCase().includes(q) ||
          `parnik ${ev.parnik}`.includes(q) ||
          `p${ev.parnik}`.includes(q) ||
          `sektor ${ev.sektor}`.includes(q) ||
          `s${ev.sektor}`.includes(q) ||
          ev.recommendation.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [detectedEvents, severityFilter, paramFilter, searchQuery]);

  // Stats for the Criteria View
  const criteriaStats = useMemo(() => {
    const total = detectedEvents.length;
    const critical = detectedEvents.filter((e) => e.severity === 'critical').length;
    const warning = detectedEvents.filter((e) => e.severity === 'warning').length;
    const dripIssues = detectedEvents.filter(
      (e) => e.paramCode === 'drip_ph' || e.paramCode === 'drip_ec'
    ).length;
    const drainIssues = detectedEvents.filter(
      (e) => e.paramCode === 'drain_ph' || e.paramCode === 'drain_ec' || e.paramCode === 'drain_percent'
    ).length;
    const varietyDrainIssues = detectedEvents.filter(
      (e) => e.paramCode === 'drain_ml_hosa' || e.paramCode === 'drain_ml_gulgune'
    ).length;
    const envIssues = detectedEvents.filter(
      (e) => e.paramCode === 'night_drop' || e.paramCode === 'solar_rad'
    ).length;

    return { total, critical, warning, dripIssues, drainIssues, varietyDrainIssues, envIssues };
  }, [detectedEvents]);

  // General KPI stats
  const stats = useMemo(() => {
    const totalDrip = filtered.reduce((acc, r) => acc + (r.drip_ml || 0), 0);
    const totalDrain = filtered.reduce((acc, r) => acc + (r.drain_ml || 0), 0);
    const avgDrainPercent =
      totalDrip > 0 ? Number(((totalDrain / totalDrip) * 100).toFixed(1)) : 0;

    const ecRecords = filtered.filter((r) => r.drip_ec !== null);
    const avgDripEc =
      ecRecords.length > 0
        ? Number(
            (ecRecords.reduce((acc, r) => acc + (r.drip_ec || 0), 0) / ecRecords.length).toFixed(2)
          )
        : 0;

    const drEcRecords = filtered.filter((r) => r.drain_ec !== null);
    const avgDrainEc =
      drEcRecords.length > 0
        ? Number(
            (drEcRecords.reduce((acc, r) => acc + (r.drain_ec || 0), 0) / drEcRecords.length).toFixed(2)
          )
        : 0;

    const phRecords = filtered.filter((r) => r.drip_ph !== null);
    const avgDripPh =
      phRecords.length > 0
        ? Number(
            (phRecords.reduce((acc, r) => acc + (r.drip_ph || 0), 0) / phRecords.length).toFixed(2)
          )
        : 0;

    const drPhRecords = filtered.filter((r) => r.drain_ph !== null);
    const avgDrainPh =
      drPhRecords.length > 0
        ? Number(
            (drPhRecords.reduce((acc, r) => acc + (r.drain_ph || 0), 0) / drPhRecords.length).toFixed(2)
          )
        : 0;

    return {
      totalDrip,
      totalDrain,
      avgDrainPercent,
      avgDripEc,
      avgDrainEc,
      avgDripPh,
      avgDrainPh,
    };
  }, [filtered]);

  // Memoized Chart data
  const chartData = useMemo(() => {
    return [...filtered]
      .reverse()
      .map((r) => ({
        label: `${r.sane.slice(5)} P${r.parnik}-S${r.sektor}`,
        sane: r.sane,
        wagt: r.wagt,
        drip_ml: r.drip_ml || 0,
        drain_ml: r.drain_ml || 0,
        drain_percent: r.drain_percent || 0,
        drip_ec: r.drip_ec !== null ? r.drip_ec : undefined,
        drain_ec: r.drain_ec !== null ? r.drain_ec : undefined,
        drip_ph: r.drip_ph !== null ? r.drip_ph : undefined,
        drain_ph: r.drain_ph !== null ? r.drain_ph : undefined,
        avg_temp: r.avg_temp !== null ? r.avg_temp : undefined,
        solar_rad: r.solar_rad !== null ? r.solar_rad : undefined,
      }));
  }, [filtered]);

  // Export criteria events to CSV
  const handleExportEventsCSV = () => {
    if (detectedEvents.length === 0) return;
    const headers = [
      'Sene', 'Wagt', 'Parnik', 'Sektor', 'Kriteriya', 
      'Hakyky_Baha', 'Kadaly_Min', 'Kadaly_Max', 'Gyşarma', 'Dereje', 'Agronom_Maslahaty'
    ];
    const rows = detectedEvents.map((ev) => [
      ev.sane,
      ev.wagt,
      ev.parnik,
      ev.sektor,
      ev.paramName,
      `${ev.value} ${ev.unit}`,
      ev.min,
      ev.max,
      `${ev.direction === 'high' ? '+' : '-'}${ev.deviation} ${ev.unit}`,
      ev.severity === 'critical' ? 'Kritiki' : 'Duýduryş',
      `"${ev.recommendation.replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `yuze_cykan_kriteriyalar_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Memoized Parnik & Sektor summarized criteria evaluations across all greenhouses and sectors
  const parnikSektorSummaries = useMemo<ParnikSektorCriteriaSummary[]>(() => {
    const result: ParnikSektorCriteriaSummary[] = [];
    // Collect all distinct sectors available across data (standard 1 to 5, plus any recorded sector)
    const allSectors = Array.from(
      new Set([1, 2, 3, 4, 5, ...timeFiltered.map((r) => Number(r.sektor)).filter((s) => !isNaN(s) && s > 0)])
    ).sort((a, b) => a - b);

    // Parnik 1 to 6 with specific sector counts (P3: 6 sectors, others: 4)
    for (const p of PARNIK_LIST) {
      const pSectors = getParnikSectors(p);
      for (const s of pSectors) {
        const recs = timeFiltered.filter((r) => Number(r.parnik) === p && Number(r.sektor) === s);
        if (recs.length === 0) continue;

        const latestRec = recs[0];
        const { year, week } = getRecordWeek(latestRec.sane);
        const crit = kriteriyalar.find((k) => k.yil === year && k.hepde === week) || kriteriyalar[0];

        result.push(evaluateParnikSektor(p, s, recs, crit));
      }
    }
    return result;
  }, [timeFiltered, kriteriyalar]);

  // Daily Parnik & Sektor evaluations
  const dailyParnikSektorSummaries = useMemo<ParnikSektorCriteriaSummary[]>(() => {
    const groups = new Map<string, HasabatRecord[]>();
    timeFiltered.forEach((r) => {
      const key = `${r.sane}_P${r.parnik}_S${r.sektor}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });

    const result: ParnikSektorCriteriaSummary[] = [];
    groups.forEach((recs) => {
      const first = recs[0];
      const { year, week } = getRecordWeek(first.sane);
      const crit = kriteriyalar.find((k) => k.yil === year && k.hepde === week) || kriteriyalar[0];
      result.push(evaluateParnikSektor(Number(first.parnik), Number(first.sektor), recs, crit, first.sane));
    });

    return result.sort((a, b) => 
      (b.sane || '').localeCompare(a.sane || '') || a.parnik - b.parnik || a.sektor - b.sektor
    );
  }, [timeFiltered, kriteriyalar]);

  // Stats for Parnik & Sektor evaluation view
  const parnikSektorStats = useMemo(() => {
    const totalSectors = parnikSektorSummaries.length;
    const normalSectors = parnikSektorSummaries.filter((s) => s.overallStatus === 'normal').length;
    const warningSectors = parnikSektorSummaries.filter((s) => s.overallStatus === 'warning').length;
    const criticalSectors = parnikSektorSummaries.filter((s) => s.overallStatus === 'critical').length;

    const hosaItems = parnikSektorSummaries.filter((s) => s.variety === 'Hoşa' && s.avg_drain_ml !== null);
    const hosaDrainAvg = hosaItems.length > 0
      ? Number((hosaItems.reduce((acc, s) => acc + (s.avg_drain_ml || 0), 0) / hosaItems.length).toFixed(0))
      : 0;

    const gulguneItems = parnikSektorSummaries.filter((s) => s.variety === 'Gülgüne' && s.avg_drain_ml !== null);
    const gulguneDrainAvg = gulguneItems.length > 0
      ? Number((gulguneItems.reduce((acc, s) => acc + (s.avg_drain_ml || 0), 0) / gulguneItems.length).toFixed(0))
      : 0;

    return {
      totalSectors,
      normalSectors,
      warningSectors,
      criticalSectors,
      hosaDrainAvg,
      gulguneDrainAvg,
    };
  }, [parnikSektorSummaries]);

  // Filtered list for Parnik & Sektor table
  const filteredParnikSektorList = useMemo(() => {
    const source = criteriaViewMode === 'daily_parnik_sektor' ? dailyParnikSektorSummaries : parnikSektorSummaries;
    return source.filter((item) => {
      if (statusFilter !== 'all' && item.overallStatus !== statusFilter) return false;
      if (filterParnik && item.parnik !== Number(filterParnik)) return false;
      if (filterSektor && item.sektor !== Number(filterSektor)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `parnik ${item.parnik} p${item.parnik} sektor ${item.sektor} s${item.sektor} ${item.variety.toLowerCase()} ${item.sane || ''}`;
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [criteriaViewMode, dailyParnikSektorSummaries, parnikSektorSummaries, statusFilter, filterParnik, filterSektor, searchQuery]);

  // Export Parnik & Sektor report to CSV
  const handleExportParnikSektorCSV = () => {
    const listToExport = criteriaViewMode === 'daily_parnik_sektor' ? dailyParnikSektorSummaries : parnikSektorSummaries;
    if (listToExport.length === 0) return;
    const isDaily = criteriaViewMode === 'daily_parnik_sektor';
    const headers = [
      ...(isDaily ? ['Sene'] : []),
      'Parnik',
      'Pomidor_Gornusi',
      'Sektor',
      'Hasabat_Sany',
      'Drip_pH',
      'Drip_EC',
      'Drain_pH',
      'Drain_EC',
      'Drain_ml',
      'Drain_Goterim_%',
      'Gijeki_Yenleme_%',
      'Umumy_Yagdayy',
      'Kritiki_Sany',
      'Duydurys_Sany'
    ];
    const rows = listToExport.map((s) => [
      ...(isDaily ? [s.sane || ''] : []),
      `Parnik ${s.parnik}`,
      s.variety,
      `Sektor ${s.sektor}`,
      s.recordCount,
      s.avg_drip_ph ?? '-',
      s.avg_drip_ec ?? '-',
      s.avg_drain_ph ?? '-',
      s.avg_drain_ec ?? '-',
      s.avg_drain_ml ?? '-',
      s.drain_percent !== null ? `${s.drain_percent}%` : '-',
      s.avg_night_drop !== null ? `${s.avg_night_drop}%` : '-',
      s.overallStatus === 'critical' ? 'Kritiki' : s.overallStatus === 'warning' ? 'Duýduryş' : 'Kadaly',
      s.criticalCount,
      s.warningCount
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `parnik_sektor_kriteriyalar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header with Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-700" />
              Monitoring Paneli: Görkezijiler we Kriteriýa Gözegçiligi
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Gündelik suwaryş, drenaž, EC/pH balansy we hepdäniň bellenen kriteriýalaryndan çykan gyşarmalar.
            </p>
          </div>

          {/* Sub-Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto gap-1">
            <button
              onClick={() => setActiveSubTab('barlaglar_netije')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'barlaglar_netije'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplets className="w-4 h-4" />
              <span>Günüň 3 Barlagy & Sektorlar</span>
            </button>

            <button
              onClick={() => setActiveSubTab('kriteriyalar')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'kriteriyalar'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Ýüze Çykan Kriteriýalar</span>
              {detectedEvents.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeSubTab === 'kriteriyalar' ? 'bg-amber-800 text-amber-100' : 'bg-rose-600 text-white'
                }`}>
                  {detectedEvents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('grafikler')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'grafikler'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LineChart className="w-4 h-4" />
              <span>Grafikler & Dinamika</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-600 font-semibold">
          <Filter className="w-4 h-4 text-slate-500" />
          <span>Wagt Süzgüji:</span>
        </div>

        <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
          {[
            { id: 'all', label: 'Ähli' },
            { id: 'daily', label: 'Şu gün' },
            { id: 'weekly', label: 'Soňky 7 gün' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setPeriod(item.id);
                setFilterDate('');
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                period === item.id && !filterDate
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1.5">
          <label className="text-slate-500">Sene:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setPeriod('custom');
            }}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5">
          <label className="text-slate-500">Parnik:</label>
          <select
            value={filterParnik}
            onChange={(e) => setFilterParnik(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="">Ähli Parnik</option>
            {[1, 2, 3, 4, 5, 6].map((p) => (
              <option key={p} value={p}>{p}-nji Parnik</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <label className="text-slate-500">Sektor:</label>
          <select
            value={filterSektor}
            onChange={(e) => setFilterSektor(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="">Ähli Sektor</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>{s}-nji Sektor</option>
            ))}
          </select>
        </div>

        {(filterDate || filterParnik || filterSektor || period !== 'all') && (
          <button
            onClick={() => {
              setFilterDate('');
              setFilterParnik('');
              setFilterSektor('');
              setPeriod('all');
            }}
            className="ml-auto text-rose-600 hover:text-rose-700 underline text-xs font-bold"
          >
            Süzgüçleri Arassala
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* VIEW 0: GÜNÜŇ 3 BARLAGY & SEKTORLAR (DOLY NETIJE)              */}
      {/* ============================================================== */}
      {activeSubTab === 'barlaglar_netije' && (
        <Daily3BarlagReport records={records} kriteriyalar={kriteriyalar} />
      )}

      {/* ============================================================== */}
      {/* VIEW 1: ÝÜZE ÇYKAN KRITERIÝALAR WE KADADAN ÇYKMALAR PANELI      */}
      {/* ============================================================== */}
      {activeSubTab === 'kriteriyalar' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Sub-View Switcher Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>Parnikler we Sektorlar boýunça Kriteriýa Hasaplamasy</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                    Täze Hasaplama
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Her bir parnikiň we sektoryň ýygnalan görkezijilerini sortyna görä (Hoşa / Gülgüne) we hepdelik kadalaryna laýyklykda seljerýär.
                </p>
              </div>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold self-start md:self-auto">
              <button
                onClick={() => setCriteriaViewMode('parnik_sektor')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  criteriaViewMode === 'parnik_sektor'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Parnik & Sektor (Jemleýji)</span>
              </button>
              <button
                onClick={() => setCriteriaViewMode('daily_parnik_sektor')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  criteriaViewMode === 'daily_parnik_sektor'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Gündelik Sektor</span>
              </button>
              <button
                onClick={() => setCriteriaViewMode('individual_records')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  criteriaViewMode === 'individual_records'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Aýratyn Ýazgylar</span>
              </button>
            </div>
          </div>

          {/* Metric Cards: Parnik & Sektor Mode */}
          {criteriaViewMode !== 'individual_records' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Total Sectors Checked */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Hasaplanan Sektorlar
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {parnikSektorStats.totalSectors} <span className="text-xs font-normal text-slate-500">sektor</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {filtered.length} jemi barlag ýazgysy
                  </div>
                </div>
                <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              {/* Normal Sectors */}
              <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    🟢 Kadaly Sektorlar
                  </span>
                  <div className="text-xl font-black text-emerald-600 mt-0.5">
                    {parnikSektorStats.normalSectors} <span className="text-xs font-normal text-slate-500">sektor</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                    Kriteriýalara doly gabat
                  </div>
                </div>
                <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              {/* Warning Sectors */}
              <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    🟡 Duýduryşly Sektorlar
                  </span>
                  <div className="text-xl font-black text-amber-600 mt-0.5">
                    {parnikSektorStats.warningSectors} <span className="text-xs font-normal text-slate-500">sektor</span>
                  </div>
                  <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                    Üns berilmeli gyşarmalar
                  </div>
                </div>
                <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              {/* Critical Sectors */}
              <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                    🔴 Kritiki Sektorlar
                  </span>
                  <div className="text-xl font-black text-rose-600 mt-0.5">
                    {parnikSektorStats.criticalSectors} <span className="text-xs font-normal text-slate-500">sektor</span>
                  </div>
                  <div className="text-[10px] text-rose-700 font-medium mt-0.5">
                    Gyssagly çäre talap edýär
                  </div>
                </div>
                <div className="w-9 h-9 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </div>
              </div>

              {/* Tomato Varieties Drain Comparison */}
              <div className="bg-white border border-indigo-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                    Drenaž: Sortlar Boýunça
                  </span>
                  <div className="text-xs font-bold text-slate-800 mt-1 flex flex-col gap-0.5">
                    <span>🍅 Hoşa (P1,2,4): <b className="font-mono text-emerald-700">{parnikSektorStats.hosaDrainAvg} ml</b></span>
                    <span>🌸 Gülgüne (P3,5): <b className="font-mono text-purple-700">{parnikSektorStats.gulguneDrainAvg} ml</b></span>
                  </div>
                </div>
                <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5" />
                </div>
              </div>
            </div>
          ) : (
            /* Metric Cards: Individual Breaches Mode */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Total Detected */}
              <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    Jemi Ýüze Çykan
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {criteriaStats.total} <span className="text-xs font-normal text-slate-500">sany</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {filtered.length} hasabat barlanyldy
                  </div>
                </div>
                <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              {/* Critical Breaches */}
              <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                    Kritiki Kadadan Çykma
                  </span>
                  <div className="text-xl font-black text-rose-600 mt-0.5">
                    {criteriaStats.critical} <span className="text-xs font-normal text-slate-500">duýduryş</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Gyssagly çäre talap edilýär
                  </div>
                </div>
                <div className="w-9 h-9 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </div>
              </div>

              {/* Drip / Feeding Issues */}
              <div className="bg-white border border-blue-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                    Drip Iýmit (pH/EC)
                  </span>
                  <div className="text-xl font-black text-blue-600 mt-0.5">
                    {criteriaStats.dripIssues} <span className="text-xs font-normal text-slate-500">gyşarma</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Ergin doňaklygy & pH
                  </div>
                </div>
                <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <FlaskConical className="w-5 h-5" />
                </div>
              </div>

              {/* Variety Drain Volume Issues (Hoşa / Gülgüne) */}
              <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Pomidor Drenaž ml
                  </span>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">
                    {criteriaStats.varietyDrainIssues} <span className="text-xs font-normal text-slate-500">gyşarma</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Hoşa (P1,2,4) / Gülgüne (P3,5)
                  </div>
                </div>
                <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5" />
                </div>
              </div>

              {/* Night Drop & Radiation Issues */}
              <div className="bg-white border border-indigo-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                    Gijeki / Radiasiýa
                  </span>
                  <div className="text-xl font-black text-indigo-600 mt-0.5">
                    {criteriaStats.envIssues} <span className="text-xs font-normal text-slate-500">gyşarma</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Gijeki ýeňleme & Gün J/cm²
                  </div>
                </div>
                <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                  <Moon className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Interactive Greenhouse Matrix (Shown in primary Parnik & Sektor view) */}
          {criteriaViewMode === 'parnik_sektor' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Parnikler boýunça Gözegçilik Matrisasy (1 — 6)</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Her parnik üçin aýratyn sort (Hoşa / Gülgüne) we sektor ýagdaýlary (P-3: 6 sektor, beýlekiler: 4 sektor)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {PARNIK_LIST.map((pNum) => {
                  const cfg = getParnikConfig(pNum);
                  const isHosa = cfg.variety === 'Hoşa';
                  const variety = cfg.varietyLabel;
                  const pSectors = cfg.sectors;

                  return (
                    <div 
                      key={pNum} 
                      className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between"
                    >
                      {/* Parnik Card Header */}
                      <div className="border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                        <div>
                          <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">
                              {pNum}
                            </span>
                            <span>Parnik {pNum}</span>
                          </div>
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                            isHosa ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {variety}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {isHosa ? 'Kada: 300-450 ml' : 'Kada: 320-500 ml'}
                        </span>
                      </div>

                      {/* All sectors inside this greenhouse (Sektor 1..5) */}
                      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
                        {pSectors.map((sNum) => {
                          const data = parnikSektorSummaries.find((s) => s.parnik === pNum && s.sektor === sNum);
                          return (
                            <div
                              key={sNum}
                              onClick={() => data && setSelectedSummary(data)}
                              className={`p-1.5 rounded-lg border transition ${
                                data
                                  ? data.overallStatus === 'critical'
                                    ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70 cursor-pointer'
                                    : data.overallStatus === 'warning'
                                    ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70 cursor-pointer'
                                    : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/50 cursor-pointer'
                                  : 'bg-slate-50 border-dashed border-slate-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className="font-bold text-slate-800">Sektor {sNum}</span>
                                {data ? (
                                  <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase ${
                                    data.overallStatus === 'critical'
                                      ? 'bg-rose-600 text-white'
                                      : data.overallStatus === 'warning'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-emerald-600 text-white'
                                  }`}>
                                    {data.overallStatus === 'critical' ? 'Kritiki' : data.overallStatus === 'warning' ? 'Duýduryş' : 'Kadaly'}
                                  </span>
                                ) : (
                                  <span className="text-[9.5px] text-slate-400">Ýazgy ýok</span>
                                )}
                              </div>

                              {data ? (
                                <div className="grid grid-cols-2 gap-0.5 text-[9.5px] text-slate-600 font-mono leading-tight">
                                  <div>Drip: <b>{data.avg_drip_ec ?? '-'} mS</b></div>
                                  <div>Dren: <b>{data.avg_drain_ec ?? '-'} mS</b></div>
                                  <div>Mukdar: <b className="text-emerald-700">{data.avg_drain_ml ?? '-'} ml</b></div>
                                  <div>Gatn: <b>{data.drain_percent ?? '-'}%</b></div>
                                </div>
                              ) : (
                                <div className="text-[9.5px] text-slate-400 italic">Barlag geçirilmedi</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {criteriaViewMode !== 'individual_records' ? (
                <>
                  {/* Status Filter for Parnik & Sektor */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold">Ýagdaýy:</span>
                    <select
                      value={statusFilter}
                      onChange={(e: any) => setStatusFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                    >
                      <option value="all">Ähli Ýagdaýlar</option>
                      <option value="critical">🔴 Diňe Kritiki</option>
                      <option value="warning">🟡 Duýduryşly</option>
                      <option value="normal">🟢 Hemmesi Kadaly</option>
                    </select>
                  </div>

                  {/* Parnik Filter */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold">Parnik:</span>
                    <select
                      value={filterParnik}
                      onChange={(e) => setFilterParnik(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                    >
                      <option value="">Ähli Parnikler</option>
                      {[1, 2, 3, 4, 5].map((p) => (
                        <option key={p} value={p}>Parnik {p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sektor Filter */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold">Sektor:</span>
                    <select
                      value={filterSektor}
                      onChange={(e) => setFilterSektor(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                    >
                      <option value="">Ähli Sektor</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Sektor {s}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* Individual Breaches Filters */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold">Dereje:</span>
                    <select
                      value={severityFilter}
                      onChange={(e: any) => setSeverityFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                    >
                      <option value="all">Ähli Derejeler</option>
                      <option value="critical">🔴 Diňe Kritiki</option>
                      <option value="warning">🟡 Duýduryşlar</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold">Görkeziji:</span>
                    <select
                      value={paramFilter}
                      onChange={(e) => setParamFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                    >
                      <option value="all">Ähli Görkezijiler</option>
                      <option value="drip_ph">Iýmit Drip pH</option>
                      <option value="drip_ec">Iýmit Drip EC</option>
                      <option value="drain_ph">Drenaž pH</option>
                      <option value="drain_ec">Drenaž EC</option>
                      <option value="drain_percent">Drenaž Göterimi (%)</option>
                      <option value="drain_ml_hosa">🍅 Hoşa Pomidor Drenaž ml (P1,2,4)</option>
                      <option value="drain_ml_gulgune">🌸 Gülgüne Pomidor Drenaž ml (P3,5)</option>
                      <option value="night_drop">🌙 Gijeki Ýeňleme (%)</option>
                      <option value="solar_rad">☀️ Gün Radiasiýasy (J/cm²)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Gözleg (parnik, sektor, sene)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:outline-none w-48 sm:w-56"
                />
              </div>
            </div>

            {/* Export CSV Button */}
            {criteriaViewMode !== 'individual_records' ? (
              <button
                onClick={handleExportParnikSektorCSV}
                disabled={filteredParnikSektorList.length === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-100 disabled:opacity-50 transition self-end md:self-auto cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Parnik & Sektor Hasabatyny CSV Ýükle</span>
              </button>
            ) : (
              <button
                onClick={handleExportEventsCSV}
                disabled={detectedEvents.length === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-100 disabled:opacity-50 transition self-end md:self-auto cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Kriteriýa Sanawyny CSV Ýükle</span>
              </button>
            )}
          </div>

          {/* MAIN CRITERIA TABLE: Parnik & Sektor Mode */}
          {criteriaViewMode !== 'individual_records' ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>
                    {criteriaViewMode === 'daily_parnik_sektor' ? 'Gündelik' : 'Jemlenen'} Parnik & Sektor Hasaplamalary ({filteredParnikSektorList.length})
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Her parnikiň we sektoryň ortaça görkezijileri we bellenen kriteriýa gabatlygy
                </span>
              </div>

              {filteredParnikSektorList.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    Gözlege Laýyk Sektor Tapylmady
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Saýlanan süzgüçleri üýtgediň ýa-da arassalaň.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        {criteriaViewMode === 'daily_parnik_sektor' && (
                          <th className="py-3 px-3">Sene</th>
                        )}
                        <th className="py-3 px-3">Parnik & Pomidor Sorty</th>
                        <th className="py-3 px-3">Sektor</th>
                        <th className="py-3 px-3">Drip (pH / EC)</th>
                        <th className="py-3 px-3">Drenaž (pH / EC)</th>
                        <th className="py-3 px-3">Drenaž Mukdary (ml)</th>
                        <th className="py-3 px-3">Drenaž %</th>
                        <th className="py-3 px-3">Gijeki Ýeňleme %</th>
                        <th className="py-3 px-3 text-center">Ýazgy Sany</th>
                        <th className="py-3 px-3 text-center">Umumy Ýagdaýy</th>
                        <th className="py-3 px-3 text-right">Hereket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredParnikSektorList.map((item) => {
                        const isCritical = item.overallStatus === 'critical';
                        const isWarning = item.overallStatus === 'warning';
                        const isHosa = item.variety === 'Hoşa';

                        // Sub-evaluation status lookups
                        const dripPhEv = item.evaluations.find((e) => e.paramCode === 'drip_ph');
                        const dripEcEv = item.evaluations.find((e) => e.paramCode === 'drip_ec');
                        const drainPhEv = item.evaluations.find((e) => e.paramCode === 'drain_ph');
                        const drainEcEv = item.evaluations.find((e) => e.paramCode === 'drain_ec');
                        const drainMlEv = item.evaluations.find(
                          (e) => e.paramCode === 'drain_ml_hosa' || e.paramCode === 'drain_ml_gulgune'
                        );
                        const drainPctEv = item.evaluations.find((e) => e.paramCode === 'drain_percent');
                        const nightEv = item.evaluations.find((e) => e.paramCode === 'night_drop');

                        return (
                          <tr
                            key={item.key}
                            className={`transition-colors ${
                              isCritical
                                ? 'bg-rose-50/40 hover:bg-rose-50'
                                : isWarning
                                ? 'bg-amber-50/30 hover:bg-amber-50/60'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Sene (if daily) */}
                            {criteriaViewMode === 'daily_parnik_sektor' && (
                              <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-slate-800">
                                {item.sane}
                              </td>
                            )}

                            {/* Parnik & Tomato Variety */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-black text-slate-900 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">
                                  {item.parnik}
                                </span>
                                <span>Parnik {item.parnik}</span>
                              </div>
                              <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                                isHosa ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                {isHosa ? '🍅 Hoşa' : '🌸 Gülgüne'}
                              </span>
                            </td>

                            {/* Sektor */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-200 text-slate-800">
                                Sektor {item.sektor}
                              </span>
                            </td>

                            {/* Drip pH & EC */}
                            <td className="py-3 px-3 whitespace-nowrap font-mono text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 mr-1">pH:</span>
                                <span className={`font-bold ${
                                  dripPhEv?.status === 'critical' ? 'text-rose-600' : dripPhEv?.status === 'warning' ? 'text-amber-600' : 'text-slate-900'
                                }`}>
                                  {item.avg_drip_ph ?? '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 mr-1">EC:</span>
                                <span className={`font-bold ${
                                  dripEcEv?.status === 'critical' ? 'text-rose-600' : dripEcEv?.status === 'warning' ? 'text-amber-600' : 'text-blue-700'
                                }`}>
                                  {item.avg_drip_ec ? `${item.avg_drip_ec} mS` : '-'}
                                </span>
                              </div>
                            </td>

                            {/* Drain pH & EC */}
                            <td className="py-3 px-3 whitespace-nowrap font-mono text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 mr-1">pH:</span>
                                <span className={`font-bold ${
                                  drainPhEv?.status === 'critical' ? 'text-rose-600' : drainPhEv?.status === 'warning' ? 'text-amber-600' : 'text-slate-900'
                                }`}>
                                  {item.avg_drain_ph ?? '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 mr-1">EC:</span>
                                <span className={`font-bold ${
                                  drainEcEv?.status === 'critical' ? 'text-rose-600' : drainEcEv?.status === 'warning' ? 'text-amber-600' : 'text-amber-700'
                                }`}>
                                  {item.avg_drain_ec ? `${item.avg_drain_ec} mS` : '-'}
                                </span>
                              </div>
                            </td>

                            {/* Drain Volume ml with Sort-specific threshold indicator */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-mono font-black text-sm">
                                <span className={`${
                                  drainMlEv?.status === 'critical' 
                                    ? 'text-rose-600' 
                                    : drainMlEv?.status === 'warning' 
                                    ? 'text-amber-600' 
                                    : 'text-emerald-700'
                                }`}>
                                  {item.avg_drain_ml !== null ? `${item.avg_drain_ml} ml` : '-'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {isHosa ? 'Kada: 300-450 ml' : 'Kada: 320-500 ml'}
                              </span>
                            </td>

                            {/* Drain % */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${
                                drainPctEv?.status === 'critical'
                                  ? 'bg-rose-100 text-rose-700'
                                  : drainPctEv?.status === 'warning'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {item.drain_percent !== null ? `${item.drain_percent}%` : '-'}
                              </span>
                            </td>

                            {/* Night Drop % */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${
                                nightEv?.status === 'critical'
                                  ? 'bg-rose-100 text-rose-700'
                                  : nightEv?.status === 'warning'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {item.avg_night_drop !== null ? `${item.avg_night_drop}%` : '-'}
                              </span>
                            </td>

                            {/* Record Count */}
                            <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-xs text-slate-500">
                              {item.recordCount} ýazgy
                            </td>

                            {/* Overall Status Badge */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isCritical
                                  ? 'bg-rose-600 text-white'
                                  : isWarning
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {isCritical ? '🔴 Kritiki' : isWarning ? '🟡 Duýduryş' : '🟢 Kadaly'}
                              </span>
                            </td>

                            {/* Action Button: Open deep analysis */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => setSelectedSummary(item)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Seljerme</span>
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
          ) : (
            /* Detected Individual Events Table */
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-600" />
                  <span>Aýratyn Girizilen Ýazgylar & Kadadan Çykmalar ({filteredEvents.length})</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Her setir üçin aýratyn barlanan gyşarmalar we agronom maslahatlary
                </span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    Kadadan Çykan Kriteriýa Ýok!
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Saýlanan wagt aralygynda we parniklerde ähli suwaryş, iýmit we drenaž görkezijileri bellenen hepdelik kadalara doly laýyk gelýär.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-3">Sene & Wagt</th>
                        <th className="py-3 px-3">Parnik / Sektor</th>
                        <th className="py-3 px-3">Ýüze Çykan Kriteriýa</th>
                        <th className="py-3 px-3 text-right">Barlanylan Baha</th>
                        <th className="py-3 px-3 text-center">Bellenen Kadaly Baha</th>
                        <th className="py-3 px-3 text-right">Gyşarma</th>
                        <th className="py-3 px-3">Dereje</th>
                        <th className="py-3 px-4 min-w-[260px]">Agronom Maslahaty & Görülmeli Çäre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredEvents.map((ev) => {
                        const isCritical = ev.severity === 'critical';

                        return (
                          <tr
                            key={ev.id}
                            className={`transition-colors ${
                              isCritical ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Sene & Wagt */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-bold text-slate-900">{ev.sane}</div>
                              <div className="text-[11px] text-slate-500">{ev.wagt} ({ev.criteriaWeek}-nji hepde)</div>
                            </td>

                            {/* Parnik / Sektor */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-200 text-slate-800">
                                P-{ev.parnik} / S-{ev.sektor}
                              </span>
                            </td>

                            {/* Kriteriya Param Name */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {ev.paramCode.includes('ph') && <FlaskConical className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                {ev.paramCode.includes('ec') && <Gauge className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                {ev.paramCode.includes('percent') && <Droplets className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                                {ev.paramCode.includes('drain_ml') && <Droplets className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                {ev.paramCode === 'night_drop' && <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                {ev.paramCode === 'solar_rad' && <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                <span>{ev.paramName}</span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {ev.direction === 'high' ? 'Kadadan ýokary' : 'Kadadan pes'}
                              </span>
                            </td>

                            {/* Barlanylan Baha */}
                            <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900 whitespace-nowrap">
                              {ev.value} <span className="text-[10px] text-slate-500">{ev.unit}</span>
                            </td>

                            {/* Kadaly Baha Range */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold">
                                {ev.min} — {ev.max} {ev.unit}
                              </span>
                            </td>

                            {/* Gyşarma */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-mono font-bold text-xs ${
                                isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {ev.direction === 'high' ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3" />
                                )}
                                {ev.direction === 'high' ? '+' : '-'}{ev.deviation} {ev.unit}
                              </span>
                            </td>

                            {/* Severity Badge */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isCritical ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                              }`}>
                                {isCritical ? 'Kritiki' : 'Duýduryş'}
                              </span>
                            </td>

                            {/* Recommendation */}
                            <td className="py-3 px-4">
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {ev.recommendation}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Deep Evaluation Modal for a Selected Parnik & Sektor */}
          {selectedSummary && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                      P-{selectedSummary.parnik}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Parnik {selectedSummary.parnik} — Sektor {selectedSummary.sektor}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                          selectedSummary.overallStatus === 'critical'
                            ? 'bg-rose-600 text-white'
                            : selectedSummary.overallStatus === 'warning'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {selectedSummary.overallStatus === 'critical' ? 'Kritiki' : selectedSummary.overallStatus === 'warning' ? 'Duýduryş' : 'Kadaly'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        {selectedSummary.varietyLabel} {selectedSummary.sane ? `| Sene: ${selectedSummary.sane}` : ''} | Jemi {selectedSummary.recordCount} hasabat barlanyldy
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedSummary(null)}
                    className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body: Evaluated Metrics */}
                <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Her Parametr Boýunça Hasaplama we Agronom Çözgütleri:
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Parametr</th>
                          <th className="py-2.5 px-3 text-right">Hasaplanan Baha</th>
                          <th className="py-2.5 px-3 text-center">Bellenen Kada</th>
                          <th className="py-2.5 px-3 text-center">Ýagdaýy</th>
                          <th className="py-2.5 px-3">Agronom Maslahaty & Görülmeli Çäre</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedSummary.evaluations.map((ev, idx) => (
                          <tr key={idx} className={ev.status === 'critical' ? 'bg-rose-50/50' : ev.status === 'warning' ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                            <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                              {ev.paramName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black whitespace-nowrap">
                              {ev.value} <span className="text-[10px] text-slate-400 font-normal">{ev.unit}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap text-slate-600">
                              {ev.min} — {ev.max} {ev.unit}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                ev.status === 'critical'
                                  ? 'bg-rose-600 text-white'
                                  : ev.status === 'warning'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {ev.status === 'critical' ? 'Kritiki' : ev.status === 'warning' ? 'Duýduryş' : 'Kadaly'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-slate-700 leading-relaxed font-medium">
                              {ev.recommendation}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
                  <button
                    onClick={() => setSelectedSummary(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Ýap
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: GÖRKEZIJILERIŇ GRAFIKLERI WE DINAMIKA                   */}
      {/* ============================================================== */}
      {activeSubTab === 'grafikler' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* General Stats Quick Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Jemi Drip</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {(stats.totalDrip / 1000).toFixed(1)} L
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Jemi Drenaž</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {(stats.totalDrain / 1000).toFixed(1)} L
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Ort. Drenaž %</span>
              <div className="text-base font-black text-purple-700 mt-0.5">
                {stats.avgDrainPercent}%
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Ort. Drip EC</span>
              <div className="text-base font-black text-blue-700 mt-0.5">
                {stats.avgDripEc} mS
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Ort. Drenaž EC</span>
              <div className="text-base font-black text-amber-700 mt-0.5">
                {stats.avgDrainEc} mS
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Ort. Drip pH</span>
              <div className="text-base font-black text-emerald-700 mt-0.5">
                {stats.avgDripPh}
              </div>
            </div>
          </div>

          {/* Chart 1: Suwaryş we Drenaž Mukdary */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  1. Suwaryş (Drip ml) we Drenaž (Drain ml) Deňeşdirmesi
                </h3>
                <p className="text-xs text-slate-500">
                  Her bir ösümlige berlen suw mukdary we çykan drenažyň gatnaşygy.
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Maglumat ýok
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} unit=" ml" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#8b5cf6' }} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        fontSize: '11px',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="drip_ml" fill="#3b82f6" name="Drip (Suwaryş ml)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="drain_ml" fill="#10b981" name="Drenaž (Çykyş ml)" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="drain_percent" stroke="#8b5cf6" strokeWidth={2.5} name="Drenaž %" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: EC Dinamikasy */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-600" />
                  2. Iýmitlendirş we Drenaž EC (Duzlulyk) Dinamikasy
                </h3>
                <p className="text-xs text-slate-500">
                  Drip EC bilen Drenaj EC arasyndaky tapawut (Kök zonasynyň duz konsentrasiýasy).
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Maglumat ýok
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLine data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['dataMin - 0.5', 'dataMax + 0.5']} unit=" mS" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        fontSize: '11px',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="drip_ec" stroke="#2563eb" strokeWidth={2.5} name="Drip EC (Iýmit)" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="drain_ec" stroke="#d97706" strokeWidth={2.5} name="Drenaž EC" dot={{ r: 3 }} />
                    <ReferenceLine y={3.0} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Kadaly Drip (3.0)', fontSize: 10, fill: '#94a3b8' }} />
                  </RechartsLine>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 3: pH Dinamikasy */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  3. Drip pH we Drenaž pH Deňagramlylygy
                </h3>
                <p className="text-xs text-slate-500">
                  Ösümligiň iýmit siňdiriş mümkinçiligini kesgitleýän kislotalylyk derejesi.
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Maglumat ýok
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLine data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[5.0, 7.5]} unit=" pH" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        fontSize: '11px',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <ReferenceLine y={5.5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Min pH (5.5)', fontSize: 10, fill: '#ef4444' }} />
                    <ReferenceLine y={6.5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Max pH (6.5)', fontSize: 10, fill: '#ef4444' }} />
                    <Line type="monotone" dataKey="drip_ph" stroke="#059669" strokeWidth={2.5} name="Drip pH" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="drain_ph" stroke="#7c3aed" strokeWidth={2.5} name="Drenaž pH" dot={{ r: 3 }} />
                  </RechartsLine>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 4: Daşky Gurşaw Şertleri */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  4. Daşky Gurşaw: Gün Radiasiýasy (J/cm²) we Temperatura (°C)
                </h3>
                <p className="text-xs text-slate-500">
                  Howa şertleriniň suwaryşa we fotosinteze täsiri.
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Maglumat ýok
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} unit=" J/cm²" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#e11d48' }} unit="°C" domain={[0, 45]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        fontSize: '11px',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="solar_rad" fill="#fef3c7" stroke="#f59e0b" name="Gün Radiasiýasy (J/cm²)" />
                    <Line yAxisId="right" type="monotone" dataKey="avg_temp" stroke="#e11d48" strokeWidth={2.5} name="Ortalama Temp (°C)" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
