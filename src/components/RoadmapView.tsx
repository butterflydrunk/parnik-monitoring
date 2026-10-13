import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Code2, 
  Terminal, 
  Database, 
  Radio, 
  Wifi, 
  Layers, 
  Smartphone,
  Shield,
  ArrowRight
} from 'lucide-react';

export const RoadmapView: React.FC = () => {
  const phases = [
    {
      id: 1,
      title: 'Phase 1: Project Setup & Dependencies',
      status: 'COMPLETED & PRODUCTION READY',
      desc: 'Complete cross-platform pubspec.yaml with network_info_plus, sqflite_common_ffi, sqlite3_flutter_libs, encrypt, socket_io_client, and permission_handler.',
      badge: 'Ready for VS Code',
      icon: Terminal,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-800/80',
    },
    {
      id: 2,
      title: 'Phase 2: Native Platform Configurations',
      status: 'COMPLETED & PRODUCTION READY',
      desc: 'Android MulticastLock in Kotlin MainActivity.kt, AndroidManifest.xml permissions, iOS Info.plist Local Network entitlements, and Windows FFI loader.',
      badge: 'Native Bridge Active',
      icon: Smartphone,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-800/80',
    },
    {
      id: 3,
      title: 'Phase 3: Native Multicast Bridge (Dart Service)',
      status: 'PHASE 3 BLUEPRINT READY',
      desc: 'Write MulticastService class calling MethodChannel("com.hybrid.messenger/multicast") to safely acquire/release lock based on app lifecycle.',
      badge: 'MethodChannel',
      icon: Radio,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/30 border-blue-900/60',
    },
    {
      id: 4,
      title: 'Phase 4: LAN Peer Discovery (UDP Engine)',
      status: 'PHASE 4 BLUEPRINT READY',
      desc: 'RawDatagramSocket on port 41234 broadcasting JSON probes, parsing subnet pong responses, and maintaining active peer heartbeat table.',
      badge: 'Port 41234',
      icon: Wifi,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/30 border-blue-900/60',
    },
    {
      id: 5,
      title: 'Phase 5: P2P Direct Messaging & File Transfer (TCP Engine)',
      status: 'PHASE 5 BLUEPRINT READY',
      desc: 'ServerSocket and client Socket on port 41235 with binary length-prefix framing, AES-256-GCM chunked file transmission, and delivery ACKs.',
      badge: 'Port 41235',
      icon: Code2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/30 border-blue-900/60',
    },
    {
      id: 6,
      title: 'Phase 6: Local Database Storage (SQLite)',
      status: 'PHASE 6 BLUEPRINT READY',
      desc: 'Unified SQLite database helper handling schema migrations, message delivery status (SENT, DELIVERED, READ), offline retry queues, and contact caching.',
      badge: 'SQLite FFI',
      icon: Database,
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/30 border-purple-900/60',
    },
    {
      id: 7,
      title: 'Phase 7: Hybrid Smart Router & Basic UI (VS Code Build-Ready)',
      status: 'PHASE 7 BLUEPRINT READY',
      desc: 'Orchestrating LAN direct socket attempt (<0.1s) with automatic fallback to Node.js Socket.io cloud relay, integrated with Flutter Chat UI.',
      badge: 'Smart Auto-Route',
      icon: Layers,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/30 border-amber-900/60',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Master 7-Phase Implementation Roadmap</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Architectural implementation sequence designed for cross-platform stability across Windows, Android, and iOS.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 font-medium">Phase 1 & 2 Completed Below</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {phases.map(phase => {
          const Icon = phase.icon;
          return (
            <div
              key={phase.id}
              id={`roadmap-phase-${phase.id}`}
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${phase.bgColor}`}
            >
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 shrink-0">
                  <Icon className={`w-5 h-5 ${phase.color}`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-200">{phase.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      {phase.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl">{phase.desc}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0 self-end md:self-auto">
                <span className="text-xs font-semibold text-slate-300">{phase.status}</span>
                {phase.id <= 2 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Clock className="w-5 h-5 text-slate-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
