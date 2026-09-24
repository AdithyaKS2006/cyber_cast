import React, { useState } from 'react';
import { Terminal, Send, ShieldAlert, Activity, ArrowRight } from 'lucide-react';
import apiClient from '../../utils/apiClient';

const SyndicateSimulator = ({ navigate }) => {
  const [complaintId, setComplaintId] = useState('');
  const [amount, setAmount] = useState('50000');
  const [fromAccount, setFromAccount] = useState('987654321012');
  const [toAccount, setToAccount] = useState('0001004928192');
  const [toIfsc, setToIfsc] = useState('SBIN0001234');
  const [hopNumber, setHopNumber] = useState(1);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const logMessage = (msg, type = 'info') => {
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const handleSimulateAttack = async (e) => {
    e.preventDefault();
    if (!complaintId) {
      logMessage('Error: Complaint ID is required to attach the hop.', 'error');
      return;
    }

    setLoading(true);
    logMessage(`[SYNDICATE] Initiating Layer ${hopNumber} Transfer of ₹${amount}...`, 'warning');

    const payload = {
      from_account: fromAccount,
      to_account: toAccount,
      to_ifsc: toIfsc,
      amount: amount,
      hop_number: hopNumber,
      is_mule_flagged: true
    };

    try {
      const res = await apiClient(`/api/v1/complaints/${complaintId}/chain/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        logMessage(`[SUCCESS] Layer ${hopNumber} hop injected into MuleGraphEngine!`, 'success');
        setHopNumber((prev) => prev + 1);
        setFromAccount(toAccount);
        setToAccount(''); // Reset for next hop
      } else {
        const err = await res.json();
        logMessage(`[FAILED] Injection failed: ${JSON.stringify(err)}`, 'error');
      }
    } catch (err) {
      logMessage(`[ERROR] Network error during injection: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-900/20 text-red-500 rounded-xl border border-red-500/20">
          <Terminal className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
            Adversary Syndicate Simulator <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">PORT 3001 DEMO</span>
          </h1>
          <p className="text-zinc-400 text-xs">Simulate real-time money laundering hops to trigger CrimeCast's ML pipeline.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Control Panel */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-500" /> Layering Hop Configuration
          </h2>
          <form onSubmit={handleSimulateAttack} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Target Complaint UUID</label>
              <input 
                type="text" 
                value={complaintId} 
                onChange={(e) => setComplaintId(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-white"
                placeholder="Enter Complaint UUID to attach to..."
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Hop Number</label>
                <input 
                  type="number" 
                  value={hopNumber} 
                  onChange={(e) => setHopNumber(parseInt(e.target.value))}
                  className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-white"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-orange-400 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Source Account</label>
                <input 
                  type="text" 
                  value={fromAccount} 
                  onChange={(e) => setFromAccount(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 font-mono"
                />
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-600 mt-4 mx-auto" />
              <div className="col-span-2">
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Destination Account</label>
                <input 
                  type="text" 
                  value={toAccount} 
                  onChange={(e) => setToAccount(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-red-400 font-mono"
                  placeholder="e.g. 0001004928192"
                  required
                />
              </div>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Destination IFSC</label>
                <input 
                  type="text" 
                  value={toIfsc} 
                  onChange={(e) => setToIfsc(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 font-mono"
                  placeholder="e.g. SBIN0001234"
                  required
                />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 bg-red-900/40 hover:bg-red-800/60 border border-red-500/50 text-red-100 p-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all"
            >
              {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Inject Malicious Hop
            </button>
          </form>
        </div>

        {/* Terminal Output */}
        <div className="bg-black border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="ml-2 text-[10px] font-mono text-zinc-500">syndicate@script-kiddie:~</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-2">
            <div className="text-zinc-500">CrimeCast Simulator Initialized. Awaiting payloads...</div>
            {logs.map((log, i) => (
              <div key={i} className={`
                ${log.type === 'error' ? 'text-red-400' : ''}
                ${log.type === 'warning' ? 'text-yellow-400' : ''}
                ${log.type === 'success' ? 'text-emerald-400' : ''}
                ${log.type === 'info' ? 'text-blue-400' : ''}
              `}>
                <span className="text-zinc-600">[{log.time}]</span> {log.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyndicateSimulator;
