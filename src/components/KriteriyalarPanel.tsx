import React, { useState } from 'react';
import { HepdelikKriteriya } from '../types';
import { OfflineStorageService } from '../services/offlineStorage';
import { 
  Settings, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  Sliders, 
  Calendar,
  AlertCircle,
  Moon,
  Sun,
  Droplets,
  Edit2
} from 'lucide-react';

interface KriteriyalarPanelProps {
  kriteriyalar: HepdelikKriteriya[];
  onCriteriaSaved: () => void;
}

export const KriteriyalarPanel: React.FC<KriteriyalarPanelProps> = ({
  kriteriyalar,
  onCriteriaSaved,
}) => {
  const currentYear = new Date().getFullYear();
  // Calculate current week
  const now = new Date();
  const firstDayOfYear = new Date(currentYear, 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const currentWeek = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

  const [yil, setYil] = useState<number>(currentYear);
  const [hepde, setHepde] = useState<number>(currentWeek);

  // Form thresholds
  // 1. Besin (Drip)
  const [besinPhMin, setBesinPhMin] = useState<string>('5.5');
  const [besinPhMax, setBesinPhMax] = useState<string>('6.2');
  const [besinEcMin, setBesinEcMin] = useState<string>('2.8');
  const [besinEcMax, setBesinEcMax] = useState<string>('3.2');

  // 2. Drenaž (Drain pH & EC)
  const [drenajPhMin, setDrenajPhMin] = useState<string>('5.8');
  const [drenajPhMax, setDrenajPhMax] = useState<string>('6.5');
  const [drenajEcMin, setDrenajEcMin] = useState<string>('4.5');
  const [drenajEcMax, setDrenajEcMax] = useState<string>('5.5');

  // 3. Pomidor görnüşleri boýunça aýratyn drenaž mukdary (ml)
  // 1-2-4 parnikler: Hoşa pomidor
  const [drenajMlHosaMin, setDrenajMlHosaMin] = useState<string>('300');
  const [drenajMlHosaMax, setDrenajMlHosaMax] = useState<string>('450');

  // 3-5 parnikler: Gülgüne pomidor
  const [drenajMlGulguneMin, setDrenajMlGulguneMin] = useState<string>('320');
  const [drenajMlGulguneMax, setDrenajMlGulguneMax] = useState<string>('500');

  // 4. Daşky gurşaw & Gijeki şertler
  // Gijeki ýeňleme (%)
  const [gijekiYenlemeMin, setGijekiYenlemeMin] = useState<string>('3');
  const [gijekiYenlemeMax, setGijekiYenlemeMax] = useState<string>('8');

  // Gün radiasiýasy (J/cm²)
  const [radiasiyaMin, setRadiasiyaMin] = useState<string>('1200');
  const [radiasiyaMax, setRadiasiyaMax] = useState<string>('2400');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const parseVal = (val: string) => {
      const v = parseFloat(val);
      return isNaN(v) ? null : v;
    };

    const payload: HepdelikKriteriya = {
      yil: Number(yil),
      hepde: Number(hepde),
      besin_ph_min: parseFloat(besinPhMin),
      besin_ph_max: parseFloat(besinPhMax),
      besin_ec_min: parseFloat(besinEcMin),
      besin_ec_max: parseFloat(besinEcMax),
      drenaj_ph_min: parseFloat(drenajPhMin),
      drenaj_ph_max: parseFloat(drenajPhMax),
      drenaj_ec_min: parseFloat(drenajEcMin),
      drenaj_ec_max: parseFloat(drenajEcMax),
      gijeki_yenleme_min: parseVal(gijekiYenlemeMin),
      gijeki_yenleme_max: parseVal(gijekiYenlemeMax),
      radiasiya_min: parseVal(radiasiyaMin),
      radiasiya_max: parseVal(radiasiyaMax),
      drenaj_ml_hosa_min: parseVal(drenajMlHosaMin),
      drenaj_ml_hosa_max: parseVal(drenajMlHosaMax),
      drenaj_ml_gulgune_min: parseVal(drenajMlGulguneMin),
      drenaj_ml_gulgune_max: parseVal(drenajMlGulguneMax),
    };

    if (!navigator.onLine) {
      OfflineStorageService.saveCriteriaOffline(payload);
      setStatusMessage(`${hepde}-nji hepdäniň kriteriýasy OFLAÝN (ýerli) ýatda saklandy!`);
      onCriteriaSaved();
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/kriteriyalar/yaz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage(data.message || `${hepde}-nji hepdäniň kriteriýasy ýazyldy.`);
        onCriteriaSaved();
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (e) {
      console.warn('Save criteria server failed, saving locally:', e);
      OfflineStorageService.saveCriteriaOffline(payload);
      setStatusMessage(`${hepde}-nji hepdäniň kriteriýasy OFLAÝN (ýerli) ýatda saklandy!`);
      onCriteriaSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditWeek = (k: HepdelikKriteriya) => {
    setYil(k.yil);
    setHepde(k.hepde);
    setBesinPhMin(String(k.besin_ph_min));
    setBesinPhMax(String(k.besin_ph_max));
    setBesinEcMin(String(k.besin_ec_min));
    setBesinEcMax(String(k.besin_ec_max));
    setDrenajPhMin(String(k.drenaj_ph_min));
    setDrenajPhMax(String(k.drenaj_ph_max));
    setDrenajEcMin(String(k.drenaj_ec_min));
    setDrenajEcMax(String(k.drenaj_ec_max));

    setGijekiYenlemeMin(k.gijeki_yenleme_min != null ? String(k.gijeki_yenleme_min) : '3');
    setGijekiYenlemeMax(k.gijeki_yenleme_max != null ? String(k.gijeki_yenleme_max) : '8');
    setRadiasiyaMin(k.radiasiya_min != null ? String(k.radiasiya_min) : '1200');
    setRadiasiyaMax(k.radiasiya_max != null ? String(k.radiasiya_max) : '2400');

    setDrenajMlHosaMin(k.drenaj_ml_hosa_min != null ? String(k.drenaj_ml_hosa_min) : '300');
    setDrenajMlHosaMax(k.drenaj_ml_hosa_max != null ? String(k.drenaj_ml_hosa_max) : '450');
    setDrenajMlGulguneMin(k.drenaj_ml_gulgune_min != null ? String(k.drenaj_ml_gulgune_min) : '320');
    setDrenajMlGulguneMax(k.drenaj_ml_gulgune_max != null ? String(k.drenaj_ml_gulgune_max) : '500');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              Hepdelik Kriteriýalar Sazlamasy
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Gündelik suwaryş, iýmitlendiriş, drenaž, gijeki ýeňleme we radiasiýa üçin hepdäniň kadasyny kesgitlemek.
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs text-emerald-800">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Häzirki wagt: <strong>{currentYear}-njy ýyl, {currentWeek}-nji hepde</strong></span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            Täze Hepdäniň Kriteriýalaryny Girizmek / Üýtgetmek
          </h3>
          <span className="text-xs text-slate-400">
            Kriteriýalar bozulanda Laboratoriýa we Monitoring awtomatik duýduryş berýär
          </span>
        </div>

        {/* Ýyl we Hepde saýlawy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ýyl</label>
            <input
              type="number"
              value={yil}
              onChange={(e) => setYil(Number(e.target.value))}
              required
              className="w-full bg-white border rounded-lg p-2 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hepde Belgisi (1 — 53)</label>
            <input
              type="number"
              min="1"
              max="53"
              value={hepde}
              onChange={(e) => setHepde(Number(e.target.value))}
              required
              className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-mono font-bold text-emerald-700"
            />
          </div>
        </div>

        {/* 4 Main Criteria Blocks in a Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Besin Suwy (Drip / Iýmit Ergin) */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              1. Besin Suwy (Drip / Iýmit Ergin) Kadalary
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Besin pH Min</label>
                <input
                  type="number"
                  step="0.01"
                  value={besinPhMin}
                  onChange={(e) => setBesinPhMin(e.target.value)}
                  required
                  className="w-full bg-white border border-blue-300 rounded p-1.5 font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Besin pH Max</label>
                <input
                  type="number"
                  step="0.01"
                  value={besinPhMax}
                  onChange={(e) => setBesinPhMax(e.target.value)}
                  required
                  className="w-full bg-white border border-blue-300 rounded p-1.5 font-mono text-center font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-slate-600 mb-1">Besin EC Min (mS/cm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={besinEcMin}
                  onChange={(e) => setBesinEcMin(e.target.value)}
                  required
                  className="w-full bg-white border border-blue-300 rounded p-1.5 font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Besin EC Max (mS/cm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={besinEcMax}
                  onChange={(e) => setBesinEcMax(e.target.value)}
                  required
                  className="w-full bg-white border border-blue-300 rounded p-1.5 font-mono text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* 2. Drenaž Suwy (Drain pH & EC) */}
          <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              2. Çykýan Drenaž Suwy (pH & EC) Kadalary
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Drenaž pH Min</label>
                <input
                  type="number"
                  step="0.01"
                  value={drenajPhMin}
                  onChange={(e) => setDrenajPhMin(e.target.value)}
                  required
                  className="w-full bg-white border border-purple-300 rounded p-1.5 font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Drenaž pH Max</label>
                <input
                  type="number"
                  step="0.01"
                  value={drenajPhMax}
                  onChange={(e) => setDrenajPhMax(e.target.value)}
                  required
                  className="w-full bg-white border border-purple-300 rounded p-1.5 font-mono text-center font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-slate-600 mb-1">Drenaž EC Min (mS/cm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={drenajEcMin}
                  onChange={(e) => setDrenajEcMin(e.target.value)}
                  required
                  className="w-full bg-white border border-purple-300 rounded p-1.5 font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Drenaž EC Max (mS/cm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={drenajEcMax}
                  onChange={(e) => setDrenajEcMax(e.target.value)}
                  required
                  className="w-full bg-white border border-purple-300 rounded p-1.5 font-mono text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* 3. Pomidor Görnüşleri Boýunça Aýratyn Drenaž Mukdary (ml) */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-emerald-600" />
              3. Parnikler Boýunça Aýratyn Drenaž Mukdary (ml)
            </h4>

            {/* Hoşa Pomidor (1-2-4 Parnikler) */}
            <div className="bg-white p-3 rounded-lg border border-emerald-300/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  🍅 1, 2, 4-nji Parnikler (Hoşa Pomidor)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  P-1, P-2, P-4
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-0.5">Drenaž Min (ml)</label>
                  <input
                    type="number"
                    step="1"
                    value={drenajMlHosaMin}
                    onChange={(e) => setDrenajMlHosaMin(e.target.value)}
                    placeholder="300"
                    className="w-full bg-slate-50 border border-emerald-300 rounded p-1.5 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">Drenaž Max (ml)</label>
                  <input
                    type="number"
                    step="1"
                    value={drenajMlHosaMax}
                    onChange={(e) => setDrenajMlHosaMax(e.target.value)}
                    placeholder="450"
                    className="w-full bg-slate-50 border border-emerald-300 rounded p-1.5 font-mono text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Gülgüne Pomidor (3-5 Parnikler) */}
            <div className="bg-white p-3 rounded-lg border border-pink-300/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  🌸 3 we 5-nji Parnikler (Gülgüne Pomidor)
                </span>
                <span className="text-[10px] bg-pink-100 text-pink-800 font-bold px-2 py-0.5 rounded">
                  P-3, P-5
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-0.5">Drenaž Min (ml)</label>
                  <input
                    type="number"
                    step="1"
                    value={drenajMlGulguneMin}
                    onChange={(e) => setDrenajMlGulguneMin(e.target.value)}
                    placeholder="320"
                    className="w-full bg-slate-50 border border-pink-300 rounded p-1.5 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">Drenaž Max (ml)</label>
                  <input
                    type="number"
                    step="1"
                    value={drenajMlGulguneMax}
                    onChange={(e) => setDrenajMlGulguneMax(e.target.value)}
                    placeholder="500"
                    className="w-full bg-slate-50 border border-pink-300 rounded p-1.5 font-mono text-center font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Daşky Gurşaw & Gijeki Ýeňleme */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-600" />
              4. Gijeki Ýeňleme we Gün Radiasiýasy Kadalary
            </h4>

            {/* Gijeki Ýeňleme (Night drop %) */}
            <div className="bg-white p-3 rounded-lg border border-amber-300/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  Gijeki Ýeňleme (Night Drop %)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Gijeki agram ýitgisi</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-0.5">Gijeki Min (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gijekiYenlemeMin}
                    onChange={(e) => setGijekiYenlemeMin(e.target.value)}
                    placeholder="3.0"
                    className="w-full bg-slate-50 border border-amber-300 rounded p-1.5 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">Gijeki Max (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gijekiYenlemeMax}
                    onChange={(e) => setGijekiYenlemeMax(e.target.value)}
                    placeholder="8.0"
                    className="w-full bg-slate-50 border border-amber-300 rounded p-1.5 font-mono text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Gün Radiasiýasy (J/cm²) */}
            <div className="bg-white p-3 rounded-lg border border-amber-300/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Gün Radiasiýasy (J/cm²)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Günüň jemi energiýasy</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-0.5">Radiasiýa Min (J/cm²)</label>
                  <input
                    type="number"
                    step="10"
                    value={radiasiyaMin}
                    onChange={(e) => setRadiasiyaMin(e.target.value)}
                    placeholder="1200"
                    className="w-full bg-slate-50 border border-amber-300 rounded p-1.5 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">Radiasiýa Max (J/cm²)</label>
                  <input
                    type="number"
                    step="10"
                    value={radiasiyaMax}
                    onChange={(e) => setRadiasiyaMax(e.target.value)}
                    placeholder="2400"
                    className="w-full bg-slate-50 border border-amber-300 rounded p-1.5 font-mono text-center font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="p-3 bg-slate-50 border rounded-lg text-[11px] text-slate-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            <strong>Bellik:</strong> Eger saýlanan ýyl we hepde öň bazada bar bolsa, täze bahalar bilen üstünlikli täzelener. Hemme kriteriýalar offline (aragatnaşyksyz) wagtynda hem ýerli ýatda goralýar.
          </span>
        </div>

        <div className="pt-3 border-t flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Ýazylýar...' : 'Kriteriýalary Ýatda Sakla'}</span>
          </button>
        </div>
      </form>

      {/* All defined criteria table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
          <span>Bazadaky Hepdelik Kriteriýalar Sanawy</span>
          <span className="text-xs font-normal text-slate-500">Jemi: {kriteriyalar.length} hepde</span>
        </h3>

        {kriteriyalar.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Entek kriteriýa girizilmedi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Ýyl / Hepde</th>
                  <th className="py-2.5 px-3 text-center">Besin pH</th>
                  <th className="py-2.5 px-3 text-center">Besin EC</th>
                  <th className="py-2.5 px-3 text-center">Drenaž pH</th>
                  <th className="py-2.5 px-3 text-center">Drenaž EC</th>
                  <th className="py-2.5 px-3 text-center">Hoşa Drenaž ml (P1,2,4)</th>
                  <th className="py-2.5 px-3 text-center">Gülgüne Drenaž ml (P3,5)</th>
                  <th className="py-2.5 px-3 text-center">Gijeki Ýeňleme (%)</th>
                  <th className="py-2.5 px-3 text-center">Radiasiýa (J/cm²)</th>
                  <th className="py-2.5 px-3 text-right">Hereket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {kriteriyalar.map((k) => (
                  <tr key={`${k.yil}-${k.hepde}`} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-sans font-bold text-slate-900 whitespace-nowrap">
                      {k.yil} ý. — <span className="text-emerald-700 font-black">{k.hepde}-nji</span> hepde
                    </td>
                    <td className="py-3 px-3 text-center text-blue-700 whitespace-nowrap font-bold">
                      {k.besin_ph_min} — {k.besin_ph_max}
                    </td>
                    <td className="py-3 px-3 text-center text-blue-700 whitespace-nowrap font-bold">
                      {k.besin_ec_min} — {k.besin_ec_max}
                    </td>
                    <td className="py-3 px-3 text-center text-purple-700 whitespace-nowrap font-bold">
                      {k.drenaj_ph_min} — {k.drenaj_ph_max}
                    </td>
                    <td className="py-3 px-3 text-center text-purple-700 whitespace-nowrap font-bold">
                      {k.drenaj_ec_min} — {k.drenaj_ec_max}
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-800 whitespace-nowrap font-bold">
                      {k.drenaj_ml_hosa_min != null && k.drenaj_ml_hosa_max != null
                        ? `${k.drenaj_ml_hosa_min} — ${k.drenaj_ml_hosa_max} ml`
                        : <span className="text-slate-400 font-sans text-[11px]">—</span>}
                    </td>
                    <td className="py-3 px-3 text-center text-pink-700 whitespace-nowrap font-bold">
                      {k.drenaj_ml_gulgune_min != null && k.drenaj_ml_gulgune_max != null
                        ? `${k.drenaj_ml_gulgune_min} — ${k.drenaj_ml_gulgune_max} ml`
                        : <span className="text-slate-400 font-sans text-[11px]">—</span>}
                    </td>
                    <td className="py-3 px-3 text-center text-indigo-700 whitespace-nowrap font-bold">
                      {k.gijeki_yenleme_min != null && k.gijeki_yenleme_max != null
                        ? `${k.gijeki_yenleme_min}% — ${k.gijeki_yenleme_max}%`
                        : <span className="text-slate-400 font-sans text-[11px]">—</span>}
                    </td>
                    <td className="py-3 px-3 text-center text-amber-700 whitespace-nowrap font-bold">
                      {k.radiasiya_min != null && k.radiasiya_max != null
                        ? `${k.radiasiya_min} — ${k.radiasiya_max}`
                        : <span className="text-slate-400 font-sans text-[11px]">—</span>}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap font-sans">
                      <button
                        onClick={() => handleEditWeek(k)}
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold p-1 hover:bg-blue-50 rounded"
                        title="Bu hepdäniň kriteriýasyny düzet"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Düzet</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
