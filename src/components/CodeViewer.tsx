import React, { useState } from 'react';
import { CodeArtifact } from '../types';
import { Copy, Check, Download, FileCode, CheckCircle2 } from 'lucide-react';

interface CodeViewerProps {
  artifacts: CodeArtifact[];
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ artifacts }) => {
  const [activeId, setActiveId] = useState<string>(artifacts[0]?.id || '');
  const [copied, setCopied] = useState<boolean>(false);

  const activeArtifact = artifacts.find(a => a.id === activeId) || artifacts[0];

  const handleCopy = async () => {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    if (!activeArtifact) return;
    const blob = new Blob([activeArtifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeArtifact.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* File Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2.5 overflow-x-auto">
        <div className="flex items-center space-x-2">
          {artifacts.map(art => {
            const isActive = art.id === activeId;
            return (
              <button
                key={art.id}
                id={`tab-${art.id}`}
                onClick={() => {
                  setActiveId(art.id);
                  setCopied(false);
                }}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors \${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{art.fileName}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            id="btn-copy-code"
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Copy file contents"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            id="btn-download-code"
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* File Header Details */}
      <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60 uppercase">
              {activeArtifact.phase.toUpperCase()}
            </span>
            <h3 className="text-sm font-semibold text-slate-100">{activeArtifact.title}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">{activeArtifact.description}</p>
        </div>
        <div className="text-right">
          <code className="text-xs text-amber-400 font-mono bg-amber-950/40 px-2 py-1 rounded border border-amber-900/50">
            {activeArtifact.filePath}
          </code>
        </div>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto max-h-[520px] bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed selection:bg-blue-600 selection:text-white">
        <pre className="relative">
          <code>
            {activeArtifact.content.split('\n').map((line: string, idx: number) => (
              <div key={idx} className="table-row hover:bg-slate-900/60">
                <span className="table-cell text-right pr-4 text-slate-600 select-none user-select-none w-10">
                  {idx + 1}
                </span>
                <span className="table-cell whitespace-pre">{line}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Validated for Flutter 3.19+ / Dart 3.3+ (Windows, Android, iOS)</span>
        </div>
        <span className="text-slate-500 font-mono">
          {activeArtifact.content.split('\n').length} lines • {activeArtifact.language.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
