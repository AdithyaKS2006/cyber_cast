import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, CheckCircle, XCircle, Clock } from 'lucide-react';

const FreezeCountdownBanner = () => {
  const [activeFreeze, setActiveFreeze] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const handleFreezeEvent = (e) => {
      const payload = e.detail;
      const type = payload.type;
      const data = payload.data;

      if (type === 'freeze_init') {
        const pending = data.find(f => f.status === 'PENDING');
        if (pending) {
          setActiveFreeze(pending);
        }
      } else if (type === 'freeze_requested') {
        // From WebSocket: data has freeze_id, account, amount, bank, eta_minutes
        setActiveFreeze({
          id: data.freeze_id,
          target_account: data.account,
          target_bank_ifsc: data.bank,
          freeze_amount: data.amount,
          status: 'PENDING',
          // Approximate expiry based on ETA if not explicitly provided
          window_expires_at: new Date(Date.now() + (data.eta_minutes || 15) * 60000).toISOString()
        });
      } else if (type === 'freeze_confirmed' || type === 'freeze_failed') {
        if (activeFreeze && data.freeze_id === activeFreeze.id) {
          setActiveFreeze(prev => ({
            ...prev,
            status: type === 'freeze_confirmed' ? 'FROZEN' : 'FAILED',
            message: data.message || data.reason
          }));

          // Clear banner after 5 seconds
          setTimeout(() => {
            setActiveFreeze(null);
          }, 5000);
        }
      }
    };

    window.addEventListener('ws:freeze_ops', handleFreezeEvent);
    return () => window.removeEventListener('ws:freeze_ops', handleFreezeEvent);
  }, [activeFreeze]);

  useEffect(() => {
    if (!activeFreeze || activeFreeze.status !== 'PENDING') return;

    const interval = setInterval(() => {
      if (!activeFreeze.window_expires_at) return;
      const expiry = new Date(activeFreeze.window_expires_at).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeFreeze]);

  if (!activeFreeze) return null;

  // Formatting helpers
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatAmount = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);
  };

  const getStatusColor = () => {
    if (activeFreeze.status === 'FROZEN') return 'bg-emerald-500/20 border-emerald-500 text-emerald-400';
    if (activeFreeze.status === 'FAILED') return 'bg-red-500/20 border-red-500 text-red-400';
    
    if (timeLeft > 300) return 'bg-emerald-500/20 border-emerald-500 text-emerald-400'; // > 5 min
    if (timeLeft > 120) return 'bg-amber-500/20 border-amber-500 text-amber-400'; // 2-5 min
    return 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'; // < 2 min
  };

  const renderIcon = () => {
    if (activeFreeze.status === 'FROZEN') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    if (activeFreeze.status === 'FAILED') return <XCircle className="w-5 h-5 text-red-500" />;
    if (timeLeft <= 120) return <ShieldAlert className="w-5 h-5 text-red-500" />;
    return <Shield className="w-5 h-5" />;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={`w-full border-b border-t shadow-lg backdrop-blur-md px-6 py-3 flex items-center justify-between z-50 ${getStatusColor()}`}
      >
        <div className="flex items-center gap-4">
          {renderIcon()}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              {activeFreeze.status === 'FROZEN' ? 'ACCOUNT FROZEN ✓' : 
               activeFreeze.status === 'FAILED' ? 'FREEZE FAILED ✗' : 
               'AUTOMATED FREEZE INITIATED'}
            </h4>
            <div className="text-xs opacity-80 mt-0.5 flex gap-3">
              <span>Account: ••••{String(activeFreeze.target_account).slice(-4) || 'XXXX'}</span>
              <span>|</span>
              <span>Bank: {activeFreeze.target_bank_ifsc || 'Unknown'}</span>
              <span>|</span>
              <span className="font-mono">{formatAmount(activeFreeze.freeze_amount)}</span>
            </div>
          </div>
        </div>

        {activeFreeze.status === 'PENDING' && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest opacity-80 font-bold mb-1">
              Golden Window
            </span>
            <div className="flex items-center gap-2 font-mono text-2xl font-black">
              <Clock className="w-5 h-5 opacity-70" />
              {formatTime(timeLeft)}
            </div>
          </div>
        )}

        {(activeFreeze.status === 'FROZEN' || activeFreeze.status === 'FAILED') && (
          <div className="text-sm font-medium pr-4">
            {activeFreeze.message || 'I4C Confirmation Received'}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default FreezeCountdownBanner;
