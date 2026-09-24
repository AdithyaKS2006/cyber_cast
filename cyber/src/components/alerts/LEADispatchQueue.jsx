/**
 * LEADispatchQueue.jsx - Field Officer LEA Dispatch View (F9)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, CheckCircle, Clock, Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import PageTransition from '../ui/PageTransition';

const STATUS = {
  SENT:         { label: 'Pending Action', bg: 'rgba(249,115,22,0.12)', color: '#f97316', border: 'rgba(249,115,22,0.3)' },
  ACKNOWLEDGED: { label: 'Acknowledged',   bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  RESOLVED:     { label: 'Resolved',       bg: 'rgba(16,185,129,0.12)',  color: '#10b981', border: 'rgba(16,185,129,0.3)' },
};

const DispatchCard = ({ dispatch, onAck, onOutcome, idx }) => {
  const s = STATUS[dispatch.status] || STATUS.SENT;
  const canAct = dispatch.status === 'SENT';
  const canResolve = dispatch.status === 'ACKNOWLEDGED';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ delay: idx * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`p-4 rounded-2xl border space-y-3 transition-colors relative overflow-hidden`}
      style={{
        background: 'rgba(0,0,0,0.65)',
        borderColor: 'rgba(39,39,42,0.6)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wide">
            {typeof dispatch.complaint_number === 'object' ? JSON.stringify(dispatch.complaint_number) : String(dispatch.complaint_number ?? `PKG-${typeof dispatch.package === 'object' ? JSON.stringify(dispatch.package) : (dispatch.package ?? '')}`)}
          </p>
          <p className="text-xl font-black text-white">
            ₹{Number(dispatch.fraud_amount ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <span
          className="text-[7px] font-black uppercase rounded px-2 py-0.5 flex-shrink-0 mt-0.5"
          style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
        >
          {s.label}
        </span>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <p className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">Target District</p>
          <p className="text-[11px] font-black text-white leading-tight">
            {typeof dispatch.target_district === 'object' && dispatch.target_district !== null ? (dispatch.target_district.name || JSON.stringify(dispatch.target_district)) : String(dispatch.target_district ?? '—')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">Predicted Zone</p>
          <p className="text-[11px] font-black text-zinc-300 leading-none">
            {typeof dispatch.predicted_zone_name === 'object' && dispatch.predicted_zone_name !== null ? (dispatch.predicted_zone_name.name || JSON.stringify(dispatch.predicted_zone_name)) : String(dispatch.predicted_zone_name ?? '—')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/50">
        <Clock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        <span className="text-[10px] font-black uppercase text-zinc-400">
          Dispatched: {new Date(dispatch.sent_at).toLocaleString('en-IN')}
        </span>
      </div>

      {canAct ? (
        <button
          onClick={() => onAck(dispatch)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px]
                     font-black uppercase text-white transition-all hover:scale-[1.02] active:scale-95 touch-feedback"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          <CheckCircle className="w-4 h-4" /> Acknowledge Dispatch
        </button>
      ) : canResolve ? (
        <div className="space-y-2">
          <div className="text-[9px] text-zinc-500 font-bold uppercase text-center">Log Field Outcome</div>
          <div className="flex gap-2">
            <button
              onClick={() => onOutcome(dispatch, 'INTERCEPTED')}
              className="flex-1 py-2 rounded-xl text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
            >
              Intercepted
            </button>
            <button
              onClick={() => onOutcome(dispatch, 'MISSED')}
              className="flex-1 py-2 rounded-xl text-[8px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all"
            >
              Missed
            </button>
            <button
              onClick={() => onOutcome(dispatch, 'FALSE_ALARM')}
              className="flex-1 py-2 rounded-xl text-[8px] font-black uppercase text-zinc-400 bg-zinc-500/10 border border-zinc-500/30 hover:bg-zinc-500/20 transition-all"
            >
              False Alarm
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px]
                     font-black uppercase text-zinc-500 bg-zinc-900 border border-zinc-800">
          <CheckCircle className="w-4 h-4 text-emerald-500" /> Resolved
        </div>
      )}
    </motion.div>
  );
};

const LEADispatchQueue = () => {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const fetchDispatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient('/api/v1/predictions/lea-dispatches/');
      if (res.ok) {
        const data = await res.json();
        setDispatches(Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []));
      } else {
        setError(`Server returned ${res.status}`);
      }
    } catch (err) {
      const msg = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
      setError(msg || 'Failed to fetch dispatches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDispatches(); }, [fetchDispatches]);

  const handleAck = async (dispatch) => {
    try {
      await apiClient(`/api/v1/predictions/lea-dispatches/${dispatch.id}/acknowledge/`, { method: 'POST' });
      setDispatches(prev => prev.map(d => d.id === dispatch.id ? { ...d, status: 'ACKNOWLEDGED', acknowledged_at: new Date().toISOString() } : d));
    } catch (err) {
      const msg = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
      alert("Failed to acknowledge: " + msg);
    }
  };

  const handleOutcome = async (dispatch, outcome) => {
    try {
      await apiClient(`/api/v1/predictions/lea-dispatches/${dispatch.id}/outcome/`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      });
      setDispatches(prev => prev.map(d => d.id === dispatch.id ? { ...d, status: 'RESOLVED' } : d));
    } catch (err) {
      const msg = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
      alert("Failed to update outcome: " + msg);
    }
  };

  const displayed = dispatches.filter(d => {
    if (filter === 'ALL') return d.status !== 'RESOLVED';
    return d.status === filter;
  });
  
  const sentCount = dispatches.filter(d => d.status === 'SENT').length;

  return (
    <PageTransition>
      <div className="min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6" style={{ background: 'linear-gradient(135deg,#000,#080808)' }}>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Crosshair className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              {sentCount > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500
                             flex items-center justify-center text-[8px] font-black text-white"
                >
                  {sentCount}
                </motion.span>
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Incoming Dispatches
              </h1>
              <p className="text-[9px] text-zinc-500 font-bold uppercase">
                LEA Operations Queue · {displayed.length} shown
              </p>
            </div>
          </div>

          <button onClick={fetchDispatches} disabled={loading}
            className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500
                       hover:text-emerald-400 hover:border-emerald-500/30 transition-all active:scale-95"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-amber-400"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Could not load dispatches. {typeof error === 'object' ? JSON.stringify(error) : String(error)}</span>
          </motion.div>
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['ALL', 'SENT', 'ACKNOWLEDGED', 'RESOLVED'].map(tab => (
            <button
              key={tab} onClick={() => setFilter(tab)}
              className="flex-shrink-0 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all touch-feedback"
              style={filter === tab
                ? { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }
                : { background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(39,39,42,0.8)', color: '#71717a' }
              }
            >
              {tab === 'ALL' ? 'ACTIVE' : tab}
              {tab === 'SENT' && sentCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[7px]">{sentCount}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, i) => <Skeleton.AlertCard key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState icon={Shield} title={`No ${filter !== 'ALL' ? filter.toLowerCase() : 'active'} dispatches`}
                      message="No incoming LEA operations in the queue." />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayed.map((d, i) => (
                <DispatchCard key={d.id} dispatch={d} idx={i} onAck={handleAck} onOutcome={handleOutcome} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </PageTransition>
  );
};

export default LEADispatchQueue;
