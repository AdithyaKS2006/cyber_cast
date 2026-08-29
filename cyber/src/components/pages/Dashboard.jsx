/**
 * Dashboard.jsx — CrimeCast Command Center
 * Stat cards · Skeleton loading · Error state · Mobile responsive
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Zap, CheckCircle, DollarSign,
  TrendingUp, TrendingDown, ArrowRight, Activity,
  Shield, RefreshCw, AlertTriangle,
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import Skeleton from '../ui/Skeleton';
import ErrorState from '../ui/ErrorState';
import PageTransition from '../ui/PageTransition';
import CrossJurisdictionRollup from './CrossJurisdictionRollup';

/* ── helpers ─────────────────────────────────────────────────────── */
const fmtAmount = (n) => {
  n = Number(n ?? 0);
  return n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr`
       : n >= 100000   ? `₹${(n / 100000).toFixed(1)}L`
       : n >= 1000     ? `₹${(n / 1000).toFixed(0)}K`
       : `₹${n}`;
};

const STATUS_BADGE = {
  NEW:               'badge-new',
  UNDER_ANALYSIS:    'badge-analysis',
  PREDICTION_ACTIVE: 'badge-active',
  INTERCEPTED:       'badge-intercepted',
  CLOSED:            'badge-closed',
  FALSE_ALARM:       'badge-closed',
};

const PRIORITY_COLOR = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#4ade80',
};

/* ── Animated stat card ──────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, color, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className="p-5 rounded-2xl border border-zinc-800/60 space-y-3 relative overflow-hidden touch-feedback"
    style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(16px)' }}
  >
    <div
      className="absolute inset-0 opacity-[0.06] pointer-events-none"
      style={{ background: `radial-gradient(ellipse at top left, ${color}, transparent 65%)` }}
    />
    <div className="flex items-center justify-between relative z-10">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}1a`, border: `1px solid ${color}30` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[9px] font-black uppercase
          ${trend >= 0 ? 'text-red-400' : 'text-green-400'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl sm:text-3xl font-black text-white">{value}</p>
      {sub && <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">{sub}</p>}
    </div>
  </motion.div>
);

/* ── Sparkline ───────────────────────────────────────────────────── */
const Sparkline = ({ data, color = '#f97316', height = 40 }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 200;
  const len = Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => {
    const x = (i / len) * w;
    const y = Math.max(4, height - (v / max) * (height - 8));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `M0,${height} L${pts.split(' ').join(' L')} L${w},${height} Z`;
  const gradId = `sg-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-full block" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/* ── Accuracy gauge ──────────────────────────────────────────────── */
const AccuracyGauge = ({ value = 0, label = "TOP-5 TRIAGE" }) => {
  const r = 46, cx = 60, cy = 60, circ = Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d={`M${cx - r},${cy} a${r},${r} 0 0,1 ${2 * r},0`}
              fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
        <path d={`M${cx - r},${cy} a${r},${r} 0 0,1 ${2 * r},0`}
              fill="none" stroke="url(#gg)" strokeWidth="8"
              strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
        <defs>
          <linearGradient id="gg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#f97316" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff"
              fontSize="18" fontWeight="900">{value > 0 ? `${value.toFixed(1)}%` : '—'}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#52525b"
              fontSize="7" fontWeight="700" letterSpacing="2">{label}</text>
      </svg>
      <p className="text-[8px] text-zinc-500 font-bold uppercase text-center">Single Calibrated LightGBM</p>
    </div>
  );
};

/* ══ Dashboard ══════════════════════════════════════════════════════ */
const Dashboard = ({ navigate }) => {
  const [stats, setStats]           = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [trend, setTrend]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [viewMode, setViewMode]     = useState('local'); // 'local' or 'national'

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, cmpRes, predRes, metricRes] = await Promise.allSettled([
        apiClient('/api/v1/dashboard/stats/'),
        apiClient('/api/v1/complaints/?limit=10&ordering=-complaint_timestamp'),
        apiClient('/api/v1/predictions/?outcome=PENDING,NEEDS_REVIEW&limit=5'),
        apiClient('/api/v1/predictions/data/model-metrics/'),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const data = await dashRes.value.json();
        setStats(data);
        const rawTrend = data.fraud_trend?.map(d => (typeof d === 'number' ? d : d.count)) ?? data.trend_30d;
        const hasData = Array.isArray(rawTrend) && rawTrend.length > 0;
        const hasPositive = hasData && rawTrend.some(v => v > 0);
        setTrend(hasPositive ? rawTrend : (hasData ? rawTrend : []));
      } else {
        setStats(null);
        setTrend([]);
      }

      if (cmpRes.status === 'fulfilled' && cmpRes.value.ok) {
        const data = await cmpRes.value.json();
        const list = data?.results ?? data ?? [];
        setComplaints(Array.isArray(list) && list.length ? list : []);
      } else setComplaints([]);

      if (predRes.status === 'fulfilled' && predRes.value.ok) {
        const data = await predRes.value.json();
        const list = data?.results ?? data ?? [];
        setPredictions(Array.isArray(list) && list.length ? list : []);
      } else setPredictions([]);

      if (metricRes.status === 'fulfilled' && metricRes.value.ok) {
        const data = await metricRes.value.json();
        setModelMetrics(data);
      } else setModelMetrics(null);

    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
      setStats(null); setTrend([]);
      setComplaints([]); setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Real-time WebSocket listener for dashboard updates & status
  const [wsLive, setWsLive] = useState(false);
  useEffect(() => {
    const handleWsEvent = () => fetchAll();
    const handleWsStatus = (e) => {
      if (e.detail?.path === '/ws/dashboard/' && e.detail?.status === 'connected') {
        setWsLive(true);
      }
    };
    window.addEventListener('ws:dashboard', handleWsEvent);
    window.addEventListener('ws:status', handleWsStatus);
    return () => {
      window.removeEventListener('ws:dashboard', handleWsEvent);
      window.removeEventListener('ws:status', handleWsStatus);
    };
  }, [fetchAll]);

  const [simulating, setSimulating] = useState(false);

  const handleSimulateNCRP = async () => {
    setSimulating(true);
    try {
      const districts = ['MUMBAI_SUBURBAN', 'SOUTH_DELHI', 'BANGALORE_URBAN', 'HYDERABAD', 'CYBERABAD', 'GURUGRAM', 'PUNE'];
      const methods = ['ATM_CARD_CLONING', 'SIM_SWAP_FRAUD', 'PHISHING_INVESTMENT_SCAM', 'UPI_COLLECT_SCAM'];
      const randomDistrict = districts[Math.floor(Math.random() * districts.length)];
      const randomMethod = methods[Math.floor(Math.random() * methods.length)];
      const randomAmount = Math.floor(Math.random() * 450000) + 50000;

      const res = await apiClient('/api/v1/complaints/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          victim_name: `NCRP Simulated Victim #${Math.floor(Math.random() * 9000 + 1000)}`,
          victim_district: randomDistrict,
          fraud_amount: randomAmount,
          fraud_method: randomMethod,
          description: 'Automated live webhook feed test from NCRP Cybercrime Portal',
          incident_timestamp: new Date().toISOString(),
        })
      });
      if (res.ok) {
        await fetchAll();
      }
    } catch (err) {
      console.error('Simulated NCRP Ingestion Failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  const s = stats ?? {};

  return (
    <PageTransition>
      <div
        className="min-h-screen p-4 sm:p-6 space-y-6 sm:space-y-8"
        style={{ background: 'linear-gradient(135deg,#000,#080808)' }}
      >

        {/* ── Page header ───────────────────────────────────────── */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Command Center
              </h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 ml-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">
                  {wsLive ? 'LIVE' : 'ACTIVE'}
                </span>
              </div>
            </div>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
              CrimeCast ·{' '}
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateNCRP}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider
                         bg-gradient-to-r from-orange-600 to-amber-600 text-black hover:from-orange-500 hover:to-amber-500
                         transition-all shadow-[0_0_12px_rgba(249,115,22,0.3)] active:scale-95 disabled:opacity-50"
              title="Trigger a simulated live NCRP cyber fraud complaint ingestion"
            >
              <Zap className={`w-3.5 h-3.5 ${simulating ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{simulating ? 'Ingesting Feed...' : 'Simulate Live NCRP Webhook'}</span>
              <span className="sm:hidden">{simulating ? 'Ingesting...' : 'Simulate NCRP'}</span>
            </button>

            <div className="hidden sm:flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button 
                onClick={() => setViewMode('local')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${viewMode === 'local' ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Local District
              </button>
              <button 
                onClick={() => setViewMode('national')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${viewMode === 'national' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                National Rollup
              </button>
            </div>

            <button
              onClick={fetchAll}
              disabled={loading}
              className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500
                         hover:text-orange-400 hover:border-orange-500/30 transition-all
                         active:scale-95 flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Error banner ──────────────────────────────────────── */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={fetchAll} className="ml-auto text-[9px] font-black uppercase
                hover:text-red-300 transition-colors">Retry</button>
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === 'national' ? (
          <CrossJurisdictionRollup />
        ) : (
          <>
        {/* ── Stat cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            Array.from({ length: 4 }, (_, i) => <Skeleton.Card key={i} />)
          ) : (
            <>
              <StatCard icon={ClipboardList} label="Complaints Today"
                value={s.total_complaints_today ?? s.complaints_today ?? 0}
                color="#3b82f6" 
                trend={s.trend_complaints_today !== undefined ? s.trend_complaints_today : undefined} 
                sub="vs yesterday" delay={0} />
              <StatCard icon={Zap} label="Active Predictions"
                value={s.active_predictions ?? 0}
                color="#f97316" sub="live ML alerts" delay={0.05} />
              <StatCard icon={CheckCircle} label="Interceptions This Week"
                value={s.intercepted_this_week ?? s.interceptions_week ?? 0}
                color="#22c55e" sub="confirmed stops" delay={0.1} />
              <StatCard icon={DollarSign} label="Amount at Risk"
                value={fmtAmount(s.amount_at_risk ?? 0)}
                color="#ef4444" sub="current active" delay={0.15} />
            </>
          )}
        </div>

        {/* ── Main content area ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Left 2/3 */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">

            {/* Recent complaints table */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-zinc-800/60 overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(16px)' }}
            >
              <div className="p-4 flex items-center justify-between"
                   style={{ borderBottom: '1px solid rgba(249,115,22,0.08)' }}>
                <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                  Recent Complaints
                </h2>
                <button
                  onClick={() => navigate('complaints')}
                  className="flex items-center gap-1 text-[9px] font-black text-zinc-600
                             hover:text-white uppercase transition-colors"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {loading ? (
                <table className="w-full">
                  <tbody>
                    {Array.from({ length: 5 }, (_, i) => <Skeleton.Row key={i} cols={5} />)}
                  </tbody>
                </table>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        {['#', 'Victim', 'Amount', 'Method', 'Status'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[8px] font-black
                                                 uppercase tracking-widest text-zinc-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest">
                            No recent complaints found
                          </td>
                        </tr>
                      ) : (
                        complaints.map((c, i) => (
                        <tr
                          key={c.id ?? i}
                          onClick={() => navigate(`complaints/${c.id}`)}
                          className="cursor-pointer hover:bg-orange-500/[0.04] transition-colors
                                     active:bg-orange-500/10 touch-feedback"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}
                        >
                          <td className="px-4 py-3 text-[9px] font-black text-orange-400 whitespace-nowrap">
                            {c.complaint_number ?? `#${i + 1}`}
                          </td>
                          <td className="px-4 py-3 text-[10px] font-bold text-zinc-300 max-w-[120px] truncate">
                            {c.victim_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-[10px] font-black text-white whitespace-nowrap">
                            {fmtAmount(c.fraud_amount)}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-[9px] text-zinc-500 uppercase">
                            {c.fraud_method}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase
                              ${STATUS_BADGE[c.status] ?? STATUS_BADGE.NEW}`}>
                              {c.status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* Fraud trend chart */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-zinc-800/60 p-4 sm:p-5 space-y-4 overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(16px)' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                  Fraud Trend — Last 30 Days
                </h2>
                <Activity className="w-4 h-4 text-zinc-700" />
              </div>
              {loading ? (
                <Skeleton.FullBlock h={80} />
              ) : (
                <>
                  <div className="relative h-20">
                    <Sparkline data={trend} color="#f97316" height={80} />
                    <div className="absolute left-0 top-0 text-[7px] text-zinc-700 font-bold">MAX</div>
                    <div className="absolute left-0 bottom-0 text-[7px] text-zinc-700 font-bold">0</div>
                  </div>
                  <div className="flex justify-between">
                    {Array.from({ length: 6 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (30 - i * 6));
                      return (
                        <span key={i} className="text-[7px] text-zinc-700 font-bold">
                          {d.getDate()}/{d.getMonth() + 1}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* Right 1/3 */}
          <div className="space-y-4 sm:space-y-6">

            {/* Active predictions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-zinc-800/60 p-4 sm:p-5 space-y-3"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(16px)' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                  Active Predictions
                </h2>
                <button
                  onClick={() => navigate('predictions/heatmap')}
                  className="text-[8px] font-black text-zinc-600 hover:text-white uppercase
                             flex items-center gap-1 transition-colors"
                >
                  Map <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl
                                            border border-zinc-800/40">
                      <Skeleton.Circle size={32} />
                      <div className="flex-1 space-y-2">
                        <Skeleton.Block w="75%" h={10} />
                        <Skeleton.Block w="100%" h={4} r={4} />
                      </div>
                      <Skeleton.Block w={32} h={14} />
                    </div>
                  ))}
                </div>
              ) : predictions.length === 0 ? (
                <p className="text-[10px] text-zinc-700 text-center py-6 font-bold uppercase">
                  No active predictions
                </p>
              ) : (
                predictions.map((p, i) => {
                  const prob = p.probability ?? 0;
                  const color = prob >= 0.7 ? '#ef4444' : prob >= 0.4 ? '#f97316' : '#eab308';
                  return (
                    <div
                      key={p.id ?? i}
                      onClick={() => navigate(`predictions/${p.id}`)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer
                                 hover:bg-zinc-900/60 active:bg-zinc-900 transition-colors
                                 border border-zinc-800/40 touch-feedback"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}1a`, border: `1px solid ${color}40` }}
                      >
                        <span className="text-[9px] font-black" style={{ color }}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-white truncate">
                          {p.predicted_zone_name}
                        </p>
                        <div className="h-1 rounded-full bg-zinc-800 overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(prob * 100).toFixed(0)}%`, background: color }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] font-black flex-shrink-0" style={{ color }}>
                        {(prob * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })
              )}

              <button
                onClick={() => navigate('predictions')}
                className="w-full py-2 rounded-xl text-[8px] font-black uppercase text-orange-400
                           hover:bg-orange-500/10 active:bg-orange-500/20 transition-colors"
                style={{ border: '1px solid rgba(249,115,22,0.2)' }}
              >
                All Predictions →
              </button>
            </motion.div>

            {/* ML Accuracy gauge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-zinc-800/60 p-4 sm:p-5 space-y-3"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(16px)' }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                    Search-Space Reduction (Live API)
                  </h2>
                  <button
                    onClick={() => navigate('model-metrics')}
                    className="text-[8px] font-black text-zinc-500 hover:text-white uppercase flex items-center gap-1 transition-colors"
                  >
                    Metrics <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
                <p className="text-[8px] text-zinc-400 font-medium mt-0.5">
                  Shrinks 700-district search space to top-5 shortlist
                </p>
              </div>
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Skeleton.Circle size={100} />
                  <Skeleton.Text lines={3} className="w-full" />
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <AccuracyGauge
                      value={(modelMetrics?.metrics?.top5 ?? 0) * 100}
                      label="TOP-5 TRIAGE"
                    />
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Top-5 Accuracy', val: ((modelMetrics?.metrics?.top5 ?? 0) * 100).toFixed(1), color: '#22c55e' },
                      { label: 'Top-3 Accuracy', val: ((modelMetrics?.metrics?.top3 ?? 0) * 100).toFixed(1), color: '#f97316' },
                      { label: 'Top-1 Accuracy', val: ((modelMetrics?.metrics?.top1 ?? 0) * 100).toFixed(1), color: '#ef4444' },
                    ].map(m => (
                      <div key={m.label} className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase w-20 flex-shrink-0">
                          {m.label}
                        </span>
                        <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${m.val}%`, background: m.color }}
                          />
                        </div>
                        <span className="text-[8px] font-black text-zinc-400 w-8 text-right">
                          {m.val}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </div>
          </>
        )}
      </div>
    </PageTransition>
  );
};



export default Dashboard;
