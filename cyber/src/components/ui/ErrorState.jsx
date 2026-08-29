/**
 * ErrorState.jsx — Error state with retry button for CrimeCast
 * Usage: <ErrorState message="Failed to load complaints" onRetry={fetchComplaints} />
 */
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

const ErrorState = ({
  message = 'Something went wrong',
  detail = '',
  onRetry = null,
  onBack = null,
  compact = false,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}
  >
    {/* Error icon */}
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative"
      style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'radial-gradient(circle at center, rgba(239,68,68,0.12), transparent 70%)',
        }}
      />
      <AlertTriangle className="w-7 h-7 text-red-400 relative z-10" />
    </div>

    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">
      {message}
    </h3>
    {detail && (
      <p className="text-xs text-zinc-600 max-w-xs mb-1 leading-relaxed font-mono">{detail}</p>
    )}
    <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
      Check your connection or try again.
    </p>

    <div className="flex items-center gap-3 mt-5">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest
                     border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500
                     transition-all duration-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest
                     text-white transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  </motion.div>
);

export default ErrorState;
