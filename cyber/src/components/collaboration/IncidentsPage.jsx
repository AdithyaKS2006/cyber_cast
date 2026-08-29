import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Plus, Clock, User, ChevronRight, MessageSquare, 
  History, Link as LinkIcon, FileText, ChevronLeft, Send, 
  MoreVertical, Filter, Search, ArrowRight, CheckCircle2, AlertTriangle, Info, Loader2
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { SEVERITY, MOCK_IOCS_FULL } from '../../constants';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';

const useInterval = (callback, delay) => {
  const savedCallback = useRef();
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

const SLATimer = ({ incident }) => {
  const [timeLeft, setTimeLeft] = useState(incident.slaMinutes * 60);

  useInterval(() => {
    if (timeLeft > 0) setTimeLeft(timeLeft - 1);
  }, 1000);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const percentage = (timeLeft / (incident.slaMinutes * 60)) * 100;
  let colorClass = 'text-emerald-500';
  let pulseClass = '';

  if (percentage < 20) {
    colorClass = 'text-red-500';
    pulseClass = 'animate-pulse';
  } else if (percentage < 50) {
    colorClass = 'text-yellow-500';
  }

  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter ${colorClass} ${pulseClass}`}>
      <Clock className="w-3 h-3" />
      {formatTime(timeLeft)}
    </div>
  );
};

const COLUMNS = ['New', 'Triaging', 'Contained', 'Eradicating', 'Resolved'];

const IncidentsPage = ({ user, navigate }) => {
  const [incidents, setIncidents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const fetchIncidents = async () => {
    try {
      const res = await apiClient('/api/v1/incidents/');
      if (res.ok) {
        const data = await res.json();
        const results = data.results || data;
        const formatted = results.map(inc => ({
          id: inc.incident_id,
          db_id: inc.id,
          title: inc.title,
          description: inc.description,
          severity: inc.severity ? inc.severity.toUpperCase() : 'MEDIUM',
          status: inc.status ? inc.status.charAt(0).toUpperCase() + inc.status.slice(1) : 'New',
          lead: inc.lead_analyst_name || 'Unassigned',
          slaMinutes: inc.sla_minutes || 120,
          iocs: inc.linked_iocs ? inc.linked_iocs.length : 0
        }));
        setIncidents(formatted);
      }
    } catch (e) {
      toast.error('Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiClient('/api/v1/users/');
      if (res.ok) {
        const data = await res.json();
        const results = data.results || data;
        setUsersList(results.map(u => ({ id: u.id, name: u.username })));
      }
    } catch (e) {
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchUsers();
  }, []);

  // Filter incidents for Kanban
  const getIncidentsByStatus = (status) => incidents.filter(i => i.status === status);

  const moveIncident = async (id, newStatus) => {
    const inc = incidents.find(i => i.id === id);
    if (!inc) return;
    
    // Optimistic UI update
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
    setDragging(null);
    setDragOverCol(null);
    
    try {
      const res = await apiClient(`/api/v1/incidents/${inc.db_id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus.toLowerCase() })
      });
      if (!res.ok) throw new Error();
      toast.success(`Incident ${id} moved to ${newStatus}`);
    } catch (e) {
      toast.error(`Failed to move incident ${id}`);
      fetchIncidents(); // Revert
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      title: formData.get('title'),
      severity: formData.get('severity').toLowerCase(),
      description: formData.get('description'),
      status: 'new'
    };
    
    try {
      const res = await apiClient('/api/v1/incidents/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("Incident Protocol Initiated");
        setCreateOpen(false);
        fetchIncidents();
      } else {
        toast.error("Failed to create incident");
      }
    } catch (e) {
      toast.error("Network error creating incident");
    }
  };

  if (selectedIncident) {
    return <IncidentDetail 
      incident={selectedIncident} 
      onBack={() => setSelectedIncident(null)} 
      onUpdate={async (updated) => {
        setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
        setSelectedIncident(updated);
        try {
          await apiClient(`/api/v1/incidents/${updated.db_id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status: updated.status.toLowerCase() })
          });
        } catch (e) {
          toast.error("Failed to sync update to server");
        }
      }}
    />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">Incident Response</h1>
            <p className="text-xs text-emerald-900 font-bold uppercase tracking-widest mt-1">Live Threat Containment & Orchestration</p>
          </div>
          {loading && <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />}
        </div>
        <Button 
          onClick={() => setCreateOpen(true)}
          variant="primary" 
          className="bg-emerald-600 hover:bg-emerald-500 text-black border-none"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Incident
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[600px]">
        {COLUMNS.map(col => (
          <div 
            key={col}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => moveIncident(dragging, col)}
            className={`flex-shrink-0 w-80 rounded-2xl bg-zinc-950/50 border transition-all duration-300 flex flex-col ${
              dragOverCol === col ? 'border-emerald-500 bg-emerald-500/5' : 'border-emerald-900/10'
            }`}
          >
            <div className="p-4 flex items-center justify-between border-b border-emerald-900/10 bg-black/40 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{col}</h3>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-950/30 border-emerald-900/40 text-emerald-900">
                {getIncidentsByStatus(col).length}
              </Badge>
            </div>

            <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
              {getIncidentsByStatus(col).map(incident => (
                <div
                  key={incident.id}
                  draggable="true"
                  onDragStart={() => setDragging(incident.id)}
                  onClick={() => setSelectedIncident(incident)}
                  className={`cursor-pointer group ${dragging === incident.id ? 'opacity-50 grayscale' : ''}`}
                >
                  <Card className={`p-4 bg-black border-emerald-900/10 group-hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden ${
                    dragging === incident.id ? 'border-2 border-dashed border-emerald-500' : ''
                  }`}>
                    {/* Severity Glow */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${SEVERITY[incident.severity].color}`} />
                    
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <span className="text-[9px] font-black text-emerald-950 uppercase tracking-tighter">{incident.id}</span>
                      <Badge className={`${SEVERITY[incident.severity].color} text-[8px] h-4 font-black uppercase tracking-widest`}>
                        {incident.severity}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-bold text-zinc-100 leading-snug mb-4 line-clamp-2 uppercase tracking-tight pl-2">
                      {incident.title}
                    </h4>

                    <div className="flex items-center justify-between pl-2 pt-2 border-t border-emerald-900/5">
                      <SLATimer incident={incident} />
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] border-emerald-900/20 text-emerald-900 gap-1">
                          <LinkIcon className="w-2.5 h-2.5" /> {incident.iocs}
                        </Badge>
                        <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-900/30 flex items-center justify-center text-[8px] font-black text-emerald-500">
                          {incident.lead?.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
              
              {/* Empty State / Drop Target Hint */}
              {getIncidentsByStatus(col).length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-emerald-900/5 rounded-xl">
                  <p className="text-[8px] font-black text-emerald-950 uppercase tracking-[0.2em]">Queue Empty</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="INITIATE INCIDENT PROTOCOL">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-emerald-900 uppercase">Incident Title</label>
            <input name="title" required className="w-full bg-black border border-emerald-900/30 rounded-lg p-3 text-xs text-emerald-500 outline-none focus:border-emerald-500" placeholder="e.g. Unusual Outbound Traffic detected" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-900 uppercase">Severity</label>
              <div className="flex flex-col gap-2">
                {Object.keys(SEVERITY).filter(s => s !== 'INFO').map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="severity" value={s} defaultChecked={s === 'MEDIUM'} className="hidden peer" />
                    <div className={`w-3 h-3 rounded-full border border-emerald-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500`} />
                    <span className="text-[10px] font-bold text-zinc-500 group-hover:text-emerald-500 transition-colors uppercase">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-900 uppercase">Lead Analyst</label>
              <select name="lead" className="w-full bg-black border border-emerald-900/30 rounded-lg p-3 text-xs text-emerald-500 outline-none focus:border-emerald-500">
                {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-emerald-900 uppercase">Description</label>
            <textarea name="description" rows={3} className="w-full bg-black border border-emerald-900/30 rounded-lg p-3 text-xs text-emerald-500 outline-none focus:border-emerald-500" placeholder="Provide event context..." />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-emerald-900 uppercase">Initial IoC (Optional)</label>
            <input name="ioc" className="w-full bg-black border border-emerald-900/30 rounded-lg p-3 text-xs text-emerald-500 outline-none focus:border-emerald-500" placeholder="IP, Domain, or Hash" />
          </div>
          <div className="pt-2 flex gap-3">
            <Button type="submit" variant="primary" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-black border-none font-black">DEPLOY RESPONSE</Button>
            <Button type="button" onClick={() => setCreateOpen(false)} className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-500 font-black">ABORT</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const IncidentDetail = ({ incident, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('Timeline');
  const [events, setEvents] = useState([
    { id: 1, type: 'Detection', text: 'Malicious IP flagged in packet analyzer', time: '14:22', icon: ShieldAlert, color: 'text-red-500' },
    { id: 2, type: 'Escalation', text: 'Escalated to P1 — CISO notified', time: '14:35', icon: AlertTriangle, color: 'text-orange-500' },
    { id: 3, type: 'Containment', text: 'Affected endpoints isolated from network', time: '15:01', icon: CheckCircle2, color: 'text-emerald-500' },
    { id: 4, type: 'Analysis', text: 'Memory dump extracted and sent to sandbox', time: '15:22', icon: Info, color: 'text-blue-500' },
  ]);

  const addEvent = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newEvent = {
       id: Date.now(),
       type: formData.get('type'),
       text: formData.get('description'),
       time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
       icon: Info,
       color: 'text-blue-500'
    };
    setEvents([...events, newEvent]);
    e.target.reset();
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full bg-zinc-950/20 rounded-3xl border border-emerald-900/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-emerald-900/10 bg-black/40">
        <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-emerald-900 uppercase hover:text-emerald-500 transition-colors mb-6 group">
          <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
          Back to Incidents
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-emerald-900 tracking-widest">{incident.id}</span>
              <Badge className={`${SEVERITY[incident.severity].color} text-[10px] font-black uppercase tracking-widest`}>
                {incident.severity}
              </Badge>
              <select 
                value={incident.status} 
                onChange={(e) => onUpdate({ ...incident, status: e.target.value })}
                className="bg-emerald-950/20 border border-emerald-900/30 rounded-md px-2 py-0.5 text-[9px] font-black text-emerald-500 outline-none cursor-pointer"
              >
                {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
              {incident.title}
            </h1>
          </div>

          <div className="flex items-center gap-6 pb-2">
            <div className="text-right">
              <p className="text-[8px] font-black text-emerald-900 uppercase mb-1">Response Clock</p>
              <div className="text-xl font-black text-red-500 tabular-nums tracking-tighter">
                <SLATimer incident={incident} />
              </div>
            </div>
            <div className="flex items-center gap-3 bg-black/40 border border-emerald-900/10 p-2 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-900/30 flex items-center justify-center text-sm font-black text-emerald-500">
                {incident.lead?.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden sm:block">
                <p className="text-[8px] font-black text-emerald-900 uppercase">Lead Analyst</p>
                <p className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">{incident.lead}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-emerald-900/10 bg-black/20 overflow-x-auto no-scrollbar">
        {['Timeline', 'Evidence', 'Linked IoCs', 'Collaborate'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab ? 'text-emerald-500 bg-emerald-500/5' : 'text-emerald-900 hover:text-emerald-700'
            }`}
          >
            {tab}
            {activeTab === tab && <motion.div layoutId="incTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'Timeline' && (
          <div className="max-w-3xl space-y-8">
            <div className="relative border-l-2 border-emerald-900/10 ml-4 pl-8 space-y-10 py-2">
              {events.map((event, idx) => (
                <div key={event.id} className="relative group">
                  <div className={`absolute -left-[41px] w-6 h-6 rounded-full bg-black border-2 border-emerald-900 flex items-center justify-center transition-all duration-300 group-hover:border-emerald-500 shadow-[0_0_10px_rgba(0,0,0,1)]`}>
                    <event.icon className={`w-3 h-3 ${event.color}`} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[8px] h-4 font-black uppercase border-emerald-900/20 text-emerald-900`}>
                        {event.type}
                      </Badge>
                      <span className="text-[9px] font-black text-emerald-950">{event.time}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-300 uppercase tracking-tight leading-relaxed">
                      {event.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <Card className="p-4 bg-black border-emerald-900/10">
              <form onSubmit={addEvent} className="flex gap-4 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[8px] font-black text-emerald-900 uppercase">Add Activity Event</label>
                  <div className="flex gap-2">
                    <select name="type" className="bg-emerald-950/20 border border-emerald-900/20 rounded-lg px-3 text-[10px] font-black text-emerald-500 outline-none">
                      <option>Detection</option>
                      <option>Analysis</option>
                      <option>Mitigation</option>
                      <option>Communication</option>
                    </select>
                    <input name="description" required className="flex-1 bg-black border border-emerald-900/30 rounded-lg px-4 py-2 text-xs text-emerald-500 outline-none focus:border-emerald-500" placeholder="Describe the action taken..." />
                  </div>
                </div>
                <Button type="submit" variant="outline" className="h-10 border-emerald-500/30 text-emerald-500 font-black text-[10px]">LOG EVENT</Button>
              </form>
            </Card>
          </div>
        )}

        {activeTab === 'Evidence' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Evidence Locker</h3>
              <Button variant="outline" size="sm" className="h-8 border-emerald-900/30 text-emerald-900 font-black text-[9px]">
                <Plus className="w-3 h-3 mr-2" /> UPLOAD FILE
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['memory_dump_001.bin', 'pcap_capture_1422.pcap', 'malware_sample_hash.exe'].map((file, idx) => (
                <Card key={idx} className="p-4 bg-black border-emerald-900/10 group hover:border-emerald-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/20 text-emerald-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-300 uppercase truncate w-32">{file}</p>
                      <p className="text-[8px] font-bold text-emerald-900">42.8 MB • JSON Hash verified</p>
                    </div>
                  </div>
                </Card>
              ))}
              <div className="border-2 border-dashed border-emerald-900/10 rounded-2xl flex flex-col items-center justify-center p-6 bg-emerald-950/5 opacity-50 hover:opacity-100 transition-opacity">
                <Plus className="w-6 h-6 text-emerald-900 mb-2" />
                <p className="text-[8px] font-black text-emerald-900 uppercase">Drop additional evidence here</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Linked IoCs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Confirmed Indicators</h3>
              <Button variant="outline" size="sm" className="h-8 border-emerald-900/30 text-emerald-900 font-black text-[9px]">
                 LINK NEW IOC
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-black">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-950/10 border-b border-emerald-900/10">
                    <th className="px-6 py-4 text-[9px] font-black text-emerald-900 uppercase">Type</th>
                    <th className="px-6 py-4 text-[9px] font-black text-emerald-900 uppercase">Value</th>
                    <th className="px-6 py-4 text-[9px] font-black text-emerald-900 uppercase">Severity</th>
                    <th className="px-6 py-4 text-[9px] font-black text-emerald-900 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/5">
                  {MOCK_IOCS_FULL.slice(0, 5).map(ioc => (
                    <tr key={ioc.id} className="hover:bg-emerald-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <Badge className="bg-emerald-950/50 text-emerald-500 border-emerald-900/30 text-[8px] font-bold">
                          {ioc.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-zinc-400 group-hover:text-emerald-500 transition-colors uppercase">{ioc.value}</span>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-[9px] font-black text-red-900">CRITICAL</span>
                      </td>
                      <td className="px-6 py-4">
                         <button className="text-emerald-900 hover:text-emerald-500 transition-all font-black text-[9px] uppercase">Detach</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Collaborate' && (
          <div className="flex flex-col h-full max-w-2xl mx-auto">
            <div className="flex-1 space-y-6 mb-6">
               {[
                 { user: 'A. Patel', text: 'Isolation protocol complete for subnet 10.0.4.x. Monitoring for lateral movement.', time: '15:45' },
                 { user: 'J. Smith', text: 'Confirmed Emotet signature in binary sample. Deploying specific containment rules.', time: '16:02' },
                 { user: 'M. Chen', text: 'CISO has authorized the full network scan. Starting now.', time: '16:15' }
               ].map((c, i) => (
                 <div key={i} className={`flex gap-4 ${i === 1 ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-900/30 flex items-center justify-center text-[10px] font-black text-emerald-500">
                      {c.user.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div className={`p-4 rounded-2xl border ${i === 1 ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-black border-emerald-900/10'}`}>
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{c.user}</p>
                        <p className="text-[8px] font-black text-emerald-900">{c.time}</p>
                      </div>
                      <p className="text-xs font-bold text-zinc-400 leading-relaxed uppercase tracking-tight">{c.text}</p>
                    </div>
                 </div>
               ))}
               
               <div className="flex items-center gap-2 pl-12 text-[9px] font-black text-emerald-900 uppercase">
                  <div className="flex gap-0.5">
                    {[1,2,3].map(i => (
                      <motion.div 
                        key={i} animate={{ opacity: [0.2, 1, 0.2] }} 
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        className="w-1 h-1 rounded-full bg-emerald-500" 
                      />
                    ))}
                  </div>
                  A. Patel is typing...
               </div>
            </div>

            <div className="relative mt-auto">
              <textarea className="w-full bg-black border border-emerald-900/30 rounded-2xl p-4 pr-16 text-xs text-emerald-500 outline-none focus:border-emerald-500 resize-none" rows={3} placeholder="Send a message to the incident war room..." />
              <button className="absolute right-4 bottom-4 p-2 rounded-xl bg-emerald-600 text-black hover:bg-emerald-500 transition-all">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentsPage;
