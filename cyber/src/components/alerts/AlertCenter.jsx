/**
 * AlertCenter.jsx — CrimeCast Real-Time Alert Center
 * WebSocket feed · Countdown timers · Skeleton loading · Empty state · Framer Motion
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, CheckCircle, Truck, XCircle,
  Clock, AlertTriangle, Zap, Volume2, VolumeX, RefreshCw, Shield,
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import PageTransition from '../ui/PageTransition';

/* ── Countdown hook ────────────────────────────────────────────────── */
const useCountdown = (etaHours) => {
  const totalSecs = Math.max(0, Math.round((etaHours ?? 0) * 3600));
  const [secs, setSecs] = useState(totalSecs);

  useEffect(() => {
    setSecs(Math.max(0, Math.round((etaHours ?? 0) * 3600)));
  }, [etaHours]);

  useEffect(() => {
    if (secs <= 0) return;
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secs]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const str = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  return { str, expired: secs === 0, critical: secs < 3600 && secs > 0 };
};

/* ── Status config ─────────────────────────────────────────────────── */
const STATUS = {
  SENT:         { label: 'Alert Sent',   bg: 'rgba(249,115,22,0.12)', color: '#f97316', border: 'rgba(249,115,22,0.3)' },
  ACKNOWLEDGED: { label: 'Acknowledged', bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  DISPATCHED:   { label: 'Dispatched',   bg: 'rgba(34,197,94,0.12)',   color: '#4ade80', border: 'rgba(34,197,94,0.3)'  },
  FALSE_ALARM:  { label: 'False Alarm',  bg: 'rgba(63,63,70,0.3)',     color: '#71717a', border: 'rgba(63,63,70,0.5)'   },
  EXPIRED:      { label: 'Expired',      bg: 'rgba(39,39,42,0.4)',     color: '#52525b', border: 'rgba(39,39,42,0.6)'   },
};

// Bands relative to the 40-class random baseline (2.5%): ~0.26 is a strong
// single-district signal, so "high" starts at 0.20 — not 0.7 (which real
// calibrated probabilities never reach and would leave every card yellow).
const probColor = (p) => p >= 0.20 ? '#ef4444' : p >= 0.10 ? '#f97316' : '#eab308';

/* ── Single alert card ─────────────────────────────────────────────── */
const AlertCard = ({ alert, onAck, onDispatch, onFalse, idx }) => {
  const { str, expired, critical } = useCountdown(alert.eta_hours);
  const prob  = alert.probability ?? 0;
  const color = probColor(prob);
  const s     = STATUS[alert.status] ?? STATUS.SENT;
  const canAct   = alert.status === 'SENT';
  const isUrgent = prob >= 0.20 && critical;
  const [showXml, setShowXml] = useState(false);
  const xmlPayload = alert.iso20022_xml || alert.iso20022_payload || null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ delay: idx * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`p-4 rounded-2xl border space-y-3 transition-colors relative overflow-hidden
        ${isUrgent ? 'alert-critical-border' : ''}`}
      style={{
        background: isUrgent ? 'rgba(239,68,68,0.05)' : 'rgba(0,0,0,0.65)',
        borderColor: isUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(39,39,42,0.6)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* URGENT pulse dot */}
      {isUrgent && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 alert-urgent" />
      )}

      {/* Row 1: Complaint # + status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-black text-orange-400 uppercase tracking-wide">
            {typeof alert.complaint_number === 'object' ? JSON.stringify(alert.complaint_number) : String(alert.complaint_number ?? `ALT-${typeof alert.id === 'object' ? JSON.stringify(alert.id) : alert.id}`)}
          </p>
          <p className="text-xl font-black text-white">
            ₹{Number(alert.fraud_amount ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <span
          className="text-[7px] font-black uppercase rounded px-2 py-0.5 flex-shrink-0 mt-0.5"
          style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
        >
          {s.label}
        </span>
      </div>

      {/* Row 2: Zone + Probability */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">Predicted Zone</p>
          <p className="text-[11px] font-black text-white leading-tight">
            {typeof alert.predicted_zone_name === 'object' && alert.predicted_zone_name !== null ? (alert.predicted_zone_name.name || JSON.stringify(alert.predicted_zone_name)) : String(alert.predicted_zone_name ?? '—')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">Likelihood</p>
          <p className="text-2xl font-black leading-none" style={{ color }}>
            {(prob * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Probability bar */}
      <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(prob * 100).toFixed(0)}%` }}
          transition={{ delay: idx * 0.04 + 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: `linear-gradient(90deg, ${color}, #ef4444)` }}
        />
      </div>

      {/* ETA countdown */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{
          background: expired ? 'rgba(39,39,42,0.5)'
                    : critical ? 'rgba(239,68,68,0.1)'
                    : 'rgba(249,115,22,0.07)',
        }}
      >
        <Clock
          className={`w-3.5 h-3.5 flex-shrink-0
            ${expired ? 'text-zinc-600' : critical ? 'text-red-400' : 'text-orange-400'}`}
        />
        <span
          className={`text-[10px] font-black uppercase
            ${expired ? 'text-zinc-500' : critical ? 'text-red-400' : 'text-orange-300'}`}
        >
          {expired ? 'ETA Expired' : `Cash-Out in ${str}`}
        </span>
        {critical && !expired && (
          <span
            className="ml-auto text-[7px] font-black uppercase px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}
          >
            URGENT
          </span>
        )}
      </div>

      {/* Action buttons */}
      {canAct && (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onAck(alert)}
            className="flex items-center justify-center gap-1 py-2.5 rounded-xl text-[8px]
                       font-black uppercase transition-all hover:scale-[1.02] active:scale-95 touch-feedback"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}
          >
            <CheckCircle className="w-3 h-3" /> Ack
          </button>
          <button
            onClick={() => onDispatch(alert)}
            className="flex items-center justify-center gap-1 py-2.5 rounded-xl text-[8px]
                       font-black uppercase text-white transition-all hover:scale-[1.02] active:scale-95 touch-feedback"
            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
          >
            <Truck className="w-3 h-3" /> Dispatch
          </button>
          <button
            onClick={() => onFalse(alert)}
            className="flex items-center justify-center gap-1 py-2.5 rounded-xl text-[8px]
                       font-black uppercase transition-all hover:scale-[1.02] active:scale-95 touch-feedback"
            style={{ background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(63,63,70,0.5)', color: '#71717a' }}
          >
            <XCircle className="w-3 h-3" /> False
          </button>
        </div>
      )}

      {xmlPayload && (
        <div className="mt-2">
          <button
            onClick={() => setShowXml(!showXml)}
            className="w-full text-left text-[9px] font-black uppercase text-zinc-500 hover:text-orange-400 transition-colors flex justify-between items-center"
          >
            <span>ISO 20022 camt.056 CBS Payload</span>
            <span>{showXml ? 'Hide' : 'View'}</span>
          </button>
          <AnimatePresence>
            {showXml && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="bg-black/80 border border-zinc-800 p-3 rounded-lg overflow-x-auto text-[8px] font-mono text-zinc-400 max-h-40 overflow-y-auto custom-scrollbar">
                  <pre>{xmlPayload}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {alert.status === 'DISPATCHED' && (
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase">Team Dispatched</span>
        </div>
      )}
    </motion.div>
  );
};

/* ══ Main Component ═════════════════════════════════════════════════ */
const AlertCenter = ({ navigate }) => {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [sound, setSound]     = useState(true);
  const [filter, setFilter]   = useState('ALL');
  const wsRef   = useRef(null);
  const audioCtx = useRef(null);

  /* ─ Beep ─ */
  const playBeep = useCallback(() => {
    if (!sound) return;
    try {
      if (!audioCtx.current)
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }, [sound]);

  /* ─ Fetch ─ (apiClient returns a raw Response; parse it, never fake it) */
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient('/api/v1/predictions/alerts/?limit=50');
      if (res.ok) {
        const data = await res.json();
        const list = data?.results ?? data ?? [];
        setAlerts(Array.isArray(list) ? list : []);
      } else {
        setError(`Server returned ${res.status}`);
        setAlerts([]);
      }
    } catch (err) {
      const msg = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
      setError(msg || 'Failed to fetch alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  /* ─ WebSocket ─ */
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const defaultHost = (window.location.port === '3000' || window.location.port === '5173')
      ? `${window.location.hostname}:8000`
      : window.location.host;
    const host  = import.meta.env.VITE_WS_HOST || defaultHost;
    const url   = `${proto}://${host}/ws/predictions/`;
    let ws;
    try {
      ws = new WebSocket(url);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'prediction') {
            const a = {
              id: `ws_${Date.now()}`,
              complaint_number: data.complaint_id,
              fraud_amount: data.fraud_amount ?? 0,
              predicted_zone_name: data.zone,
              probability: data.probability,
              eta_hours: data.eta,
              status: 'SENT',
            };
            setAlerts(prev => [a, ...prev]);
            playBeep();
            if (Notification.permission === 'granted') {
              new Notification('CrimeCast Alert', {
                body: `${data.zone} — ${(data.probability * 100).toFixed(0)}% • ETA ${data.eta}h`,
              });
            }
          }
        } catch {}
      };
    } catch {}
    wsRef.current = ws;
    return () => {
      if (ws) {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws.close();
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    };
  }, [playBeep]);

  /* ─ Notification permission ─ */
  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  const updateStatus = async (alert, status, apiPath) => {
    try { await apiClient(apiPath, { method: 'PATCH' }); } catch {}
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status } : a));
  };

  const handleAck      = (a) => updateStatus(a, 'ACKNOWLEDGED', `/api/v1/predictions/alerts/${a.id}/acknowledge/`);
  const handleDispatch = (a) => updateStatus(a, 'DISPATCHED',   `/api/v1/predictions/alerts/${a.id}/dispatch/`);
  const handleFalse    = (a) => updateStatus(a, 'FALSE_ALARM',  `/api/v1/predictions/alerts/${a.id}/false-alarm/`);

  const FILTER_TABS = ['ALL', 'SENT', 'ACKNOWLEDGED', 'DISPATCHED'];

  const displayed = [...alerts]
    .filter(a => filter === 'ALL' || a.status === filter)
    .sort((a, b) => (b.probability - b.eta_hours / 100) - (a.probability - a.eta_hours / 100));

  const sentCount = alerts.filter(a => a.status === 'SENT').length;

  return (
    <PageTransition>
      <div
        className="min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6"
        style={{ background: 'linear-gradient(135deg,#000,#080808)' }}
      >

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
              {sentCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500
                             flex items-center justify-center text-[8px] font-black text-white"
                >
                  {sentCount}
                </motion.span>
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Alert Center
              </h1>
              <p className="text-[9px] text-zinc-500 font-bold uppercase">
                Real-time prediction alerts · {displayed.length} shown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSound(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border
                          text-[9px] font-black uppercase transition-all
                          ${sound ? 'text-orange-400' : 'border-zinc-700 text-zinc-600'}`}
              style={sound ? { background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' } : {}}
            >
              {sound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{sound ? 'Sound On' : 'Muted'}</span>
            </button>
            <button
              onClick={fetchAlerts}
              disabled={loading}
              className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500
                         hover:text-orange-400 hover:border-orange-500/30 transition-all active:scale-95"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
            Live WebSocket Stream · {alerts.length} total
          </span>
        </div>

        {/* Error banner */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-amber-400"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Could not load alerts. {typeof error === 'object' ? JSON.stringify(error) : String(error)}</span>
          </motion.div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="flex-shrink-0 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase
                         transition-all touch-feedback"
              style={filter === tab
                ? { background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff' }
                : { background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(39,39,42,0.8)', color: '#71717a' }
              }
            >
              {tab}
              {tab === 'SENT' && sentCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[7px]">
                  {sentCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alert grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, i) => <Skeleton.AlertCard key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={filter === 'ALL' ? BellOff : Shield}
            title={filter === 'ALL' ? 'All Clear' : `No ${filter.toLowerCase()} alerts`}
            message={
              filter === 'ALL'
                ? 'No active alerts. The system will notify you when new predictions are generated.'
                : `No alerts with status "${filter}" right now.`
            }
            action={filter !== 'ALL' ? { label: 'View All', onClick: () => setFilter('ALL') } : null}
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayed.map((a, i) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  idx={i}
                  onAck={handleAck}
                  onDispatch={handleDispatch}
                  onFalse={handleFalse}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </PageTransition>
  );
};

/* ── Demo data removed — this view renders only real API/WebSocket alerts. ── */

export default AlertCenter;
