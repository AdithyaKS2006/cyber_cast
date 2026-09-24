import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, CheckCircle, XCircle, Clock, Trash, FileText } from 'lucide-react';
import apiClient from '../../utils/apiClient';

const FreezeOpsDashboard = () => {
  const [freezeRequests, setFreezeRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFreezeRequests = async () => {
    try {
      const res = await apiClient('/api/v1/freeze/queue/');
      if (res.ok) {
        const data = await res.json();
        setFreezeRequests(data.results || data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadNotice = async (freezeId) => {
    try {
      const res = await apiClient(`/api/v2/freeze/${freezeId}/notice/`);
      if (!res.ok) throw new Error('Failed to download PDF notice');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BNSS_Sec106_FreezeNotice_${freezeId.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Could not download Section 106 Notice PDF.');
    }
  };


  useEffect(() => {
    fetchFreezeRequests();

    const handleWsEvent = (e) => {
      const payload = e.detail;
      const type = payload.type;
      const data = payload.data;

      if (type === 'freeze_init') {
        // We can just merge or replace, let's merge existing
      } else if (type === 'freeze_requested') {
        setFreezeRequests(prev => {
          const newReq = {
            id: data.freeze_id,
            target_account: data.account,
            target_bank_ifsc: data.bank,
            freeze_amount: data.amount,
            status: 'PENDING',
            window_expires_at: new Date(Date.now() + (data.eta_minutes || 15) * 60000).toISOString(),
            requested_at: new Date().toISOString()
          };
          return [newReq, ...prev.filter(r => r.id !== newReq.id)];
        });
      } else if (type === 'freeze_confirmed' || type === 'freeze_failed') {
        setFreezeRequests(prev => prev.map(req => {
          if (req.id === data.freeze_id) {
            return {
              ...req,
              status: type === 'freeze_confirmed' ? 'FROZEN' : 'FAILED',
              failure_reason: data.reason || data.message
            };
          }
          return req;
        }));
      }
    };

    window.addEventListener('ws:freeze_ops', handleWsEvent);
    return () => window.removeEventListener('ws:freeze_ops', handleWsEvent);
  }, []);

  const handleRevoke = async (id) => {
    try {
      // Dummy revoke endpoint or real one
      setFreezeRequests(prev => prev.map(req => {
        if (req.id === id) return { ...req, status: 'REVOKED' };
        return req;
      }));
    } catch (e) {
      console.error('Failed to revoke', e);
    }
  };

  const formatAmount = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  if (loading) return <div className="text-zinc-400 p-6">Loading Freeze Operations...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Freeze Operations Center</h1>
        <p className="text-zinc-400 text-sm">Real-time proactive interdiction & I4C freeze queue monitoring.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {freezeRequests.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center text-zinc-500 rounded-xl">
            <Shield className="w-12 h-12 mb-4 opacity-20" />
            <p>No freeze requests active.</p>
          </div>
        ) : (
          <AnimatePresence>
            {freezeRequests.map((req) => (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-xl p-5 border-l-4 ${
                  req.status === 'FROZEN' ? 'border-emerald-500' :
                  req.status === 'FAILED' ? 'border-red-500' :
                  req.status === 'REVOKED' ? 'border-zinc-500' :
                  'border-amber-500'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {req.status === 'FROZEN' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                       req.status === 'FAILED' ? <XCircle className="w-4 h-4 text-red-500" /> :
                       <ShieldAlert className="w-4 h-4 text-amber-500" />}
                      <h3 className="font-bold text-sm tracking-widest uppercase">
                        {req.status} - {req.target_bank_ifsc || 'Unknown Bank'}
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Account: <span className="text-white font-mono">{req.target_account}</span> | 
                      Amount: <span className="text-orange-400 font-mono font-bold ml-1">{formatAmount(req.freeze_amount)}</span>
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Request ID: {req.id} {req.i4c_freeze_id ? `| I4C Ref: ${req.i4c_freeze_id}` : ''}
                    </p>
                    {req.failure_reason && (
                      <p className="text-xs text-red-400 mt-2 bg-red-500/10 p-2 rounded">{req.failure_reason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {req.status === 'PENDING' && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-zinc-500 block mb-1">Golden Window</span>
                        <div className="text-amber-500 font-mono font-bold animate-pulse">
                          Expiring Soon
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleDownloadNotice(req.id)}
                      className="px-3 py-1.5 text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-lg transition-colors text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-zinc-700/60"
                      title="Download Court-Ready BNSS Sec 106 Freezing Directive PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-orange-400" />
                      <span>Sec 106 Notice (PDF)</span>
                    </button>
                    
                    {req.status === 'FROZEN' && (
                      <button 
                        onClick={() => handleRevoke(req.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 bg-black/20 rounded-md transition-colors text-xs uppercase tracking-widest flex items-center gap-1"
                      >
                        <Trash className="w-3 h-3" /> Revoke
                      </button>
                    )}
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

export default FreezeOpsDashboard;
