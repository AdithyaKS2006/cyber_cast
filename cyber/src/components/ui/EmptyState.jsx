/**
 * EmptyState.jsx — Branded empty state for CrimeCast
 * Usage: <EmptyState icon={ClipboardList} title="No complaints yet"
 *          message="Register the first complaint to start predictions."
 *          action={{ label: 'File Complaint', onClick: () => navigate('complaint-form') }} />
 */
import React from 'react';
import { motion } from 'framer-motion';

const EmptyState = ({
  icon: Icon,
  title = 'Nothing here yet',
  message = '',
  action = null,
  compact = false,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}
  >
    {/* Icon ring */}
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative"
      style={{
        background: 'rgba(249,115,22,0.08)',
        border: '1px solid rgba(249,115,22,0.2)',
      }}
    >
      {/* Subtle glow */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'radial-gradient(circle at center, rgba(249,115,22,0.15), transparent 70%)',
        }}
      />
      {Icon && <Icon className="w-7 h-7 text-orange-400 relative z-10" />}
    </div>

    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">{typeof title === 'object' ? JSON.stringify(title) : String(title)}</h3>
    {message && (
      <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">{typeof message === 'object' ? JSON.stringify(message) : String(message)}</p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest
                   text-black transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
      >
        {action.label}
      </button>
    )}
  </motion.div>
);

export default EmptyState;
