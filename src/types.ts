export interface HasabatRecord {
  id: number;
  sane: string;
  wagt: string;
  parnik: number;
  sektor: number;
  barlag_no?: number | null; // 1: Irden, 2: Günortan, 3: Öýlän-Agşam (Günüň 3 barlagy)
  drip_ml: number | null;
  drip_ec: number | null;
  drip_ph: number | null;
  sunrise: string | null;
  sunset: string | null;
  solar_rad: number | null;
  avg_temp: number | null;
  drain_ml: number | null;
  drain_ec: number | null;
  drain_ph: number | null;
  drain_percent: number | null;
  night_drop: number | null;
  production_kg_m2: number | null;
  avg_fruit_weight: number | null;
  stem_growth_week: number | null;
  stem_diameter_mm: number | null;
  flowering_brush_num: number | null;
  distance_to_crown: number | null;
  leaf_length_cm: number | null;
  fruits_per_plant: number | null;
  fruit_load_m2: number | null;
  leaves_before_cutting: number | null;
  stem_length_mm: number | null;
  harvested_brushes_qty: number | null;
  _isOfflinePending?: boolean;
}

export interface HepdelikKriteriya {
  id?: number;
  yil: number;
  hepde: number;
  besin_ph_min: number;
  besin_ph_max: number;
  besin_ec_min: number;
  besin_ec_max: number;
  drenaj_ph_min: number;
  drenaj_ph_max: number;
  drenaj_ec_min: number;
  drenaj_ec_max: number;
  // Täze aýratyn agronomik kriteriýalar
  gijeki_yenleme_min?: number | null;
  gijeki_yenleme_max?: number | null;
  radiasiya_min?: number | null;
  radiasiya_max?: number | null;
  drenaj_ml_hosa_min?: number | null; // 1, 2, 4-nji parnikler (Hoşa pomidor)
  drenaj_ml_hosa_max?: number | null;
  drenaj_ml_gulgune_min?: number | null; // 3 we 5-nji parnikler (Gülgüne pomidor)
  drenaj_ml_gulgune_max?: number | null;
}

export interface ParnikMetricEvaluation {
  paramCode: string;
  paramName: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  deviation: number;
  direction: 'high' | 'low' | 'normal';
  status: 'normal' | 'warning' | 'critical';
  recommendation: string;
}

export interface ParnikSektorCriteriaSummary {
  key: string;
  parnik: number;
  sektor: number;
  sane?: string;
  variety: 'Hoşa' | 'Gülgüne';
  varietyLabel: string;
  recordCount: number;
  avg_drip_ph: number | null;
  avg_drip_ec: number | null;
  avg_drain_ph: number | null;
  avg_drain_ec: number | null;
  avg_drip_ml: number | null;
  avg_drain_ml: number | null;
  total_drip_ml: number;
  total_drain_ml: number;
  drain_percent: number | null;
  avg_night_drop: number | null;
  avg_solar_rad: number | null;
  overallStatus: 'normal' | 'warning' | 'critical';
  evaluations: ParnikMetricEvaluation[];
  warningCount: number;
  criticalCount: number;
}

export type UserRole = 'laboratoriya' | 'operator' | 'agronom' | 'monitoring' | 'redaktor' | 'admin';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export type ActiveTab = 'operator' | 'laboratoriya' | 'agronom' | 'monitoring' | 'redaktor' | 'kriteriyalar';

export interface OfflineAction {
  id: string;
  timestamp: number;
  type: 'CREATE_OPERATOR_RECORD' | 'UPDATE_LAB_RECORD' | 'UPDATE_AGRONOM_RECORD' | 'UPDATE_ANY_RECORD' | 'DELETE_RECORD' | 'SAVE_KRITERIYA';
  payload: any;
  targetId?: number;
  description: string;
}

export interface EnvData {
  sunrise: string | null;
  sunset: string | null;
  solar_rad: number | null;
  avg_temp: number | null;
}
