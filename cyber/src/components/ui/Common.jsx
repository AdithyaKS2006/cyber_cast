import React from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from './Card';
import Badge from './Badge';

export { Card, Badge };
export const CardHeader = ({ children, className = '' }) => <div className={`p-4 ${className}`}>{children}</div>;
export const CardTitle = ({ children, className = '' }) => <h3 className={`font-bold ${className}`}>{children}</h3>;
export const CardContent = ({ children, className = '' }) => <div className={`p-4 ${className}`}>{children}</div>;

export const GlobalStyles = () => (
  <style>{`
    /* All global styles are now in index.css */
  `}</style>
);

export const Logo = ({ className = '', hideText = false }) => (
  <motion.div
    whileHover={{ scale: 1.05, rotate: -2 }}
    className={`flex items-center gap-3 transition-all duration-500 ${className}`}
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xl relative overflow-hidden group"
         style={{ background: 'linear-gradient(135deg, #f97316, #ef4444, #dc2626)', backgroundSize: '200% 200%', animation: 'gradientShift 3s ease infinite' }}>
      <Shield className="w-6 h-6 text-white group-hover:scale-110 transition-transform relative z-10" />
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    {!hideText && (
      <div className="flex flex-col leading-none">
        <span className="text-xl font-black text-white tracking-tighter uppercase">Crime</span>
        <span className="text-[10px] font-black tracking-[0.3em] uppercase"
              style={{ background: 'linear-gradient(90deg, #f97316, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Cast</span>
      </div>
    )}
  </motion.div>
);

export const StatusIndicator = ({ status = 'ONLINE', color = 'orange' }) => (
  <div className="flex items-center gap-2">
    <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500 animate-pulse shadow-[0_0_8px_#f97316]`} />
    <span className={`text-[8px] font-black text-${color}-400 uppercase tracking-widest`}>{status}</span>
  </div>
);

export const ScrollableContainer = ({ children, className = '' }) => (
  <div className={`overflow-y-auto custom-scrollbar ${className}`}>
    {children}
  </div>
);

export const LoadingScreen = () => (
  <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 z-[1000]">
    {/* Background orbs */}
    <div className="orb orb-orange w-96 h-96 -top-20 -left-20" />
    <div className="orb orb-purple w-64 h-64 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

    <Logo className="scale-150 mb-8 animate-float" />
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        <div className="absolute inset-0 blur-xl bg-orange-500/30 animate-pulse" />
      </div>
      <span className="text-[10px] font-black gradient-text uppercase tracking-[0.5em]">
        Initializing Predictive Intelligence Engine...
      </span>
      <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden mt-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #f97316, #ef4444, #8b5cf6)' }}
        />
      </div>
    </div>
  </div>
);
