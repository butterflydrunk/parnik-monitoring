import fs from 'fs';
import path from 'path';
import { HasabatRecord, HepdelikKriteriya, AuthUser, UserRole } from '../src/types';

export interface StoredUser extends AuthUser {
  passwordHash: string; // Plain or hashed password for local deployment
}

interface DatabaseSchema {
  hasabat: HasabatRecord[];
  hepdelik_kriteriyalar: HepdelikKriteriya[];
  users: StoredUser[];
  nextHasabatId: number;
  nextKriteriyaId: number;
}

const DB_FILE = path.join(process.cwd(), 'parnik_store.json');

class ParnikDatabase {
  private data: DatabaseSchema = {
    hasabat: [],
    hepdelik_kriteriyalar: [],
    users: [],
    nextHasabatId: 1,
    nextKriteriyaId: 1,
  };

  constructor() {
    this.load();
    if (!this.data.users || this.data.users.length === 0) {
      this.seedUsers();
    }
    if (this.data.hasabat.length === 0) {
      this.seedInitialData();
    }
  }

  private seedUsers() {
    this.data.users = [
      {
        id: 'usr_laboratoriya',
        username: 'laboratoriya',
        name: 'Laboratoriýa Bölümi',
        role: 'laboratoriya',
        passwordHash: '123456',
      },
      {
        id: 'usr_operator',
        username: 'operator',
        name: 'Operator (Suwaryş)',
        role: 'operator',
        passwordHash: '123456',
      },
      {
        id: 'usr_agronom',
        username: 'agronom',
        name: 'Baş Agronom',
        role: 'agronom',
        passwordHash: '123456',
      },
      {
        id: 'usr_monitoring',
        username: 'monitoring',
        name: 'Monitoring & Analitika',
        role: 'monitoring',
        passwordHash: '123456',
      },
      {
        id: 'usr_redaktor',
        username: 'redaktor',
        name: 'Redaktor / Dolandyryjy',
        role: 'redaktor',
        passwordHash: '123456',
      },
    ];
    this.save();
  }

  public authenticate(username: string, pass: string): AuthUser | null {
    const user = this.data.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!user) return null;
    if (user.passwordHash !== pass) return null;

    const { passwordHash, ...cleanUser } = user;
    return cleanUser;
  }

  public changePassword(username: string, oldPass: string, newPass: string): { success: boolean; message: string } {
    const user = this.data.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!user) {
      return { success: false, message: 'Ulanyjy tapylmady!' };
    }
    if (user.passwordHash !== oldPass) {
      return { success: false, message: 'Köne açar sözi (parol) nädogry!' };
    }
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, message: 'Täze parol iň az 4 simwol bolmaly!' };
    }
    user.passwordHash = newPass.trim();
    this.save();
    return { success: true, message: 'Açar sözi üstünlikli çalşyryldy!' };
  }

  public getUsers(): AuthUser[] {
    return (this.data.users || []).map(({ passwordHash, ...u }) => u);
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading database:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  private seedInitialData() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Seed criteria for year 2026 week 38 and 39
    this.data.hepdelik_kriteriyalar = [
      {
        id: 1,
        yil: 2026,
        hepde: 38,
        besin_ph_min: 5.5,
        besin_ph_max: 6.2,
        besin_ec_min: 2.7,
        besin_ec_max: 3.1,
        drenaj_ph_min: 5.8,
        drenaj_ph_max: 6.6,
        drenaj_ec_min: 4.2,
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
      {
        id: 2,
        yil: 2026,
        hepde: 39,
        besin_ph_min: 5.5,
        besin_ph_max: 6.2,
        besin_ec_min: 2.8,
        besin_ec_max: 3.2,
        drenaj_ph_min: 5.8,
        drenaj_ph_max: 6.5,
        drenaj_ec_min: 4.5,
        drenaj_ec_max: 5.5,
        gijeki_yenleme_min: 3,
        gijeki_yenleme_max: 8,
        radiasiya_min: 1300,
        radiasiya_max: 2400,
        drenaj_ml_hosa_min: 300,
        drenaj_ml_hosa_max: 460,
        drenaj_ml_gulgune_min: 330,
        drenaj_ml_gulgune_max: 520,
      },
    ];
    this.data.nextKriteriyaId = 3;

    // Seed sample greenhouse records for all 5 greenhouses (Sektor 1 & Sektor 2)
    const sampleRecords: Omit<HasabatRecord, 'id'>[] = [
      // Parnik 1 (Hoşa) - Today
      {
        sane: today,
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
        sane: today,
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
      // Parnik 2 (Hoşa) - Today
      {
        sane: today,
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
        sane: today,
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
      // Parnik 3 (Gülgüne) - Today
      {
        sane: today,
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
        sane: today,
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
      // Parnik 4 (Hoşa) - Today
      {
        sane: today,
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
        sane: today,
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
      // Parnik 5 (Gülgüne) - Today
      {
        sane: today,
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
        sane: today,
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
      // Parnik 1 - Yesterday
      {
        sane: yesterday,
        wagt: '10:00',
        parnik: 1,
        sektor: 1,
        drip_ml: 1200,
        drip_ec: 2.9,
        drip_ph: 5.85,
        sunrise: '06:14',
        sunset: '19:42',
        solar_rad: 1820,
        avg_temp: 22.8,
        drain_ml: 360,
        drain_ec: 4.8,
        drain_ph: 6.15,
        drain_percent: 30.0,
        night_drop: 5.9,
        production_kg_m2: 4.0,
        avg_fruit_weight: 144,
        stem_growth_week: 18.0,
        stem_diameter_mm: 11.1,
        flowering_brush_num: 3,
        distance_to_crown: 17.0,
        leaf_length_cm: 42,
        fruits_per_plant: 27,
        fruit_load_m2: 8.4,
        leaves_before_cutting: 16,
        stem_length_mm: 3080,
        harvested_brushes_qty: 12,
      },
      {
        sane: yesterday,
        wagt: '10:15',
        parnik: 1,
        sektor: 2,
        drip_ml: 1250,
        drip_ec: 2.92,
        drip_ph: 5.8,
        sunrise: '06:14',
        sunset: '19:42',
        solar_rad: 1820,
        avg_temp: 22.8,
        drain_ml: 390,
        drain_ec: 4.85,
        drain_ph: 6.2,
        drain_percent: 31.2,
        night_drop: 5.7,
        production_kg_m2: 4.1,
        avg_fruit_weight: 143,
        stem_growth_week: 18.2,
        stem_diameter_mm: 11.0,
        flowering_brush_num: 3,
        distance_to_crown: 17.3,
        leaf_length_cm: 42,
        fruits_per_plant: 28,
        fruit_load_m2: 8.5,
        leaves_before_cutting: 16,
        stem_length_mm: 3100,
        harvested_brushes_qty: 11,
      },
    ];

    sampleRecords.forEach((rec) => {
      this.data.hasabat.push({
        ...rec,
        id: this.data.nextHasabatId++,
      });
    });

    this.save();
  }

  public getTodayEnvData(date: string) {
    const record = this.data.hasabat
      .filter((r) => r.sane === date && (r.sunrise || r.solar_rad))
      .sort((a, b) => b.id - a.id)[0];
    return record
      ? {
          sunrise: record.sunrise,
          sunset: record.sunset,
          solar_rad: record.solar_rad,
          avg_temp: record.avg_temp,
        }
      : null;
  }

  public getRecords(filters: {
    sane?: string;
    parnik?: string | number;
    sektor?: string | number;
    date?: string;
    week?: string | number;
    month?: string;
    period?: string;
  }) {
    let list = [...this.data.hasabat];

    if (filters.sane) {
      list = list.filter((r) => r.sane === filters.sane);
    }
    if (filters.date) {
      list = list.filter((r) => r.sane === filters.date);
    }
    if (filters.parnik) {
      list = list.filter((r) => Number(r.parnik) === Number(filters.parnik));
    }
    if (filters.sektor) {
      list = list.filter((r) => Number(r.sektor) === Number(filters.sektor));
    }
    if (filters.month) {
      list = list.filter((r) => r.sane.startsWith(filters.month as string));
    }
    if (filters.period === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      list = list.filter((r) => r.sane === today);
    } else if (filters.period === 'weekly') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      list = list.filter((r) => r.sane >= sevenDaysAgo);
    }

    // Sort by sane DESC, wagt DESC
    return list.sort((a, b) => {
      if (b.sane !== a.sane) return b.sane.localeCompare(a.sane);
      return (b.wagt || '').localeCompare(a.wagt || '');
    });
  }

  public getRecordById(id: number) {
    return this.data.hasabat.find((r) => r.id === id);
  }

  public insertHasabat(record: Partial<HasabatRecord>): HasabatRecord {
    let barlag_no = record.barlag_no ? Number(record.barlag_no) : null;
    if (!barlag_no && record.wagt) {
      const hour = parseInt(record.wagt.split(':')[0], 10);
      if (!isNaN(hour)) {
        barlag_no = hour < 11 ? 1 : hour < 15 ? 2 : 3;
      }
    }

    const targetDate = record.sane || new Date().toISOString().split('T')[0];
    const targetParnik = Number(record.parnik) || 1;
    const targetSektor = Number(record.sektor) || 1;

    // Check if an existing record matches this date, parnik, sektor and exact time (or ID)
    const existing = record.id
      ? this.data.hasabat.find((r) => r.id === record.id)
      : this.data.hasabat.find(
          (r) =>
            r.sane === targetDate &&
            Number(r.parnik) === targetParnik &&
            Number(r.sektor) === targetSektor &&
            r.wagt === (record.wagt || '')
        );

    if (existing) {
      if (record.drip_ml !== undefined && record.drip_ml !== null) existing.drip_ml = Number(record.drip_ml);
      if (record.drain_ml !== undefined && record.drain_ml !== null) existing.drain_ml = Number(record.drain_ml);
      if (record.wagt) existing.wagt = record.wagt;
      if (record.solar_rad !== undefined && record.solar_rad !== null) existing.solar_rad = Number(record.solar_rad);
      if (record.avg_temp !== undefined && record.avg_temp !== null) existing.avg_temp = Number(record.avg_temp);
      if (record.sunrise) existing.sunrise = record.sunrise;
      if (record.sunset) existing.sunset = record.sunset;
      if (record.drip_ec !== undefined && record.drip_ec !== null) existing.drip_ec = Number(record.drip_ec);
      if (record.drip_ph !== undefined && record.drip_ph !== null) existing.drip_ph = Number(record.drip_ph);
      if (record.drain_ec !== undefined && record.drain_ec !== null) existing.drain_ec = Number(record.drain_ec);
      if (record.drain_ph !== undefined && record.drain_ph !== null) existing.drain_ph = Number(record.drain_ph);
      if (record.night_drop !== undefined && record.night_drop !== null) existing.night_drop = Number(record.night_drop);
      existing.barlag_no = barlag_no;

      if (existing.drip_ml && existing.drain_ml && existing.drip_ml > 0) {
        existing.drain_percent = Number(((existing.drain_ml / existing.drip_ml) * 100).toFixed(1));
      }

      this.save();
      return existing;
    }

    const id = this.data.nextHasabatId++;
    const drip_ml = record.drip_ml ? Number(record.drip_ml) : null;
    const drain_ml = record.drain_ml ? Number(record.drain_ml) : null;
    const drain_percent =
      drip_ml && drain_ml && drip_ml > 0
        ? Number(((drain_ml / drip_ml) * 100).toFixed(1))
        : null;

    const newRecord: HasabatRecord = {
      id,
      sane: targetDate,
      wagt: record.wagt || new Date().toTimeString().slice(0, 5),
      parnik: targetParnik,
      sektor: targetSektor,
      barlag_no,
      drip_ml,
      drip_ec: record.drip_ec !== undefined && record.drip_ec !== null ? Number(record.drip_ec) : null,
      drip_ph: record.drip_ph !== undefined && record.drip_ph !== null ? Number(record.drip_ph) : null,
      sunrise: record.sunrise || null,
      sunset: record.sunset || null,
      solar_rad: record.solar_rad !== undefined && record.solar_rad !== null ? Number(record.solar_rad) : null,
      avg_temp: record.avg_temp !== undefined && record.avg_temp !== null ? Number(record.avg_temp) : null,
      drain_ml,
      drain_ec: record.drain_ec !== undefined && record.drain_ec !== null ? Number(record.drain_ec) : null,
      drain_ph: record.drain_ph !== undefined && record.drain_ph !== null ? Number(record.drain_ph) : null,
      drain_percent,
      night_drop: record.night_drop !== undefined && record.night_drop !== null ? Number(record.night_drop) : null,
      production_kg_m2: record.production_kg_m2 !== undefined && record.production_kg_m2 !== null ? Number(record.production_kg_m2) : null,
      avg_fruit_weight: record.avg_fruit_weight !== undefined && record.avg_fruit_weight !== null ? Number(record.avg_fruit_weight) : null,
      stem_growth_week: record.stem_growth_week !== undefined && record.stem_growth_week !== null ? Number(record.stem_growth_week) : null,
      stem_diameter_mm: record.stem_diameter_mm !== undefined && record.stem_diameter_mm !== null ? Number(record.stem_diameter_mm) : null,
      flowering_brush_num: record.flowering_brush_num !== undefined && record.flowering_brush_num !== null ? Number(record.flowering_brush_num) : null,
      distance_to_crown: record.distance_to_crown !== undefined && record.distance_to_crown !== null ? Number(record.distance_to_crown) : null,
      leaf_length_cm: record.leaf_length_cm !== undefined && record.leaf_length_cm !== null ? Number(record.leaf_length_cm) : null,
      fruits_per_plant: record.fruits_per_plant !== undefined && record.fruits_per_plant !== null ? Number(record.fruits_per_plant) : null,
      fruit_load_m2: record.fruit_load_m2 !== undefined && record.fruit_load_m2 !== null ? Number(record.fruit_load_m2) : null,
      leaves_before_cutting: record.leaves_before_cutting !== undefined && record.leaves_before_cutting !== null ? Number(record.leaves_before_cutting) : null,
      stem_length_mm: record.stem_length_mm !== undefined && record.stem_length_mm !== null ? Number(record.stem_length_mm) : null,
      harvested_brushes_qty: record.harvested_brushes_qty !== undefined && record.harvested_brushes_qty !== null ? Number(record.harvested_brushes_qty) : null,
    };

    this.data.hasabat.push(newRecord);
    this.save();
    return newRecord;
  }

  public updateLaboratoriya(id: number, updates: {
    drip_ec?: number | null;
    drip_ph?: number | null;
    drain_ml?: number | null;
    drain_ec?: number | null;
    drain_ph?: number | null;
    night_drop?: number | null;
    barlag_no?: number | null;
  }) {
    const item = this.data.hasabat.find((r) => r.id === id);
    if (!item) return null;

    if (updates.drip_ec !== undefined) item.drip_ec = updates.drip_ec;
    if (updates.drip_ph !== undefined) item.drip_ph = updates.drip_ph;
    if (updates.drain_ml !== undefined) item.drain_ml = updates.drain_ml;
    if (updates.drain_ec !== undefined) item.drain_ec = updates.drain_ec;
    if (updates.drain_ph !== undefined) item.drain_ph = updates.drain_ph;
    if (updates.night_drop !== undefined) item.night_drop = updates.night_drop;
    if (updates.barlag_no !== undefined) item.barlag_no = updates.barlag_no;

    if (item.drip_ml && item.drain_ml && item.drip_ml > 0) {
      item.drain_percent = Number(((item.drain_ml / item.drip_ml) * 100).toFixed(1));
    }

    this.save();
    return item;
  }

  public updateAgronom(id: number, updates: Partial<HasabatRecord>) {
    const item = this.data.hasabat.find((r) => r.id === id);
    if (!item) return null;

    const fields: (keyof HasabatRecord)[] = [
      'production_kg_m2',
      'avg_fruit_weight',
      'stem_growth_week',
      'stem_diameter_mm',
      'flowering_brush_num',
      'distance_to_crown',
      'leaf_length_cm',
      'fruits_per_plant',
      'fruit_load_m2',
      'leaves_before_cutting',
      'stem_length_mm',
      'harvested_brushes_qty',
    ];

    fields.forEach((f) => {
      if (updates[f] !== undefined) {
        // @ts-ignore
        item[f] = updates[f] === null || updates[f] === '' ? null : Number(updates[f]);
      }
    });

    this.save();
    return item;
  }

  public updateRedaktor(id: number, updates: Partial<HasabatRecord>) {
    const item = this.data.hasabat.find((r) => r.id === id);
    if (!item) return null;

    Object.assign(item, updates);
    if (item.drip_ml && item.drain_ml && item.drip_ml > 0) {
      item.drain_percent = Number(((item.drain_ml / item.drip_ml) * 100).toFixed(1));
    }
    this.save();
    return item;
  }

  public deleteRecord(id: number): boolean {
    const idx = this.data.hasabat.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.data.hasabat.splice(idx, 1);
    this.save();
    return true;
  }

  public getKriteriya(yil: number, hepde: number): HepdelikKriteriya | null {
    return (
      this.data.hepdelik_kriteriyalar.find(
        (k) => Number(k.yil) === Number(yil) && Number(k.hepde) === Number(hepde)
      ) || null
    );
  }

  public getAllKriteriyalar(): HepdelikKriteriya[] {
    return [...this.data.hepdelik_kriteriyalar].sort((a, b) => {
      if (b.yil !== a.yil) return b.yil - a.yil;
      return b.hepde - a.hepde;
    });
  }

  public setKriteriya(kriteriya: Omit<HepdelikKriteriya, 'id'>): HepdelikKriteriya {
    const existingIndex = this.data.hepdelik_kriteriyalar.findIndex(
      (k) => Number(k.yil) === Number(kriteriya.yil) && Number(k.hepde) === Number(kriteriya.hepde)
    );

    if (existingIndex >= 0) {
      this.data.hepdelik_kriteriyalar[existingIndex] = {
        ...this.data.hepdelik_kriteriyalar[existingIndex],
        ...kriteriya,
      };
      this.save();
      return this.data.hepdelik_kriteriyalar[existingIndex];
    } else {
      const newCrit: HepdelikKriteriya = {
        id: this.data.nextKriteriyaId++,
        ...kriteriya,
      };
      this.data.hepdelik_kriteriyalar.push(newCrit);
      this.save();
      return newCrit;
    }
  }
}

export const db = new ParnikDatabase();
