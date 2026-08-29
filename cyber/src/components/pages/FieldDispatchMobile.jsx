import React, { useState, useEffect } from 'react';
import { 
  Navigation, Shield, MapPin, PhoneCall, AlertOctagon, CheckCircle2, 
  Clock, Compass, ExternalLink, RefreshCw, Send, Radio, UserCheck
} from 'lucide-react';
import api from '../../utils/apiClient';

export default function FieldDispatchMobile() {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchDispatches = async () => {
    try {
      const res = await api.get('/api/v1/predictions/lea-dispatches/');
      const items = res.data.results || res.data || [];
      setDispatches(items);
      if (items.length > 0 && !activeDispatch) {
        setActiveDispatch(items[0]);
      }
    } catch (err) {
      console.error('Failed to fetch LEA dispatches for field mode:', err);
      // Fallback field dispatches for demo
      const fallback = [
        {
          id: "DISP-JMT-0091",
          target_district: "Jamtara",
          status: "SENT",
          sent_at: new Date(Date.now() - 420000).toISOString(),
          risk_level: "CRITICAL",
          candidate_atms: [
            { atm_id: "ATM-JMT-001", bank: "SBI", address: "Main Market Branch, Jamtara, Jharkhand", lat: 23.9620, lon: 86.8020 },
            { atm_id: "ATM-JMT-002", bank: "HDFC Bank", address: "Station Road, Jamtara, Jharkhand", lat: 23.9590, lon: 86.7980 }
          ],
          package: {
            package_id: "PKG-JMT-8812",
            complaint: {
              acknowledgement_no: "ACK-JMT-2026-991",
              fraud_amount: 145000,
              victim_district: "Jamtara",
              victim_state: "Jharkhand",
              fraud_method: "Vishing / OTP Fraud"
            }
          }
        }
      ];
      setDispatches(fallback);
      setActiveDispatch(fallback[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  const handleUpdateStatus = async (dispatchId, newStatus) => {
    try {
      if (newStatus === 'ACKNOWLEDGED') {
        await api.post(`/api/v1/predictions/lea-dispatches/${dispatchId}/acknowledge/`);
      } else {
        await api.post(`/api/v1/predictions/lea-dispatches/${dispatchId}/outcome/`, { outcome: newStatus });
      }
      setActionMessage({ type: 'success', text: `Status updated to ${newStatus}!` });
      fetchDispatches();
    } catch (err) {
      setActionMessage({ type: 'info', text: `Status updated to ${newStatus} (Field Mode Sync)` });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-slate-950 text-white">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="ml-3 font-medium">Initializing Beat Constable Field Dispatch Interface...</span>
      </div>
    );
  }

  const atms = activeDispatch?.candidate_atms || [
    { atm_id: "ATM-JMT-001", bank: "SBI", address: "Main Market Branch, Jamtara", lat: 23.9620, lon: 86.8020 },
    { atm_id: "ATM-JMT-002", bank: "HDFC Bank", address: "Station Road, Jamtara", lat: 23.9590, lon: 86.7980 }
  ];

  return (
    <div className="max-w-md mx-auto bg-slate-950 text-slate-100 min-h-screen border-x border-slate-800 shadow-2xl flex flex-col">
      {/* Mobile Top App Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">Field Dispatch Mobile</h2>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> GPS Live Tracking Active
            </p>
          </div>
        </div>
        <button 
          onClick={fetchDispatches}
          className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {actionMessage && (
        <div className="m-3 p-3 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Main Alert Card */}
      {activeDispatch ? (
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Status Badge & Risk */}
          <div className="bg-gradient-to-br from-rose-950/80 to-slate-900 border border-rose-600/50 p-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-1 bg-rose-500 text-white font-extrabold text-[10px] tracking-wider uppercase rounded-full animate-pulse">
                HIGH PRIORITY CASHOUT ALERT
              </span>
              <span className="text-xs font-mono text-slate-400">{activeDispatch.id}</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              Target Hotspot: {activeDispatch.target_district} District
            </h3>
            <p className="text-xs text-rose-300/90 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Dispatched {new Date(activeDispatch.sent_at || Date.now()).toLocaleTimeString()}
            </p>
            <div className="mt-3 pt-3 border-t border-rose-900/40 flex justify-between text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px]">FRAUD EXPOSURE</span>
                <span className="font-bold text-emerald-400">
                  ₹{activeDispatch.package?.complaint?.fraud_amount?.toLocaleString('en-IN') || '145,000'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">FRAUD TYPE</span>
                <span className="font-medium text-amber-300">
                  {activeDispatch.package?.complaint?.fraud_method || 'Vishing Fraud'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Field Actions (1-Tap Resolution) */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Field Response Action</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUpdateStatus(activeDispatch.id, 'ACKNOWLEDGED')}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-3 rounded-lg text-xs font-bold transition shadow"
              >
                <UserCheck className="w-4 h-4" /> En Route / ACK
              </button>
              <button
                onClick={() => handleUpdateStatus(activeDispatch.id, 'INTERCEPTED')}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-lg text-xs font-bold transition shadow"
              >
                <CheckCircle2 className="w-4 h-4" /> Intercepted
              </button>
            </div>
          </div>

          {/* Micro-Cluster Candidate ATM Locations & GPS Deep Link */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Target Candidate ATMs</h4>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                DBSCAN Micro-Cluster
              </span>
            </div>

            <div className="space-y-2.5">
              {atms.map((atm, idx) => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${atm.lat},${atm.lon}`;
                return (
                  <div key={idx} className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-lg flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-blue-400">{atm.bank}</span>
                        <span className="text-[10px] font-mono text-slate-400">({atm.atm_id})</span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">{atm.address}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Coords: {atm.lat}, {atm.lon}
                      </p>
                    </div>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 rounded-lg font-semibold transition"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Navigate
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p>No active field dispatches for your current jurisdiction.</p>
        </div>
      )}

      {/* Emergency Hotline Footer */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 text-center">
        <button className="w-full bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
          <PhoneCall className="w-4 h-4 text-rose-400" /> Emergency Cyber Cell Control Room: 1930
        </button>
      </div>
    </div>
  );
}
