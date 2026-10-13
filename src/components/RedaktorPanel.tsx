import React, { useState, useMemo } from 'react';
import { HasabatRecord } from '../types';
import { OfflineStorageService } from '../services/offlineStorage';
import { 
  SlidersHorizontal, 
  Trash2, 
  Edit3, 
  Filter, 
  Download, 
  Check, 
  X, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

interface RedaktorPanelProps {
  records: HasabatRecord[];
  onRecordUpdated: () => void;
}

export const RedaktorPanel: React.FC<RedaktorPanelProps> = ({
  records,
  onRecordUpdated,
}) => {
  const [filterSane, setFilterSane] = useState<string>('');
  const [filterParnik, setFilterParnik] = useState<string>('');
  const [filterSektor, setFilterSektor] = useState<string>('');

  const [editingRecord, setEditingRecord] = useState<HasabatRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterSane && r.sane !== filterSane) return false;
      if (filterParnik && Number(r.parnik) !== Number(filterParnik)) return false;
      if (filterSektor && Number(r.sektor) !== Number(filterSektor)) return false;
      return true;
    });
  }, [records, filterSane, filterParnik, filterSektor]);

  const handleDelete = async (id: number) => {
    setIsProcessing(true);
    if (!navigator.onLine) {
      OfflineStorageService.deleteRecordOffline(id);
      setDeletingId(null);
      onRecordUpdated();
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch(`/api/redaktor/delete/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        onRecordUpdated();
      } else {
        throw new Error('Server not ok');
      }
    } catch (e) {
      console.warn('Delete server failed, deleting locally:', e);
      OfflineStorageService.deleteRecordOffline(id);
      setDeletingId(null);
      onRecordUpdated();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsProcessing(true);

    if (!navigator.onLine) {
      OfflineStorageService.updateRecordOffline(editingRecord.id, editingRecord, 'UPDATE_ANY_RECORD');
      setEditingRecord(null);
      onRecordUpdated();
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch('/api/redaktor/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRecord),
      });

      if (res.ok) {
        setEditingRecord(null);
        onRecordUpdated();
      } else {
        throw new Error('Server not ok');
      }
    } catch (e) {
      console.warn('Update server failed, saving locally:', e);
      OfflineStorageService.updateRecordOffline(editingRecord.id, editingRecord, 'UPDATE_ANY_RECORD');
      setEditingRecord(null);
      onRecordUpdated();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      'ID', 'Sene', 'Wagt', 'Parnik', 'Sektor', 
      'Drip_ml', 'Drip_EC', 'Drip_pH', 'Drain_ml', 'Drain_EC', 'Drain_pH', 'Drain_Percent',
      'Solar_Rad', 'Avg_Temp', 'Night_Drop'
    ];
    const rows = records.map((r) => [
      r.id, r.sane, r.wagt, r.parnik, r.sektor,
      r.drip_ml ?? '', r.drip_ec ?? '', r.drip_ph ?? '',
      r.drain_ml ?? '', r.drain_ec ?? '', r.drain_ph ?? '', r.drain_percent ?? '',
      r.solar_rad ?? '', r.avg_temp ?? '', r.night_drop ?? ''
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parnik_hasabat_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-slate-700" />
            Redaktor we Baza Dolandyryş Paneli
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Bazadaky ähli hasabat ýazgylaryny gözlemek, üýtgetmek, ýalňyşlary düzetmek we gerekmejek setirleri pozmak.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>CSV Экспорт</span>
        </button>
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

        <div className="flex items-center space-x-1.5">
          <label className="text-slate-500">Parnik:</label>
          <select
            value={filterParnik}
            onChange={(e) => setFilterParnik(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs focus:bg-white focus:outline-none"
          >
            <option value="">Hemmesi</option>
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
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs focus:bg-white focus:outline-none"
          >
            <option value="">Hemmesi</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>{s}-nji Sektor</option>
            ))}
          </select>
        </div>

        {(filterSane || filterParnik || filterSektor) && (
          <button
            onClick={() => {
              setFilterSane('');
              setFilterParnik('');
              setFilterSektor('');
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline"
          >
            Arassala
          </button>
        )}

        <div className="ml-auto text-slate-400">
          Jemi: <strong>{filtered.length}</strong> setir
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b font-semibold">
                <th className="py-3 px-3">ID</th>
                <th className="py-3 px-3">Sene</th>
                <th className="py-3 px-3">Wagt</th>
                <th className="py-3 px-3">Parnik</th>
                <th className="py-3 px-3">Sektor</th>
                <th className="py-3 px-3 text-blue-700">Drip (ml)</th>
                <th className="py-3 px-3">Drip EC</th>
                <th className="py-3 px-3">Drip pH</th>
                <th className="py-3 px-3 text-purple-700">Drenaž (ml)</th>
                <th className="py-3 px-3">Drenaž EC</th>
                <th className="py-3 px-3">Drenaž pH</th>
                <th className="py-3 px-3 text-emerald-700">Drenaž %</th>
                <th className="py-3 px-3 text-center">Hereketler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-400">#{rec.id}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{rec.sane}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{rec.wagt}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">{rec.parnik}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">{rec.sektor}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{rec.drip_ml ?? '-'}</td>
                  <td className="py-2.5 px-3 font-mono">{rec.drip_ec ?? '-'}</td>
                  <td className="py-2.5 px-3 font-mono">{rec.drip_ph ?? '-'}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-purple-700">{rec.drain_ml ?? '-'}</td>
                  <td className="py-2.5 px-3 font-mono">{rec.drain_ec ?? '-'}</td>
                  <td className="py-2.5 px-3 font-mono">{rec.drain_ph ?? '-'}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                    {rec.drain_percent ? `${rec.drain_percent}%` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => setEditingRecord({ ...rec })}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition"
                        title="Üýtget"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingId(rec.id)}
                        className="p-1.5 rounded hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition"
                        title="Poz"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                Setiri Üýtgetmek (ID #{editingRecord.id})
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sene</label>
                  <input
                    type="date"
                    value={editingRecord.sane}
                    onChange={(e) => setEditingRecord({ ...editingRecord, sane: e.target.value })}
                    required
                    className="w-full bg-slate-50 border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Wagt</label>
                  <input
                    type="time"
                    value={editingRecord.wagt}
                    onChange={(e) => setEditingRecord({ ...editingRecord, wagt: e.target.value })}
                    required
                    className="w-full bg-slate-50 border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Parnik</label>
                  <input
                    type="number"
                    value={editingRecord.parnik}
                    onChange={(e) => setEditingRecord({ ...editingRecord, parnik: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-50 border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sektor</label>
                  <input
                    type="number"
                    value={editingRecord.sektor}
                    onChange={(e) => setEditingRecord({ ...editingRecord, sektor: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-50 border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t pt-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Drip (ml)</label>
                  <input
                    type="number"
                    value={editingRecord.drip_ml ?? ''}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        drip_ml: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-50 border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Drip EC</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.drip_ec ?? ''}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        drip_ec: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-50 border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Drip pH</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.drip_ph ?? ''}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        drip_ph: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-50 border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t pt-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Drenaž (ml)</label>
                  <input
                    type="number"
                    value={editingRecord.drain_ml ?? ''}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        drain_ml: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-50 border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Drenaž EC</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.drain_ec ?? ''}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        drain_ec: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-50 border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Drenaž pH</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.drain_ph ?? ''}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        drain_ph: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-50 border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Ýatyr
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  {isProcessing ? 'Ýatda saklanylýar...' : 'Üýtgeşmäni Ýatda Sakla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-2xl max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Setiri pozmak isleýärsiňizmi?</h3>
              <p className="text-xs text-slate-500 mt-1">
                ID #{deletingId} bolan hasabat setiri bazadan bütinleý pozular. Bu hereketi yzyna gaýtaryp bolmaýar.
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Ýatyr
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                {isProcessing ? 'Pozulýar...' : 'Hawa, Poz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
