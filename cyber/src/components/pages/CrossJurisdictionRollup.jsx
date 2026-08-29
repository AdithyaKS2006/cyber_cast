import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Network, Activity, Clock, ShieldAlert, ArrowRight } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import Skeleton from '../ui/Skeleton';
import ErrorState from '../ui/ErrorState';

const CrossJurisdictionRollup = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    apiClient.get('/api/v1/predictions/lea-dispatches/rollup/')
      .then(res => {
        if (isMounted) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error("Rollup fetch error:", err);
          setError("Failed to load cross-jurisdiction data.");
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center border border-zinc-800 rounded-xl bg-black/40 backdrop-blur-md">
        <Network className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Active Intelligence Operations</h3>
        <p className="text-zinc-400">There are currently no active operations requiring cross-jurisdiction coordination.</p>
      </div>
    );
  }

  // Format currency
  const formatAmount = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Format date
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    if (diffHrs > 24) return `${Math.floor(diffHrs / 24)}d ago`;
    if (diffHrs > 0) return `${diffHrs}h ${diffMins}m ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-400" />
            National I4C Rollup
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">
            Active cross-jurisdiction intelligence dispatches grouped by State and District.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">{data.reduce((acc, curr) => acc + curr.active_dispatch_count, 0)} Active Operations</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((stateData, idx) => (
          <motion.div
            key={stateData.state}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="rounded-2xl border border-zinc-800/60 overflow-hidden bg-black/40 backdrop-blur-md"
          >
            {/* State Header */}
            <div className="px-6 py-4 border-b border-zinc-800/60 bg-gradient-to-r from-indigo-900/20 to-transparent flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{stateData.state}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    {stateData.active_dispatch_count} Dispatches
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    Exposure: {formatAmount(stateData.total_fraud_exposure)}
                  </span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-xs text-zinc-500 mb-1">Latest Operation</span>
                <span className="flex items-center gap-1 text-xs font-medium text-zinc-300 bg-zinc-800/50 px-2 py-1 rounded">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(stateData.last_dispatched_at)}
                </span>
              </div>
            </div>

            {/* Districts List */}
            <div className="divide-y divide-zinc-800/40">
              {stateData.districts.sort((a, b) => b.active_dispatch_count - a.active_dispatch_count).map(district => (
                <div key={district.district} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-medium text-sm border border-zinc-700">
                      {district.district.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-zinc-200">{district.district}</h4>
                      <p className="text-xs text-zinc-500">
                        Exposure: {formatAmount(district.total_fraud_exposure)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">{district.active_dispatch_count}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Active</div>
                    </div>
                    <button 
                      className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-colors"
                      title="View District Operations"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CrossJurisdictionRollup;
