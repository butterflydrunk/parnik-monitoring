import React from 'react';
import { 
  Network, 
  ShieldCheck, 
  Database, 
  Layers, 
  Wifi, 
  Cloud, 
  Server, 
  ArrowRight, 
  Lock, 
  Cpu, 
  Smartphone, 
  Monitor, 
  Terminal
} from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* High-Level Layer Stack */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-blue-400" />
          End-to-End System Architecture Topology
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Target Platforms */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px] mb-2">1. Presentation & Native Host</div>
            <div className="text-slate-200 font-semibold text-sm mb-3">Unified Flutter App (Dart)</div>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span><strong>Windows (.exe):</strong> FFI SQLite dynamic link</span>
              </li>
              <li className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span><strong>Android (.apk):</strong> Kotlin MulticastLock bridge</span>
              </li>
              <li className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span><strong>iOS (.ipa):</strong> NSLocalNetwork entitlements</span>
              </li>
            </ul>
          </div>

          {/* Core Engines */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px] mb-2">2. Network & Crypto Engines</div>
            <div className="text-slate-200 font-semibold text-sm mb-3">Smart Hybrid Router</div>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-blue-400" />
                <span><strong>LAN Module:</strong> UDP:41234 + TCP:41235</span>
              </li>
              <li className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-purple-400" />
                <span><strong>WAN Module:</strong> Socket.io Cloud Relay</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span><strong>Crypto:</strong> AES-256-GCM + SHA-256</span>
              </li>
            </ul>
          </div>

          {/* Persistence Layer */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px] mb-2">3. Storage & State Store</div>
            <div className="text-slate-200 font-semibold text-sm mb-3">Cross-Platform SQLite</div>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span><strong>Messages Table:</strong> Sent, Delivered, Read</span>
              </li>
              <li className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span><strong>Contacts Table:</strong> IP, Device ID, Last Seen</span>
              </li>
              <li className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span><strong>Queue:</strong> Offline sync on reconnect</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Decision Flowchart: Smart Auto-Routing */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-emerald-400" />
          Smart Auto-Routing Decision Tree
        </h3>

        <div className="space-y-3 text-xs">
          {/* Step 1 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 rounded-full bg-blue-900 text-blue-300 font-bold flex items-center justify-center text-xs">1</span>
              <div>
                <span className="font-semibold text-slate-200">UDP Peer Discovery (Port 41234)</span>
                <p className="text-slate-400 text-[11px]">App broadcasts DISCOVERY_PROBE on startup. Target peer responds with local IPv4 & Username.</p>
              </div>
            </div>
            <span className="text-blue-400 font-mono text-[11px] mt-1 sm:mt-0">RawDatagramSocket</span>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-slate-600">
            ↓
          </div>

          {/* Step 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-300 font-bold flex items-center justify-center text-xs">2</span>
              <div>
                <span className="font-semibold text-slate-200">Direct TCP Socket Handshake (Port 41235)</span>
                <p className="text-slate-400 text-[11px]">Attempts direct peer connection with 250ms timeout. Encrypted via AES-256-GCM.</p>
              </div>
            </div>
            <span className="text-emerald-400 font-bold text-[11px] mt-1 sm:mt-0">Primary Path: Latency &lt; 0.1s</span>
          </div>

          {/* Arrow with Branch */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/60 text-emerald-300">
              <div className="font-semibold">If TCP Socket Connected:</div>
              <div className="text-[11px] text-emerald-400/80 mt-1">
                Stream framed bytes directly peer-to-peer. Zero server bandwidth. Status updated to <strong>DELIVERED</strong>.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-900/60 text-purple-300">
              <div className="font-semibold">If TCP Fails / Times out:</div>
              <div className="text-[11px] text-purple-400/80 mt-1">
                Trigger instant fallback to <strong>Node.js Socket.io WAN Relay</strong>. Zero message drop.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Platform Constraints Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          Cross-Platform Hardware & OS Quirks Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Known Hardware / OS Quirk</th>
                <th className="py-2.5 px-3">Required Architectural Solution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-emerald-400">Android</td>
                <td className="py-2.5 px-3 text-slate-400">
                  Kernel hardware power-saving packet filter blocks all incoming UDP broadcast/multicast packets.
                </td>
                <td className="py-2.5 px-3">
                  Acquire <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded font-mono">WifiManager.MulticastLock</code> via Kotlin MethodChannel.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-purple-400">iOS 14+</td>
                <td className="py-2.5 px-3 text-slate-400">
                  Local Network Privacy blocks socket binding without user consent prompt and Bonjour registration.
                </td>
                <td className="py-2.5 px-3">
                  Declare <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded font-mono">NSLocalNetworkUsageDescription</code> and <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded font-mono">NSBonjourServices</code> in <code className="font-mono text-slate-200">Info.plist</code>.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-blue-400">Windows (.exe)</td>
                <td className="py-2.5 px-3 text-slate-400">
                  Standard mobile SQLite plugin crashes on Windows due to missing dynamic C-runtime libraries.
                </td>
                <td className="py-2.5 px-3">
                  Use <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded font-mono">sqflite_common_ffi</code> + <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded font-mono">sqlite3_flutter_libs</code> and call <code className="font-mono text-slate-200">sqfliteFfiInit()</code> in <code className="font-mono text-slate-200">main()</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
