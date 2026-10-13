export const PARNIK_LIST = [1, 2, 3, 4, 5];

export interface ParnikInfo {
  parnik: number;
  variety: 'Hoşa' | 'Gülgüne';
  varietyLabel: string;
  sectorCount: number;
  sectors: number[];
}

export const getParnikConfig = (parnikId: number): ParnikInfo => {
  const p = Number(parnikId) || 1;
  const isHosa = [1, 2, 4].includes(p);
  const variety: 'Hoşa' | 'Gülgüne' = isHosa ? 'Hoşa' : 'Gülgüne';
  // Parnik 1, 2, 4, 5: 4 sektor; Parnik 3: 5 sektor
  const sectorCount = p === 3 ? 5 : 4;
  const sectors = Array.from({ length: sectorCount }, (_, i) => i + 1);

  return {
    parnik: p,
    variety,
    varietyLabel: isHosa ? 'Hoşa Pomidor (P-1, 2, 4)' : 'Gülgüne Pomidor (P-3, 5)',
    sectorCount,
    sectors,
  };
};

export const getParnikSectors = (parnikId: number): number[] => {
  return Number(parnikId) === 3 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
};

export const BARLAG_ROUNDS = [
  { id: 1, name: '1-nji Barlag (Irden)', shortName: '1-nji Barlag', time: '09:00', period: 'Irden' },
  { id: 2, name: '2-nji Barlag (Günortan)', shortName: '2-nji Barlag', time: '13:00', period: 'Günortan' },
  { id: 3, name: '3-nji Barlag (Öýlän-Agşam)', shortName: '3-nji Barlag', time: '17:00', period: 'Öýlän' },
] as const;

export const determineBarlagNo = (wagt?: string, barlag_no?: number | null): 1 | 2 | 3 => {
  if (barlag_no && [1, 2, 3].includes(Number(barlag_no))) {
    return Number(barlag_no) as 1 | 2 | 3;
  }
  if (!wagt) return 1;
  const hour = parseInt(wagt.split(':')[0], 10);
  if (isNaN(hour)) return 1;
  if (hour < 11) return 1;
  if (hour < 15) return 2;
  return 3;
};

/**
 * Standard ISO week calculation helper
 */
export const getWeekNumber = (dateInput?: string | Date): { year: number; week: number; label: string } => {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) {
      const now = new Date();
      return { year: now.getFullYear(), week: 38, label: '38-nji hepde' };
    }
    const year = d.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return {
      year,
      week,
      label: `${week}-nji hepde`,
    };
  } catch {
    return { year: 2026, week: 38, label: '38-nji hepde' };
  }
};
