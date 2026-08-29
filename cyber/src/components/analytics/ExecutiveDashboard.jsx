import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip } from 'recharts';
import { Shield, TrendingUp, TrendingDown, RefreshCw, FileDown, Award, MapPin, CheckCircle2, AlertTriangle, IndianRupee } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import apiClient from '../../utils/apiClient';

import InterdictionImpactChart from './InterdictionImpactChart';

const formatINR = (val) => {
  if (!val || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const ExecutiveDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/api/v1/analytics/executive-summary/');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load executive summary', err);
      toast.error('Unable to synchronize real-time analytics stream');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(() => {
      setRefreshCountdown((c) => {
        if (c <= 1) {
          fetchSummary();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExportPDF = () => {
    toast.success("Generating Real-Time CrimeCast Intelligence Audit PDF...");
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const riskScore = data?.risk_score ?? 45;
  const riskLevel = data?.risk_level ?? 'MODERATE';
  const riskColor = riskLevel === 'CRITICAL' ? '#ef4444' : riskLevel === 'HIGH' ? '#f97316' : '#eab308';

  const strokeDashoffset = 502 - (502 * (riskScore / 100));

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Executive Overview</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
            Real-Time Cybercrime Telemetry & Financial Interception Metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/60 border border-orange-900/20 text-[10px] font-mono text-zinc-400">
            <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin" style={{ animationDuration: '4s' }} />
            <span>LIVE SYNC IN <span className="text-orange-500 font-bold">{refreshCountdown}S</span></span>
          </div>
          <Button onClick={handleExportPDF} size="sm" className="flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            <span>EXPORT AUDIT PDF</span>
          </Button>
        </div>
      </div>

      {/* PRD Section 5.4 Headline Slide Interdiction Impact Chart */}
      <InterdictionImpactChart />

      {/* Row 1: Real-Time Risk Score */}
      <Card className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-zinc-950 to-zinc-900/40 border border-orange-500/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-red-600" />
        <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">
          Active Cybercrime Risk Index
        </p>
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#18181b" strokeWidth="16" />
            <motion.circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke={riskColor}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray="502"
              initial={{ strokeDashoffset: 502 }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-white leading-none">
              {riskScore}<span className="text-lg text-zinc-500 font-normal">/100</span>
            </span>
            <span
              className="text-[10px] font-black uppercase tracking-widest mt-2 px-2.5 py-0.5 rounded bg-zinc-900 border"
              style={{ color: riskColor, borderColor: `${riskColor}40` }}
            >
              {riskLevel} RISK
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-400 max-w-lg mt-6 uppercase leading-relaxed font-mono">
          AGGREGATED REAL-TIME POSTURE INDEX DERIVED FROM PENDING CASHOUT PREDICTIONS, INGESTED FRAUD COMPLAINTS, AND FIELD INTERCEPTION RATIOS.
        </p>
      </Card>

      {/* Row 2: Live Database KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Ingested Complaints */}
        <Card className="p-5 flex flex-col justify-between border-orange-500/10">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Total Fraud Incidents</span>
            <div className="p-2 rounded bg-orange-950/30 border border-orange-500/20 text-orange-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-white tracking-tighter">{data?.total_complaints ?? 0}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Recorded in CrimeCast Database</p>
          </div>
        </Card>

        {/* Total Stolen Funds */}
        <Card className="p-5 flex flex-col justify-between border-red-500/10">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Total Stolen Amount</span>
            <div className="p-2 rounded bg-red-950/30 border border-red-500/20 text-red-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-white tracking-tighter">{formatINR(data?.total_stolen_amount)}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Aggregate Reported Financial Loss</p>
          </div>
        </Card>

        {/* Cash-Out Forecasts Generated */}
        <Card className="p-5 flex flex-col justify-between border-orange-500/10">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Cash-Out Forecasts</span>
            <div className="p-2 rounded bg-orange-950/30 border border-orange-500/20 text-orange-400">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-white tracking-tighter">{data?.total_predictions ?? 0}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">
              {data?.pending_review_count ?? 0} Pending Active Review
            </p>
          </div>
        </Card>

        {/* Intercepted Funds Saved */}
        <Card className="p-5 flex flex-col justify-between border-emerald-500/10">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Funds Saved / Intercepted</span>
            <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-emerald-400 tracking-tighter">{formatINR(data?.funds_saved_amount)}</p>
            <p className="text-[10px] font-bold text-emerald-500/80 uppercase mt-1">
              {data?.interception_rate ?? 0}% Interception Rate
            </p>
          </div>
        </Card>
      </div>

      {/* Row 3: Top Predicted Cash-Out Hotspots & Fraud Vectors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Top Predicted Cash-Out Hotspots */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Top Forecasted Cash-Out Zones" subtitle="High-Probability Stolen Fund Withdrawal Districts" className="h-full">
            <div className="space-y-3 mt-4">
              {data?.top_cashout_zones && data.top_cashout_zones.length > 0 ? (
                data.top_cashout_zones.map((zone, idx) => (
                  <div
                    key={zone.zone}
                    className="p-4 rounded-xl bg-zinc-950/60 border border-orange-900/15 flex items-center justify-between hover:border-orange-500/30 transition-all font-mono"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-black text-orange-500">#{idx + 1}</span>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase">{zone.zone}</h4>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase mt-0.5">
                          Predicted Cash-Out District
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-[8px] font-bold text-zinc-500 uppercase mb-0.5">FORECASTS</p>
                        <span className="text-xs font-black text-orange-400 px-2 py-0.5 rounded bg-orange-950/30 border border-orange-500/20">
                          {zone.count}
                        </span>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-zinc-500 uppercase mb-0.5">CONFIDENCE</p>
                        <span className="text-xs font-black text-emerald-400">{zone.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs uppercase">
                  No predictions generated yet. Seed or ingest complaints to view high-risk zones.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Fraud Method Breakdown */}
        <div className="space-y-6 flex flex-col justify-between">
          <Card title="Fraud Vector Breakdown" subtitle="Distribution by Modus Operandi" className="flex-1 min-h-[280px]">
            <div className="h-full min-h-[220px] w-full mt-4">
              {data?.fraud_method_breakdown && data.fraud_method_breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <BarChart data={data.fraud_method_breakdown} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" stroke="#52525b" fontSize={9} tick={{ fill: '#71717a' }} hide />
                    <YAxis type="category" dataKey="method" stroke="#52525b" fontSize={9} tick={{ fill: '#a1a1aa' }} width={90} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '10px' }} />
                    <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]}>
                      {data.fraud_method_breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f97316' : '#ea580c'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs uppercase">
                  No incident vector data available.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
