import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Laptop, CheckCircle, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already opened as installed standalone PWA app, show subtle status badge
  if (isInstalled) {
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-800/40 border border-emerald-600/40 text-[11px] text-emerald-300 font-medium">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>Gurlan (Oflaýn)</span>
      </div>
    );
  }

  // Chromium / Android / Desktop Install prompt
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition animate-pulse hover:animate-none"
        title="Programmany kompýutere ýa-da telefona gurup, internetsiz ulanyň"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Programmany Gur (Oflaýn)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-600/40 font-semibold text-xs transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Telefona Ýükle</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  iPhone / iPad-a Gurmak
                </h3>
                <button
                  onClick={() => setShowGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Programmany internetsiz işletmek we baş ekrana ikonka goşmak üçin Safari brauzerinde şu ädimleri ýerine ýetiriň:
              </p>

              <ol className="space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    1. <Share className="w-4 h-4 text-blue-600 inline" />
                  </span>
                  <span>
                    Aşakdaky Safari menýusyndan <strong>Paýlaş (Share)</strong> düwmesine basyň.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    2. <PlusSquare className="w-4 h-4 text-emerald-600 inline" />
                  </span>
                  <span>
                    Aşak süýşürip <strong>&quot;Baş ekrana goş&quot; (Add to Home Screen)</strong> saýlaň.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-emerald-600">3.</span>
                  <span>
                    Ýokarky sag burçdaky <strong>&quot;Goş&quot; (Add)</strong> düwmesine basyň. Programma telefona gurlar!
                  </span>
                </li>
              </ol>

              <button
                onClick={() => setShowGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 text-xs transition"
              >
                Düşnükli
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Generic fallback install prompt / instructions button
  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 border border-emerald-600/40 text-xs font-semibold transition"
        title="Oflaýn ulgama gurnamak barada"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Oflaýn Gur</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-emerald-600" />
                Oflaýn Tertipde (Internetsiz) Ulanmak
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Bu programma <strong>Progressive Web App (PWA)</strong> tehnologiýasy arkaly doly <strong>Oflaýn (internetsiz)</strong> işläp bilýär!
              </p>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Kompýutere ýa-da Telefona nähili gurmaly:
                </div>
                <p className="text-emerald-800">
                  Chrome ýa-da Edge brauzerinde ýokarky salgy setiriniň sag burçundaky <strong>Gurna (Install icon)</strong> belgisini basyp, programmany aýratyn programma hökmünde gurup bilersiňiz.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800">Internet ýok mahaly:</div>
                <p>
                  Siz islendik wagt internetsiz girip hasabat ýazyp, drenažlary belläp we grafikleri görüp bilersiňiz. Ähli täze ýazgylar telefonyňyzda ýa-da kompýuteriňizde ygtybarly saklanýar we internet birigeninde serwere awtomatiki geçirilýär.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 text-xs transition"
            >
              Ýap
            </button>
          </div>
        </div>
      )}
    </>
  );
};
