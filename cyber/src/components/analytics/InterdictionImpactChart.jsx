import React from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Clock, ShieldCheck, Zap, ArrowRight, Activity, TrendingUp } from 'lucide-react';

const InterdictionImpactChart = () => {
  // PRD 5.4 Calibrated Benchmark Data
  const timeToFreezeData = [
    { mode: 'No-Tool Baseline', hours: 36.4, color: '#ef4444' },
    { mode: 'CrimeCast Flow', hours: 2.8, color: '#22c55e' }
  ];

  const interdictionRateData = [
    { mode: 'No-Tool Baseline', rate: 4.8, color: '#ef4444' },
    { mode: 'CrimeCast Flow', rate: 68.4, color: '#f97316' }
  ];

  return (
    <div className="relative rounded-3xl border border-orange-500/30 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-6 md:p-8 space-y-8 overflow-hidden shadow-[0_0_50px_rgba(249,115,22,0.08)]">
      {/* Background Ambient Glow Effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
              <Zap className="w-3 h-3 animate-pulse" />
              HEADLINE INTERDICTION BENCHMARK
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold tracking-wide">
              ⚡ [BASED ON CALIBRATED SYNTHETIC DATA]
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            Triage & Dispatch Operational Impact
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Comparing Traditional Manual Police Reporting vs. CrimeCast AI-Driven Interdiction Flow
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Headline Outcome</p>
            <p className="text-lg font-black text-emerald-400 leading-none mt-0.5">14.25x Interdiction Gain</p>
          </div>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {/* Metric 1: Time-to-Freeze Reduction */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-emerald-500/30 transition-all space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Time-To-Freeze Reduction</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-black">
              -92.3% Faster
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-black/60 border border-red-500/20">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">No-Tool Baseline</p>
              <p className="text-3xl font-black text-red-400 mt-1">36.4 <span className="text-sm font-bold text-zinc-500">hrs</span></p>
              <p className="text-[9px] text-zinc-500 mt-1">Manual FIR & Slow Notices</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <p className="text-[10px] font-bold text-emerald-400 uppercase">CrimeCast AI Flow</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">2.8 <span className="text-sm font-bold text-emerald-500">hrs</span></p>
              <p className="text-[9px] text-emerald-300/80 mt-1">Instant I4C Nodal Dispatch</p>
            </div>
          </div>

          {/* Bar Visualization */}
          <div className="h-28 min-h-[112px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <BarChart data={timeToFreezeData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="mode" stroke="#71717a" fontSize={10} tick={{ fill: '#a1a1aa' }} width={110} />
                <Tooltip 
                  formatter={(val) => [`${val} Hours`, 'Avg Time-to-Freeze']}
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }} 
                />
                <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={18}>
                  {timeToFreezeData.map((entry, index) => (
                    <Cell key={`cell-t-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Metric 2: Interdiction Rate (%) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-orange-500/30 transition-all space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-950/40 border border-orange-500/30 text-orange-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide">% Fraud Chains Interdicted</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-black">
              14.25x Increase
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-black/60 border border-red-500/20">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">No-Tool Baseline</p>
              <p className="text-3xl font-black text-red-400 mt-1">4.8%</p>
              <p className="text-[9px] text-zinc-500 mt-1">Delayed Reaction / Gone</p>
            </div>
            <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
              <p className="text-[10px] font-bold text-orange-400 uppercase">CrimeCast AI Flow</p>
              <p className="text-3xl font-black text-orange-400 mt-1">68.4%</p>
              <p className="text-[9px] text-orange-300/80 mt-1">Interdicted Before Cash-Out</p>
            </div>
          </div>

          {/* Bar Visualization */}
          <div className="h-28 min-h-[112px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <BarChart data={interdictionRateData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="mode" stroke="#71717a" fontSize={10} tick={{ fill: '#a1a1aa' }} width={110} />
                <Tooltip 
                  formatter={(val) => [`${val}%`, 'Interdiction Success Rate']}
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }} 
                />
                <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={18}>
                  {interdictionRateData.map((entry, index) => (
                    <Cell key={`cell-i-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Footer Audit Statement */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400 relative z-10 font-mono">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-400 shrink-0" />
          <span>
            <strong>Simulation Methodology (PRD Section 5.4):</strong> Evaluated over N=55,000 calibrated synthetic fraud chains matching published NCRB & RBI macro telemetry.
          </span>
        </div>
        <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-300 uppercase shrink-0">
          SIH 2026 Headline Slide Benchmark
        </span>
      </div>
    </div>
  );
};

export default InterdictionImpactChart;
