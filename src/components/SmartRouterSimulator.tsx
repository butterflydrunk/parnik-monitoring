import React, { useState } from 'react';
import { SimulatedPeer, PacketLog, RoutingMode } from '../types';
import { 
  Wifi, 
  Cloud, 
  Send, 
  ShieldCheck, 
  Radio, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Smartphone, 
  Monitor, 
  Laptop, 
  Activity,
  Lock,
  RefreshCw
} from 'lucide-react';

export const SmartRouterSimulator: React.FC = () => {
  const [multicastLockAcquired, setMulticastLockAcquired] = useState<boolean>(true);
  const [targetPeerId, setTargetPeerId] = useState<string>('peer-1');
  const [messageText, setMessageText] = useState<string>('Hello! Meeting in 10 minutes?');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [lastRouteUsed, setLastRouteUsed] = useState<RoutingMode | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  const [peers, setPeers] = useState<SimulatedPeer[]>([
    {
      id: 'peer-1',
      username: 'Alice (Android 14)',
      ipAddress: '192.168.1.104',
      deviceType: 'android',
      lanReachable: true,
      wanConnected: true,
      latencyMs: 14,
    },
    {
      id: 'peer-2',
      username: 'Bob (Windows 11 Workstation)',
      ipAddress: '192.168.1.118',
      deviceType: 'windows',
      lanReachable: false, // AP Isolation simulated / firewall blocked
      wanConnected: true,
      latencyMs: 82,
    },
    {
      id: 'peer-3',
      username: 'Charlie (iPhone 15 Pro)',
      ipAddress: '192.168.1.205',
      deviceType: 'ios',
      lanReachable: false,
      wanConnected: false, // Offline
      latencyMs: 0,
    }
  ]);

  const [logs, setLogs] = useState<PacketLog[]>([
    {
      id: 'log-1',
      timestamp: '21:35:10.102',
      direction: 'OUT',
      protocol: 'UDP:41234',
      payloadSummary: '{"type":"DISCOVERY_PROBE","version":"1.0.0","port":41235}',
      status: 'SUCCESS',
      latencyMs: 4,
    },
    {
      id: 'log-2',
      timestamp: '21:35:10.118',
      direction: 'IN',
      protocol: 'UDP:41234',
      payloadSummary: '{"type":"DISCOVERY_PONG","user":"Alice","ip":"192.168.1.104"}',
      status: 'SUCCESS',
      latencyMs: 16,
    }
  ]);

  const selectedPeer = peers.find(p => p.id === targetPeerId) || peers[0];

  const handleSendMessage = () => {
    if (isTransmitting || !messageText.trim()) return;
    setIsTransmitting(true);
    setLastRouteUsed(null);
    setLastLatency(null);

    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;

    // Step 1: Check native multicast state
    if (!multicastLockAcquired && selectedPeer.deviceType === 'android') {
      setTimeout(() => {
        setLogs(prev => [
          {
            id: `log-${Date.now()}-fail`,
            timestamp: timeStr,
            direction: 'OUT',
            protocol: 'NATIVE_BRIDGE',
            payloadSummary: '[WARN] MulticastLock is DISABLED on Android! Kernel dropped incoming UDP packets.',
            status: 'BLOCKED',
            latencyMs: 1,
          },
          ...prev
        ]);
        executeSmartRouting(timeStr, false);
      }, 200);
      return;
    }

    executeSmartRouting(timeStr, selectedPeer.lanReachable);
  };

  const executeSmartRouting = (timeStr: string, lanSucceeds: boolean) => {
    // Stage 1: Try Direct LAN TCP Socket (Port 41235) with 200ms timeout
    setTimeout(() => {
      if (lanSucceeds) {
        // LAN success (<0.1s)
        const latency = Math.floor(Math.random() * 12) + 8;
        setLastRouteUsed('LAN_TCP');
        setLastLatency(latency);
        setLogs(prev => [
          {
            id: `log-${Date.now()}-tcp`,
            timestamp: timeStr,
            direction: 'OUT',
            protocol: 'TCP:41235',
            payloadSummary: `[AES-256-GCM] Direct TCP to ${selectedPeer.ipAddress}:41235 -> "${messageText.slice(0, 30)}..."`,
            status: 'SUCCESS',
            latencyMs: latency,
          },
          ...prev
        ]);
        setIsTransmitting(false);
      } else {
        // LAN failed -> Fallback to Socket.io Cloud Server
        setLogs(prev => [
          {
            id: `log-${Date.now()}-tcp-fail`,
            timestamp: timeStr,
            direction: 'OUT',
            protocol: 'TCP:41235',
            payloadSummary: `TCP Handshake to ${selectedPeer.ipAddress}:41235 timed out after 250ms (AP Isolation or Firewall).`,
            status: 'FALLBACK',
            latencyMs: 250,
          },
          ...prev
        ]);

        setTimeout(() => {
          if (selectedPeer.wanConnected) {
            const wanLatency = Math.floor(Math.random() * 25) + 70;
            setLastRouteUsed('WAN_RELAY');
            setLastLatency(wanLatency);
            setLogs(prev => [
              {
                id: `log-${Date.now()}-wan`,
                timestamp: timeStr,
                direction: 'OUT',
                protocol: 'SOCKET_IO_WAN',
                payloadSummary: `[FALLBACK RELAY] Relayed via Node.js Socket.io cloud -> ${selectedPeer.username}`,
                status: 'SUCCESS',
                latencyMs: wanLatency,
              },
              ...prev
            ]);
          } else {
            // Peer is offline -> SQLite persistence queue
            setLastRouteUsed('OFFLINE_QUEUED');
            setLastLatency(null);
            setLogs(prev => [
              {
                id: `log-${Date.now()}-offline`,
                timestamp: timeStr,
                direction: 'OUT',
                protocol: 'NATIVE_BRIDGE',
                payloadSummary: `[SQLITE DB] Peer unreachable via LAN and WAN. Message persisted with status 'PENDING_RETRY'.`,
                status: 'RETRY',
                latencyMs: 3,
              },
              ...prev
            ]);
          }
          setIsTransmitting(false);
        }, 350);
      }
    }, 200);
  };

  const togglePeerLan = (peerId: string) => {
    setPeers(prev => prev.map(p => {
      if (p.id === peerId) {
        return { ...p, lanReachable: !p.lanReachable };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Native Multicast Status & Subnet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Multicast Lock Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className={`w-4 h-4 ${multicastLockAcquired ? 'text-emerald-400' : 'text-amber-500'}`} />
              <span className="text-xs font-semibold text-slate-300">Android MulticastLock</span>
            </div>
            <button
              id="btn-toggle-multicast"
              onClick={() => setMulticastLockAcquired(!multicastLockAcquired)}
              className={`text-xs px-2.5 py-1 rounded font-medium transition ${
                multicastLockAcquired
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {multicastLockAcquired ? 'Acquired (Active)' : 'Released (Dropped)'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Native Kotlin bridge status. When acquired, Wi-Fi hardware filter permits UDP 41234 broadcasts.
          </p>
        </div>

        {/* Local Network Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-300">Subnet Discovery Interface</span>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Local IP:</span>
            <span className="text-slate-200 bg-slate-800 px-2 py-0.5 rounded">192.168.1.50</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Broadcast:</span>
            <span className="text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40">192.168.1.255:41234</span>
          </div>
        </div>

        {/* WAN Relay Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-slate-300">Cloud Signaling Relay</span>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Engine:</span>
            <span className="text-purple-300">Node.js + Socket.io</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Cluster Status:</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Connected (Relay Ready)
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Peer Selector & Message Sender */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Peers & Network Conditions (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              Discovered Peers on Network
            </h3>
            <span className="text-xs text-slate-400">Port 41234 UDP Pong</span>
          </div>

          <div className="space-y-3 flex-1">
            {peers.map(peer => {
              const isSelected = peer.id === targetPeerId;
              const DeviceIcon = peer.deviceType === 'windows' ? Monitor : peer.deviceType === 'ios' ? Laptop : Smartphone;

              return (
                <div
                  key={peer.id}
                  id={`peer-card-${peer.id}`}
                  onClick={() => setTargetPeerId(peer.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                        <DeviceIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{peer.username}</div>
                        <div className="text-[11px] font-mono text-slate-400">{peer.ipAddress}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        peer.lanReachable 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {peer.lanReachable ? 'LAN Direct OK' : 'LAN Blocked'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        peer.wanConnected 
                          ? 'bg-purple-950 text-purple-400 border border-purple-800' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {peer.wanConnected ? 'WAN Cloud Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Simulation toggle button */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Toggle LAN firewall / AP Isolation:</span>
                    <button
                      id={`btn-toggle-lan-${peer.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePeerLan(peer.id);
                      }}
                      className="text-blue-400 hover:text-blue-300 font-medium underline"
                    >
                      {peer.lanReachable ? 'Simulate AP Block' : 'Restore LAN Direct'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-start space-x-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              All message payloads are end-to-end encrypted with <strong>AES-256-GCM</strong> and signed with SHA-256 before transmission over TCP or Socket.io.
            </span>
          </div>
        </div>

        {/* Right: Smart Dispatcher & Routing Outcome (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Smart Routing Dispatcher
              </h3>
              <span className="text-xs px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                Target: {selectedPeer.username.split(' ')[0]}
              </span>
            </div>

            {/* Message Input Form */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Message Payload (Encrypted with AES-256):
              </label>
              <div className="flex gap-2">
                <input
                  id="input-message-text"
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a test message..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <button
                  id="btn-send-message"
                  onClick={handleSendMessage}
                  disabled={isTransmitting}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition shadow ${
                    isTransmitting
                      ? 'bg-slate-700 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  {isTransmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Routing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send (Smart Route)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Smart Routing Decision Visualizer */}
            <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
                <span>Routing Pipeline Evaluation:</span>
                {lastRouteUsed && (
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                    lastRouteUsed === 'LAN_TCP'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : lastRouteUsed === 'WAN_RELAY'
                      ? 'bg-purple-950 text-purple-400 border border-purple-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {lastRouteUsed === 'LAN_TCP' && `⚡ Direct LAN TCP (<0.1s, ${lastLatency}ms)`}
                    {lastRouteUsed === 'WAN_RELAY' && `☁️ Auto-Fallback WAN Cloud Relay (${lastLatency}ms)`}
                    {lastRouteUsed === 'OFFLINE_QUEUED' && `📦 Queued in SQLite (Offline)`}
                  </span>
                )}
              </div>

              {/* Step Flow */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {/* Step 1 */}
                <div className={`p-3 rounded-lg border ${
                  lastRouteUsed === 'LAN_TCP' 
                    ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300' 
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}>
                  <div className="font-semibold text-[11px]">1. Direct TCP (LAN)</div>
                  <div className="text-[10px] mt-1 text-slate-400">Port 41235 direct handshake</div>
                  <div className="mt-2 text-[10px] font-mono">Target: {selectedPeer.ipAddress}</div>
                </div>

                {/* Step 2 */}
                <div className={`p-3 rounded-lg border ${
                  lastRouteUsed === 'WAN_RELAY' 
                    ? 'border-purple-500 bg-purple-950/30 text-purple-300' 
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}>
                  <div className="font-semibold text-[11px]">2. Socket.io (WAN)</div>
                  <div className="text-[10px] mt-1 text-slate-400">Fallback if TCP fails/times out</div>
                  <div className="mt-2 text-[10px] font-mono">Cloud Node.js Relay</div>
                </div>

                {/* Step 3 */}
                <div className={`p-3 rounded-lg border ${
                  lastRouteUsed === 'OFFLINE_QUEUED' 
                    ? 'border-amber-500 bg-amber-950/30 text-amber-300' 
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}>
                  <div className="font-semibold text-[11px]">3. SQLite Store</div>
                  <div className="text-[10px] mt-1 text-slate-400">Cache offline for retry</div>
                  <div className="mt-2 text-[10px] font-mono">Status: PENDING</div>
                </div>
              </div>
            </div>
          </div>

          {/* Packet Telemetry Logs */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
              <span>Real-Time Socket & Packet Stream:</span>
              <button
                id="btn-clear-logs"
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Clear Log
              </button>
            </div>

            <div className="h-44 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] space-y-2">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-6">No packet activity recorded yet. Click "Send" above.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex items-start space-x-2 border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">{log.timestamp}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      log.protocol.includes('TCP')
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                        : log.protocol.includes('UDP')
                        ? 'bg-blue-950 text-blue-400 border border-blue-900'
                        : log.protocol.includes('SOCKET_IO')
                        ? 'bg-purple-950 text-purple-400 border border-purple-900'
                        : 'bg-amber-950 text-amber-400 border border-amber-900'
                    }`}>
                      {log.protocol}
                    </span>
                    <span className={`text-[10px] font-bold ${
                      log.status === 'SUCCESS' ? 'text-emerald-400' :
                      log.status === 'FALLBACK' ? 'text-purple-400' :
                      log.status === 'RETRY' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      [{log.status}]
                    </span>
                    <span className="text-slate-300 flex-1 truncate">{log.payloadSummary}</span>
                    {log.latencyMs > 0 && (
                      <span className="text-slate-500 whitespace-nowrap">{log.latencyMs}ms</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
