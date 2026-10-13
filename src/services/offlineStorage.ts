import { HasabatRecord, HepdelikKriteriya, OfflineAction } from '../types';

const STORAGE_KEYS = {
  RECORDS: 'parnik_cached_records',
  CRITERIA: 'parnik_cached_kriteriyalar',
  QUEUE: 'parnik_offline_queue',
  LAST_SYNC: 'parnik_last_sync_timestamp',
};

// Initial fallback records for instant offline use even before any server connection
const todayStr = new Date().toISOString().split('T')[0];
const DEFAULT_INITIAL_RECORDS: HasabatRecord[] = [
  // Parnik 1 (Hoşa)
  {
    id: 1,
    sane: todayStr,
    wagt: '08:30',
    parnik: 1,
    sektor: 1,
    drip_ml: 1250,
    drip_ec: 2.9,
    drip_ph: 5.8,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 380,
    drain_ec: 4.8,
    drain_ph: 6.1,
    drain_percent: 30.4,
    night_drop: 6.2,
    production_kg_m2: 4.2,
    avg_fruit_weight: 145,
    stem_growth_week: 18.5,
    stem_diameter_mm: 11.2,
    flowering_brush_num: 3,
    distance_to_crown: 17.5,
    leaf_length_cm: 42,
    fruits_per_plant: 28,
    fruit_load_m2: 8.5,
    leaves_before_cutting: 16,
    stem_length_mm: 3100,
    harvested_brushes_qty: 12,
  },
  {
    id: 2,
    sane: todayStr,
    wagt: '09:00',
    parnik: 1,
    sektor: 2,
    drip_ml: 1300,
    drip_ec: 2.95,
    drip_ph: 5.75,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 410,
    drain_ec: 4.9,
    drain_ph: 6.2,
    drain_percent: 31.5,
    night_drop: 5.8,
    production_kg_m2: 4.1,
    avg_fruit_weight: 142,
    stem_growth_week: 19.0,
    stem_diameter_mm: 11.0,
    flowering_brush_num: 3,
    distance_to_crown: 18.0,
    leaf_length_cm: 43,
    fruits_per_plant: 29,
    fruit_load_m2: 8.6,
    leaves_before_cutting: 16,
    stem_length_mm: 3120,
    harvested_brushes_qty: 11,
  },
  // Parnik 2 (Hoşa)
  {
    id: 3,
    sane: todayStr,
    wagt: '09:30',
    parnik: 2,
    sektor: 1,
    drip_ml: 1200,
    drip_ec: 2.85,
    drip_ph: 5.9,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 350,
    drain_ec: 4.7,
    drain_ph: 6.0,
    drain_percent: 29.2,
    night_drop: 6.0,
    production_kg_m2: 3.9,
    avg_fruit_weight: 138,
    stem_growth_week: 17.5,
    stem_diameter_mm: 10.8,
    flowering_brush_num: 2,
    distance_to_crown: 19.0,
    leaf_length_cm: 41,
    fruits_per_plant: 26,
    fruit_load_m2: 7.9,
    leaves_before_cutting: 15,
    stem_length_mm: 2980,
    harvested_brushes_qty: 10,
  },
  {
    id: 4,
    sane: todayStr,
    wagt: '09:45',
    parnik: 2,
    sektor: 2,
    drip_ml: 1220,
    drip_ec: 2.88,
    drip_ph: 5.85,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 370,
    drain_ec: 4.8,
    drain_ph: 6.1,
    drain_percent: 30.3,
    night_drop: 5.7,
    production_kg_m2: 4.0,
    avg_fruit_weight: 140,
    stem_growth_week: 18.0,
    stem_diameter_mm: 11.0,
    flowering_brush_num: 3,
    distance_to_crown: 18.5,
    leaf_length_cm: 42,
    fruits_per_plant: 27,
    fruit_load_m2: 8.2,
    leaves_before_cutting: 16,
    stem_length_mm: 3050,
    harvested_brushes_qty: 11,
  },
  // Parnik 3 (Gülgüne)
  {
    id: 5,
    sane: todayStr,
    wagt: '10:00',
    parnik: 3,
    sektor: 1,
    drip_ml: 1350,
    drip_ec: 3.0,
    drip_ph: 5.7,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 420,
    drain_ec: 5.0,
    drain_ph: 6.3,
    drain_percent: 31.1,
    night_drop: 6.5,
    production_kg_m2: 4.3,
    avg_fruit_weight: 150,
    stem_growth_week: 19.5,
    stem_diameter_mm: 11.5,
    flowering_brush_num: 3,
    distance_to_crown: 17.0,
    leaf_length_cm: 44,
    fruits_per_plant: 30,
    fruit_load_m2: 8.8,
    leaves_before_cutting: 17,
    stem_length_mm: 3180,
    harvested_brushes_qty: 13,
  },
  {
    id: 6,
    sane: todayStr,
    wagt: '10:15',
    parnik: 3,
    sektor: 2,
    drip_ml: 1380,
    drip_ec: 3.05,
    drip_ph: 5.72,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 440,
    drain_ec: 5.1,
    drain_ph: 6.25,
    drain_percent: 31.9,
    night_drop: 6.3,
    production_kg_m2: 4.2,
    avg_fruit_weight: 148,
    stem_growth_week: 19.2,
    stem_diameter_mm: 11.3,
    flowering_brush_num: 3,
    distance_to_crown: 17.2,
    leaf_length_cm: 43,
    fruits_per_plant: 29,
    fruit_load_m2: 8.7,
    leaves_before_cutting: 17,
    stem_length_mm: 3150,
    harvested_brushes_qty: 12,
  },
  // Parnik 4 (Hoşa)
  {
    id: 7,
    sane: todayStr,
    wagt: '10:30',
    parnik: 4,
    sektor: 1,
    drip_ml: 1280,
    drip_ec: 2.92,
    drip_ph: 5.82,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 395,
    drain_ec: 4.85,
    drain_ph: 6.15,
    drain_percent: 30.9,
    night_drop: 5.9,
    production_kg_m2: 4.1,
    avg_fruit_weight: 143,
    stem_growth_week: 18.8,
    stem_diameter_mm: 11.1,
    flowering_brush_num: 3,
    distance_to_crown: 17.8,
    leaf_length_cm: 42,
    fruits_per_plant: 28,
    fruit_load_m2: 8.5,
    leaves_before_cutting: 16,
    stem_length_mm: 3090,
    harvested_brushes_qty: 12,
  },
  {
    id: 8,
    sane: todayStr,
    wagt: '10:45',
    parnik: 4,
    sektor: 2,
    drip_ml: 1260,
    drip_ec: 2.9,
    drip_ph: 5.8,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 390,
    drain_ec: 4.8,
    drain_ph: 6.1,
    drain_percent: 31.0,
    night_drop: 6.1,
    production_kg_m2: 4.0,
    avg_fruit_weight: 141,
    stem_growth_week: 18.6,
    stem_diameter_mm: 11.0,
    flowering_brush_num: 3,
    distance_to_crown: 18.0,
    leaf_length_cm: 42,
    fruits_per_plant: 28,
    fruit_load_m2: 8.4,
    leaves_before_cutting: 16,
    stem_length_mm: 3070,
    harvested_brushes_qty: 11,
  },
  // Parnik 5 (Gülgüne)
  {
    id: 9,
    sane: todayStr,
    wagt: '11:00',
    parnik: 5,
    sektor: 1,
    drip_ml: 1320,
    drip_ec: 2.98,
    drip_ph: 5.75,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 410,
    drain_ec: 4.95,
    drain_ph: 6.2,
    drain_percent: 31.1,
    night_drop: 6.4,
    production_kg_m2: 4.2,
    avg_fruit_weight: 147,
    stem_growth_week: 19.1,
    stem_diameter_mm: 11.2,
    flowering_brush_num: 3,
    distance_to_crown: 17.4,
    leaf_length_cm: 43,
    fruits_per_plant: 29,
    fruit_load_m2: 8.6,
    leaves_before_cutting: 16,
    stem_length_mm: 3120,
    harvested_brushes_qty: 12,
  },
  {
    id: 10,
    sane: todayStr,
    wagt: '11:15',
    parnik: 5,
    sektor: 2,
    drip_ml: 1360,
    drip_ec: 3.02,
    drip_ph: 5.78,
    sunrise: '06:15',
    sunset: '19:40',
    solar_rad: 1950,
    avg_temp: 23.4,
    drain_ml: 430,
    drain_ec: 5.05,
    drain_ph: 6.28,
    drain_percent: 31.6,
    night_drop: 6.2,
    production_kg_m2: 4.3,
    avg_fruit_weight: 149,
    stem_growth_week: 19.3,
    stem_diameter_mm: 11.4,
    flowering_brush_num: 3,
    distance_to_crown: 17.1,
    leaf_length_cm: 44,
    fruits_per_plant: 30,
    fruit_load_m2: 8.8,
    leaves_before_cutting: 17,
    stem_length_mm: 3160,
    harvested_brushes_qty: 13,
  },
];

const DEFAULT_INITIAL_CRITERIA: HepdelikKriteriya[] = [
  {
    id: 1,
    yil: new Date().getFullYear(),
    hepde: 38,
    besin_ph_min: 5.6,
    besin_ph_max: 6.0,
    besin_ec_min: 2.7,
    besin_ec_max: 3.1,
    drenaj_ph_min: 5.8,
    drenaj_ph_max: 6.4,
    drenaj_ec_min: 4.5,
    drenaj_ec_max: 5.2,
    gijeki_yenleme_min: 3,
    gijeki_yenleme_max: 8,
    radiasiya_min: 1200,
    radiasiya_max: 2300,
    drenaj_ml_hosa_min: 300,
    drenaj_ml_hosa_max: 450,
    drenaj_ml_gulgune_min: 320,
    drenaj_ml_gulgune_max: 500,
  },
];

export class OfflineStorageService {
  // --- Records Cache ---
  public static getCachedRecords(): HasabatRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading cached records from localStorage:', e);
    }
    return DEFAULT_INITIAL_RECORDS;
  }

  public static saveCachedRecords(records: HasabatRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    } catch (e) {
      console.warn('Error saving cached records to localStorage:', e);
    }
  }

  // --- Criteria Cache ---
  public static getCachedCriteria(): HepdelikKriteriya[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CRITERIA);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading cached criteria:', e);
    }
    return DEFAULT_INITIAL_CRITERIA;
  }

  public static saveCachedCriteria(criteria: HepdelikKriteriya[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CRITERIA, JSON.stringify(criteria));
    } catch (e) {
      console.warn('Error saving cached criteria:', e);
    }
  }

  // --- Offline Action Queue ---
  public static getQueue(): OfflineAction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading queue:', e);
    }
    return [];
  }

  public static saveQueue(queue: OfflineAction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.warn('Error saving queue:', e);
    }
  }

  public static enqueueAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): OfflineAction {
    const fullAction: OfflineAction = {
      ...action,
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    const currentQueue = this.getQueue();
    currentQueue.push(fullAction);
    this.saveQueue(currentQueue);
    return fullAction;
  }

  // --- Offline Operations ---
  public static addRecordOffline(newRecordData: Partial<HasabatRecord>): HasabatRecord {
    const currentRecords = this.getCachedRecords();
    
    // Generate temporary unique local ID (negative so it never collides with positive server IDs)
    const tempId = -Math.floor(Date.now() % 10000000);
    
    const drainMl = newRecordData.drain_ml || 0;
    const dripMl = newRecordData.drip_ml || 0;
    const drainPercent = dripMl > 0 ? Number(((drainMl / dripMl) * 100).toFixed(1)) : 0;

    const fullRecord: HasabatRecord = {
      id: tempId,
      sane: newRecordData.sane || new Date().toISOString().split('T')[0],
      wagt: newRecordData.wagt || '08:00',
      parnik: Number(newRecordData.parnik) || 1,
      sektor: Number(newRecordData.sektor) || 1,
      drip_ml: dripMl || null,
      drip_ec: newRecordData.drip_ec !== undefined ? newRecordData.drip_ec : null,
      drip_ph: newRecordData.drip_ph !== undefined ? newRecordData.drip_ph : null,
      sunrise: newRecordData.sunrise || null,
      sunset: newRecordData.sunset || null,
      solar_rad: newRecordData.solar_rad !== undefined ? newRecordData.solar_rad : null,
      avg_temp: newRecordData.avg_temp !== undefined ? newRecordData.avg_temp : null,
      drain_ml: drainMl || null,
      drain_ec: newRecordData.drain_ec !== undefined ? newRecordData.drain_ec : null,
      drain_ph: newRecordData.drain_ph !== undefined ? newRecordData.drain_ph : null,
      drain_percent: drainPercent || null,
      night_drop: newRecordData.night_drop !== undefined ? newRecordData.night_drop : null,
      production_kg_m2: null,
      avg_fruit_weight: null,
      stem_growth_week: null,
      stem_diameter_mm: null,
      flowering_brush_num: null,
      distance_to_crown: null,
      leaf_length_cm: null,
      fruits_per_plant: null,
      fruit_load_m2: null,
      leaves_before_cutting: null,
      stem_length_mm: null,
      harvested_brushes_qty: null,
      _isOfflinePending: true,
    };

    // Prepend to cached records
    const updated = [fullRecord, ...currentRecords];
    this.saveCachedRecords(updated);

    // Queue for sync
    this.enqueueAction({
      type: 'CREATE_OPERATOR_RECORD',
      payload: newRecordData,
      description: `Operator: Parnik ${fullRecord.parnik}, Sektor ${fullRecord.sektor} (${fullRecord.sane})`,
    });

    return fullRecord;
  }

  public static updateRecordOffline(
    id: number,
    fields: Partial<HasabatRecord>,
    actionType: OfflineAction['type'] = 'UPDATE_ANY_RECORD'
  ): HasabatRecord | null {
    const records = this.getCachedRecords();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const current = records[index];

    // Normalize numeric fields so strings from inputs don't corrupt types
    const parseNum = (v: any) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
    const normalizedFields: Partial<HasabatRecord> = { ...fields };
    if ('drip_ml' in fields) normalizedFields.drip_ml = parseNum(fields.drip_ml);
    if ('drain_ml' in fields) normalizedFields.drain_ml = parseNum(fields.drain_ml);
    if ('drip_ec' in fields) normalizedFields.drip_ec = parseNum(fields.drip_ec);
    if ('drip_ph' in fields) normalizedFields.drip_ph = parseNum(fields.drip_ph);
    if ('drain_ec' in fields) normalizedFields.drain_ec = parseNum(fields.drain_ec);
    if ('drain_ph' in fields) normalizedFields.drain_ph = parseNum(fields.drain_ph);
    if ('night_drop' in fields) normalizedFields.night_drop = parseNum(fields.night_drop);

    const updatedRecord: HasabatRecord = {
      ...current,
      ...normalizedFields,
      _isOfflinePending: true,
    };

    // Recalculate drain percent if drip or drain changed
    const drip = updatedRecord.drip_ml || 0;
    const drain = updatedRecord.drain_ml || 0;
    if (drip > 0 && drain > 0) {
      updatedRecord.drain_percent = Number(((drain / drip) * 100).toFixed(1));
    } else if (drain === 0 || drain === null) {
      updatedRecord.drain_percent = null;
    }

    records[index] = updatedRecord;
    this.saveCachedRecords(records);

    this.enqueueAction({
      type: actionType,
      targetId: id,
      payload: normalizedFields,
      description: `Üýtgetme: Ýazgy #${id} (${updatedRecord.sane})`,
    });

    return updatedRecord;
  }

  public static deleteRecordOffline(id: number): boolean {
    const records = this.getCachedRecords();
    const filtered = records.filter((r) => r.id !== id);
    this.saveCachedRecords(filtered);

    // If it was already a temporary local id, we can just remove queued creates for it
    if (id < 0) {
      const queue = this.getQueue().filter((q) => q.targetId !== id);
      this.saveQueue(queue);
    } else {
      this.enqueueAction({
        type: 'DELETE_RECORD',
        targetId: id,
        payload: { id },
        description: `Pozuldy: Ýazgy #${id}`,
      });
    }

    return true;
  }

  public static saveCriteriaOffline(criteria: HepdelikKriteriya): void {
    const list = this.getCachedCriteria();
    const index = list.findIndex((c) => c.yil === criteria.yil && c.hepde === criteria.hepde);
    if (index >= 0) {
      list[index] = criteria;
    } else {
      list.push(criteria);
    }
    this.saveCachedCriteria(list);

    this.enqueueAction({
      type: 'SAVE_KRITERIYA',
      payload: criteria,
      description: `Kriteriýa: ${criteria.yil} ýyl, ${criteria.hepde}-nji hepde`,
    });
  }

  // --- Synchronization with Server ---
  public static async syncQueue(): Promise<{
    success: boolean;
    syncedCount: number;
    failedCount: number;
    error?: string;
  }> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0 };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const remainingQueue: OfflineAction[] = [];

    for (const item of queue) {
      try {
        let res: Response | null = null;

        if (item.type === 'CREATE_OPERATOR_RECORD') {
          res = await fetch('/api/operator/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
        } else if (item.type === 'UPDATE_LAB_RECORD' && item.targetId && item.targetId > 0) {
          res = await fetch('/api/laboratoriya/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.targetId, ...item.payload }),
          });
        } else if (item.type === 'UPDATE_AGRONOM_RECORD' && item.targetId && item.targetId > 0) {
          res = await fetch('/api/agronom/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.targetId, ...item.payload }),
          });
        } else if (item.type === 'UPDATE_ANY_RECORD' && item.targetId && item.targetId > 0) {
          res = await fetch('/api/redaktor/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.targetId, ...item.payload }),
          });
        } else if (item.type === 'DELETE_RECORD' && item.targetId && item.targetId > 0) {
          res = await fetch(`/api/redaktor/delete/${item.targetId}`, {
            method: 'DELETE',
          });
        } else if (item.type === 'SAVE_KRITERIYA') {
          res = await fetch('/api/kriteriyalar/yaz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
        } else {
          // If it was an update or delete on a local temporary ID, skip server sync
          syncedCount++;
          continue;
        }

        if (res && res.ok) {
          syncedCount++;
        } else {
          failedCount++;
          remainingQueue.push(item);
        }
      } catch (err) {
        console.warn('Sync failed for item:', item, err);
        failedCount++;
        remainingQueue.push(item);
      }
    }

    this.saveQueue(remainingQueue);
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    return {
      success: remainingQueue.length === 0,
      syncedCount,
      failedCount,
    };
  }

  // --- Export and Import Local Backup ---
  public static exportLocalBackup(): void {
    const backup = {
      appName: 'Parnik Belent Agro',
      exportDate: new Date().toISOString(),
      records: this.getCachedRecords(),
      criteria: this.getCachedCriteria(),
      pendingQueue: this.getQueue(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parnik_offline_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public static importLocalBackup(jsonString: string): {
    success: boolean;
    recordsCount: number;
    message: string;
  } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.records || !Array.isArray(data.records)) {
        return { success: false, recordsCount: 0, message: 'Ýalňyş faýl formaty!' };
      }

      this.saveCachedRecords(data.records);
      if (data.criteria && Array.isArray(data.criteria)) {
        this.saveCachedCriteria(data.criteria);
      }

      return {
        success: true,
        recordsCount: data.records.length,
        message: `${data.records.length} sany ýazgy üstünlikli dikeldildi!`,
      };
    } catch (e: any) {
      return { success: false, recordsCount: 0, message: 'JSON faýly okap bolmady!' };
    }
  }
}
