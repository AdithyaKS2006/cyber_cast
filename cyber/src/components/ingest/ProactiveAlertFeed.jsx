import React, { useState, useEffect } from 'react';
import { Shield, Zap, Building2, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../utils/apiClient';

const ProactiveAlertFeed = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await apiClient('/api/v2/ingest/alerts/');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.results || data);
      }
    } catch (e) {
      console.error('Failed to fetch alerts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatAmount = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);
  
  const formatDate = (iso) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Ingest Operations Feed</h1>
          <p className="text-zinc-400 text-sm">Real-time NPCI and Core Banking webhook feed.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase font-bold text-emerald-400">Live Intake</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading && alerts.length === 0 ? (
          <div className="text-zinc-500 p-6 text-sm">Listening for incoming webhooks...</div>
        ) : (
          <AnimatePresence>
            {alerts.map((alert) => (
              <motion.div
                key={alert.id || alert.alert_id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-xl p-4 border border-zinc-800 bg-zinc-950/80 hover:border-orange-500/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                      alert.source === 'NPCI' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    }`}>
                      {alert.source === 'NPCI' ? <Shield className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                        {alert.source} Webhook
                        <span className="text-[9px] text-zinc-500 lowercase bg-zinc-900 px-1.5 py-0.5 rounded">
                          {formatDate(alert.created_at)}
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Alert ID: <span className="font-mono text-zinc-300">{alert.alert_id}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Target Account</p>
                      <p className="font-mono text-sm text-zinc-200">
                        {alert.to_bank_ifsc} ••••{alert.to_account?.slice(-4) || 'XXXX'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Exposure</p>
                      <p className="font-mono text-sm font-bold text-orange-400">{formatAmount(alert.amount)}</p>
                    </div>

                    <div className="text-right w-24">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Fraud Score</p>
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${alert.fraud_score * 100}%`,
                              background: alert.fraud_score > 0.8 ? '#ef4444' : alert.fraud_score > 0.5 ? '#f59e0b' : '#3b82f6'
                            }}
                          />
                        </div>
                        <span className={`text-xs font-black ${
                          alert.fraud_score > 0.8 ? 'text-red-400' : alert.fraud_score > 0.5 ? 'text-amber-400' : 'text-blue-400'
                        }`}>
                          {(alert.fraud_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                       {alert.status === 'RECEIVED' ? (
                         <div className="flex items-center gap-1 text-zinc-400 text-[10px] uppercase font-bold bg-zinc-900 px-2 py-1 rounded">
                           <Clock className="w-3 h-3" /> Processing
                         </div>
                       ) : (
                         <div className="flex items-center gap-1 text-emerald-400 text-[10px] uppercase font-bold bg-emerald-500/10 px-2 py-1 rounded">
                           <CheckCircle className="w-3 h-3" /> {alert.status}
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ProactiveAlertFeed;
