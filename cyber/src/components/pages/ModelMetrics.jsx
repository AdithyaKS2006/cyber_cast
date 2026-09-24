import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../../utils/apiClient';
import InterdictionImpactChart from '../analytics/InterdictionImpactChart';

const ModelMetrics = ({ navigate }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient('/api/v1/predictions/data/model-metrics/')
      .then(r => r.json())
      .then(data => { setMetrics(data); setLoading(false); })
      .catch(e => {
        const msg = typeof e === 'object' ? (e.message || JSON.stringify(e)) : String(e);
        setError(msg || 'Failed to load model metrics');
        setLoading(false);
      });
  }, []);

  const fade = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  const AccuracyBar = ({ label, value, color, baseline, baselineLabel }) => {
    const delta = value - (baseline || 0);
    const deltaStr = `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)} pts`;
    return (
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <div>
            <span className="text-sm text-gray-400 block">{label}</span>
            {baseline !== undefined && (
              <span className="text-xs text-gray-500">
                {baselineLabel}: {(baseline * 100).toFixed(1)}%{' '}
                <span className={delta > 0 ? 'text-green-400' : 'text-red-400'}>({deltaStr})</span>
              </span>
            )}
          </div>
          <span className="font-bold text-white text-lg">{(value * 100).toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${value * 100}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </div>
    );
  };

  const Stat = ({ label, value, sub, icon, color }) => (
    <motion.div {...fade} className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold" style={{ color }}>{value}</p>
          {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </motion.div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-center text-red-400">
      <p className="text-xl mb-2">⚠️ Could not load model metrics</p>
      <p className="text-sm text-gray-500">{typeof error === 'object' ? JSON.stringify(error) : String(error)}</p>
    </div>
  );

  // Real report shape: { dataset_source, num_zones, num_features,
  //   metrics: { top1, top3, top5 }, baselines: {...}, live_stats: {...} }
  const m = metrics?.metrics ?? {};
  const top1 = m.top1 ?? 0;
  const top3 = m.top3 ?? 0;
  const top5 = m.top5 ?? 0;
  const b = metrics?.baselines ?? {};
  const numZones = metrics?.num_zones ?? 40;
  const numFeatures = metrics?.num_features ?? 40;
  const live = metrics?.live_stats ?? {};
  const randomChance = 1 / (numZones || 40);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div {...fade} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🧠</span>
          <h1 className="text-3xl font-black text-white">Model Performance Metrics</h1>
        </div>
        <p className="text-gray-400 ml-12">
          Single Calibrated LightGBM &nbsp;·&nbsp;
          {numZones}-district classifier &nbsp;·&nbsp;
          {numFeatures} engineered features
        </p>
        <div className="ml-12 mt-2 flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 bg-green-900/40 text-green-400 border border-green-700 rounded-full text-xs font-semibold">
            ✓ LIVE PRODUCTION MODEL
          </span>
          <span className="px-3 py-1 bg-amber-900/40 text-amber-400 border border-amber-700 rounded-full text-xs font-semibold">
            Search Space: 700 → 5 Districts
          </span>
          <span className="px-3 py-1 bg-blue-900/40 text-blue-400 border border-blue-700 rounded-full text-xs font-semibold">
            {numZones} District Classes
          </span>
          <span className="px-3 py-1 bg-purple-900/40 text-purple-400 border border-purple-700 rounded-full text-xs font-semibold">
            {numFeatures} Features
          </span>
        </div>
      </motion.div>

      {/* Live Stats Row (real DB counts) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Total Predictions" value={live.total_predictions ?? 0} icon="🔮" color="#f97316" />
        <Stat label="Intercepted" value={live.intercepted ?? 0} icon="✅" color="#22c55e" />
        <Stat label="Needs Review" value={live.needs_review ?? 0} sub="Below τ=0.60 — awaiting analyst" icon="🔎" color="#eab308" />
        <Stat label="Real-World Field Precision" value={live.interception_rate != null ? `${live.interception_rate}%` : 'N/A'} sub={live.interception_rate != null ? `Based on ${live.resolved} confirmed field outcomes` : 'No field outcomes yet'} icon="🎯" color="#10b981" />
      </div>

      {/* PRD Section 5.4 Headline Slide Interdiction Impact Chart */}
      <div className="mb-8">
        <InterdictionImpactChart />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Accuracy Card — real top-1/3/5 vs honest baselines */}
        <motion.div {...fade} className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            📊 District Prediction Accuracy
            <span className="text-xs text-gray-500 font-normal ml-auto">Temporally held-out test set</span>
          </h2>

          <AccuracyBar
            label="Top-1 Accuracy (exact district)"
            value={top1}
            color="linear-gradient(90deg, #f97316, #ef4444)"
            baseline={randomChance}
            baselineLabel="Random chance"
          />
          <AccuracyBar
            label="Top-3 Accuracy (district in top 3)"
            value={top3}
            color="linear-gradient(90deg, #eab308, #f97316)"
            baseline={b.nearest_top3}
            baselineLabel="Nearest-district rule"
          />
          <AccuracyBar
            label="Top-5 Accuracy (district in top 5)"
            value={top5}
            color="linear-gradient(90deg, #22c55e, #16a34a)"
            baseline={5 * randomChance}
            baselineLabel="Random chance"
          />

          <div className="mt-5 p-4 bg-green-900/20 border border-green-700/40 rounded-lg">
            <p className="text-green-400 font-bold text-sm">
              ✓ {(top3 * 100).toFixed(1)}% Top-3 accuracy — officers patrol the correct district in
              ~{Math.round(top3 * 100)}% of cases, beating the nearest-district heuristic
              ({((b.nearest_top3 ?? 0) * 100).toFixed(1)}%) by {((b.nearest_delta ?? (top3 - (b.nearest_top3 ?? 0))) * 100).toFixed(1)} points.
            </p>
          </div>
        </motion.div>

        {/* Honest baselines + architecture (replaces the old fabricated SVM block) */}
        <motion.div {...fade} className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">🏗️ Model Architecture & Honest Baselines</h2>

          <p className="text-gray-400 text-sm mb-4">
            Single calibrated LightGBM classifier with probability calibration over {numZones} candidate districts:
          </p>
          <div className="space-y-2 mb-5">
            <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
              <span className="text-white font-semibold text-sm">LightGBM</span>
              <p className="text-gray-500 text-xs mt-0.5">Gradient-boosted trees — handles tabular fraud signals and class imbalance</p>
            </div>
          </div>

          <h3 className="text-gray-300 font-semibold text-sm mb-2">Top-3 accuracy vs baselines</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white">Our model</span>
              <span className="font-bold text-green-400">{(top3 * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Nearest-district rule</span>
              <span className="text-gray-300">{((b.nearest_top3 ?? 0) * 100).toFixed(1)}% <span className="text-green-500 text-xs">(+{((b.nearest_delta ?? 0) * 100).toFixed(1)})</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Majority-class</span>
              <span className="text-gray-300">{((b.majority_top3 ?? 0) * 100).toFixed(1)}% <span className="text-green-500 text-xs">(+{((b.majority_delta ?? 0) * 100).toFixed(1)})</span></span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/40 rounded-lg">
            <p className="text-blue-400 text-xs">
              Metrics computed on a temporally held-out test set. Alternative approaches were evaluated but dropped — they added variance without lift over a single calibrated LightGBM.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Dataset & Feature Signal Audit (PRD Section 5.2) */}
      <motion.div {...fade} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-gray-200 font-bold text-lg mb-2 flex items-center gap-2">
          ⚡ Feature Signal Audit & Demarcation (PRD Section 5.2)
        </h3>
        <p className="text-gray-400 text-xs leading-relaxed mb-4">
          Per PRD Section 5.2, features are explicitly audited to separate <strong>Core Load-Bearing Signal Features (7)</strong> from <strong>Exploratory/Contextual Features (31)</strong> rather than presenting noisy inputs as load-bearing.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-orange-950/20 border border-orange-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-orange-400 font-black text-xs uppercase tracking-wider">
                🎯 Core Load-Bearing Signal Features (7)
              </span>
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold rounded-full">
                Primary Signal
              </span>
            </div>
            <ul className="text-xs text-gray-300 space-y-1 font-mono">
              <li className="flex items-center gap-2">🔹 <span>fraud_method_encoded</span> <span className="text-[10px] text-gray-500">(UPI, Card, NetBanking)</span></li>
              <li className="flex items-center gap-2">🔹 <span>victim_state_encoded</span></li>
              <li className="flex items-center gap-2">🔹 <span>victim_district_encoded</span></li>
              <li className="flex items-center gap-2">🔹 <span>beneficiary_bank_code</span></li>
              <li className="flex items-center gap-2">🔹 <span>mule_account_age_days</span> <span className="text-[10px] text-emerald-400">(NEW 5.2)</span></li>
              <li className="flex items-center gap-2">🔹 <span>hop_count</span> <span className="text-[10px] text-emerald-400">(NEW 5.2)</span></li>
              <li className="flex items-center gap-2">🔹 <span>distance_from_victim_km</span> <span className="text-[10px] text-emerald-400">(NEW 5.2)</span></li>
            </ul>
          </div>

          <div className="p-4 bg-gray-900/50 border border-gray-700/50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">
                🧪 Exploratory & Contextual Features (31)
              </span>
              <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] font-bold rounded-full">
                Non-Load-Bearing
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Amounts, transaction timestamps, day-of-week, sentiment, urgency scores, and velocity rates. Evaluated during training but clearly labeled as exploratory inputs to prevent SHAP misattribution.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-700/40 flex flex-wrap justify-between items-center text-xs text-gray-500">
          <span>Dataset Source: {metrics?.dataset_source ?? 'fraud_data_clean.csv (Option B Macro Calibrated)'}</span>
          <span>Evaluation: Temporal 80/20 Held-Out Split</span>
        </div>
      </motion.div>

      {/* Worst Performing Zones (F7 Breakdown) */}
      {metrics?.worst_performing_zones && metrics.worst_performing_zones.length > 0 && (
        <motion.div {...fade} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mt-8">
          <h3 className="text-gray-200 font-bold text-lg mb-2 flex items-center gap-2">
            ⚠️ Low-Frequency Zone Breakdown (PRD F7)
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4 bg-red-900/10 p-3 rounded-lg border border-red-900/30">
            Highlighting areas with the poorest classification performance, specifically targeting peripheral zones like <strong>Nuh</strong> and <strong>Mewat</strong>. 
            Crypto-fraud and emerging rural cash-out zones have the lowest sample counts in our synthetic set, meaning the model struggles to reliably differentiate them from established hubs. 
            F1 is correspondingly lower in these regions, and increasing baseline sampling for underrepresented methods is our direct next step for model iteration.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="p-3 rounded-tl-lg">Zone</th>
                  <th className="p-3">F1-Score</th>
                  <th className="p-3">Precision</th>
                  <th className="p-3">Recall</th>
                  <th className="p-3 rounded-tr-lg text-right">Support (n)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {metrics.worst_performing_zones.map((zone, i) => (
                  <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-3 font-semibold text-red-400">{zone.zone}</td>
                    <td className="p-3">{(zone.f1 * 100).toFixed(1)}%</td>
                    <td className="p-3">{(zone.precision * 100).toFixed(1)}%</td>
                    <td className="p-3">{(zone.recall * 100).toFixed(1)}%</td>
                    <td className="p-3 text-right">{zone.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ModelMetrics;
