import React, { useState, useMemo } from 'react';
import { HasabatRecord, HepdelikKriteriya } from '../types';
import { OfflineStorageService } from '../services/offlineStorage';
import { 
  Wheat, 
  Save, 
  CheckCircle2, 
  Filter, 
  Sprout, 
  Ruler, 
  Scale, 
  Layers,
  Settings,
  Sliders,
  Calendar,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { KriteriyalarPanel } from './KriteriyalarPanel';

interface AgronomPanelProps {
  records: HasabatRecord[];
  onRecordUpdated: () => void;
  kriteriyalar?: HepdelikKriteriya[];
  onCriteriaSaved?: () => void;
}

export const AgronomPanel: React.FC<AgronomPanelProps> = ({
  records,
  onRecordUpdated,
  kriteriyalar = [],
  onCriteriaSaved = () => {},
}) => {
  const [agronomTab, setAgronomTab] = useState<'biometriya' | 'kriteriyalar'>('biometriya');
  const [filterParnik, setFilterParnik] = useState<string>('');
  const [filterSektor, setFilterSektor] = useState<string>('');
  const [editingRows, setEditingRows] = useState<{ [id: number]: Partial<HasabatRecord> }>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterParnik && Number(r.parnik) !== Number(filterParnik)) return false;
      if (filterSektor && Number(r.sektor) !== Number(filterSektor)) return false;
      return true;
    });
  }, [records, filterParnik, filterSektor]);

  const handleFieldChange = (id: number, field: keyof HasabatRecord, value: string) => {
    setEditingRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value === '' ? null : value,
      },
    }));
  };

  const handleSave = async (record: HasabatRecord) => {
    const edits = editingRows[record.id] || {};
    setSavingId(record.id);

    const payload = {
      id: record.id,
      production_kg_m2: edits.production_kg_m2 !== undefined ? edits.production_kg_m2 : record.production_kg_m2,
      avg_fruit_weight: edits.avg_fruit_weight !== undefined ? edits.avg_fruit_weight : record.avg_fruit_weight,
      stem_growth_week: edits.stem_growth_week !== undefined ? edits.stem_growth_week : record.stem_growth_week,
      stem_diameter_mm: edits.stem_diameter_mm !== undefined ? edits.stem_diameter_mm : record.stem_diameter_mm,
      flowering_brush_num: edits.flowering_brush_num !== undefined ? edits.flowering_brush_num : record.flowering_brush_num,
      distance_to_crown: edits.distance_to_crown !== undefined ? edits.distance_to_crown : record.distance_to_crown,
      leaf_length_cm: edits.leaf_length_cm !== undefined ? edits.leaf_length_cm : record.leaf_length_cm,
      fruits_per_plant: edits.fruits_per_plant !== undefined ? edits.fruits_per_plant : record.fruits_per_plant,
      fruit_load_m2: edits.fruit_load_m2 !== undefined ? edits.fruit_load_m2 : record.fruit_load_m2,
      leaves_before_cutting: edits.leaves_before_cutting !== undefined ? edits.leaves_before_cutting : record.leaves_before_cutting,
      stem_length_mm: edits.stem_length_mm !== undefined ? edits.stem_length_mm : record.stem_length_mm,
      harvested_brushes_qty: edits.harvested_brushes_qty !== undefined ? edits.harvested_brushes_qty : record.harvested_brushes_qty,
    };

    if (!navigator.onLine) {
      OfflineStorageService.updateRecordOffline(record.id, payload, 'UPDATE_AGRONOM_RECORD');
      setSuccessId(record.id);
      setTimeout(() => setSuccessId(null), 3000);
      onRecordUpdated();
      setSavingId(null);
      return;
    }

    try {
      const res = await fetch('/api/agronom/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessId(record.id);
        setTimeout(() => setSuccessId(null), 3000);
        onRecordUpdated();
      } else {
        throw new Error('Server not ok');
      }
    } catch (e) {
      console.warn('Agronom save error, fallback to offline:', e);
      OfflineStorageService.updateRecordOffline(record.id, payload, 'UPDATE_AGRONOM_RECORD');
      setSuccessId(record.id);
      setTimeout(() => setSuccessId(null), 3000);
      onRecordUpdated();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Agronom Sub-Tabs (Biometriýa & Kriteriýalar) */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-xl shadow-sm space-x-2">
        <button
          type="button"
          onClick={() => setAgronomTab('biometriya')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            agronomTab === 'biometriya'
              ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-500'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wheat className="w-4 h-4" />
          <span>Ösümlik Biometriýasy we Hasyl</span>
        </button>

        <button
          type="button"
          onClick={() => setAgronomTab('kriteriyalar')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            agronomTab === 'kriteriyalar'
              ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-500'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Hepdelik Dökün Kriteriýalary</span>
          {kriteriyalar.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              agronomTab === 'kriteriyalar' ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {kriteriyalar.length}
            </span>
          )}
        </button>
      </div>

      {agronomTab === 'kriteriyalar' ? (
        <KriteriyalarPanel
          kriteriyalar={kriteriyalar}
          onCriteriaSaved={onCriteriaSaved}
        />
      ) : (
        <>
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Wheat className="w-5 h-5 text-amber-600" />
              Agronom Kömekçisi Paneli: Ösümlik Biometriýasy we Hasyl
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pomidoryň / ekinleriň baldagyň ösüşi, diametri, güllän hoşa sany, ýaprak uzynlygy we hasyl görkezijileri.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Parnik:</span>
            <select
              value={filterParnik}
              onChange={(e) => setFilterParnik(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-semibold focus:outline-none"
            >
              <option value="">Ähli Parnikler</option>
              {[1, 2, 3, 4, 5, 6].map((p) => (
                <option key={p} value={p}>{p}-nji Parnik</option>
              ))}
            </select>

            <span className="text-slate-500 ml-2">Sektor:</span>
            <select
              value={filterSektor}
              onChange={(e) => setFilterSektor(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-semibold focus:outline-none"
            >
              <option value="">Ähli Sektorlar</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>{s}-nji Sektor</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b font-semibold">
                <th className="py-3 px-3">Sene / Ýer</th>
                <th className="py-3 px-2">Hasyl (kg/m²)</th>
                <th className="py-3 px-2">Ort. Agram (g)</th>
                <th className="py-3 px-2">Hepdelik Ösüş (cm)</th>
                <th className="py-3 px-2">Diametr (mm)</th>
                <th className="py-3 px-2">Güllän Hoşa</th>
                <th className="py-3 px-2">Täçden Güle (cm)</th>
                <th className="py-3 px-2">Ýaprak (cm)</th>
                <th className="py-3 px-2">Düýp/Miwe</th>
                <th className="py-3 px-2">Agram m²</th>
                <th className="py-3 px-2">Ýygylan Hoşa</th>
                <th className="py-3 px-3 text-center">Hereket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.map((rec) => {
                const edits = editingRows[rec.id] || {};
                const isSaving = savingId === rec.id;
                const isSuccess = successId === rec.id;

                const val = (f: keyof HasabatRecord): string | number => {
                  const v = edits[f] !== undefined ? edits[f] : rec[f];
                  if (typeof v === 'string' || typeof v === 'number') return v;
                  return '';
                };

                return (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{rec.sane}</div>
                      <div className="text-[10px] text-emerald-700 font-bold">
                        P-{rec.parnik} / S-{rec.sektor}
                      </div>
                    </td>

                    {/* Hasyl kg/m2 */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="4.2"
                        value={val('production_kg_m2') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'production_kg_m2', e.target.value)}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Ort Agram g */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="145"
                        value={val('avg_fruit_weight') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'avg_fruit_weight', e.target.value)}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Hepdelik ösüş cm */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="18.5"
                        value={val('stem_growth_week') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'stem_growth_week', e.target.value)}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono font-bold text-blue-700 focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Diametr mm */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="11.2"
                        value={val('stem_diameter_mm') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'stem_diameter_mm', e.target.value)}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Güllän hoşa */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        placeholder="3"
                        value={val('flowering_brush_num') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'flowering_brush_num', e.target.value)}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Täçden güle cm */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="17.5"
                        value={val('distance_to_crown') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'distance_to_crown', e.target.value)}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Ýaprak cm */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="42"
                        value={val('leaf_length_cm') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'leaf_length_cm', e.target.value)}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Düýp/miwe */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        placeholder="28"
                        value={val('fruits_per_plant') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'fruits_per_plant', e.target.value)}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Miwe agram m2 */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="8.5"
                        value={val('fruit_load_m2') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'fruit_load_m2', e.target.value)}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Ýygylan hoşa */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        placeholder="12"
                        value={val('harvested_brushes_qty') ?? ''}
                        onChange={(e) => handleFieldChange(rec.id, 'harvested_brushes_qty', e.target.value)}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-mono text-emerald-800 font-bold focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Action */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleSave(rec)}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 mx-auto ${
                          isSuccess
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                        }`}
                      >
                        {isSuccess ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ýazyldy</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSaving ? '...' : 'Ýatda Sakla'}</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
