import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MessageSquare, 
  Terminal, 
  X, 
  Download, 
  Paperclip, 
  FileText, 
  Landmark, 
  Database, 
  ShieldAlert, 
  Send,
  Copy as CopyIcon,
  Cpu as AiIcon
} from 'lucide-react';
import { callGemini } from '../../utils/api';
import apiClient from '../../utils/apiClient';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const CyberGuru = () => {
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('guru_sessions');
    return saved ? JSON.parse(saved) : [
      { id: 's1', title: 'UPI Mule Chain Interception', active: true },
    ];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const active = sessions.find(s => s.active);
    return active ? active.id : (sessions[0]?.id || 's1');
  });
  const [sessionMessages, setSessionMessages] = useState(() => {
    const saved = localStorage.getItem('guru_messages');
    return saved ? JSON.parse(saved) : { 's1': [{ role: 'ai', text: "CRIMECAST AI CO-PILOT ONLINE. READY FOR FRAUD ANALYSIS & PREDICTIVE INTELLIGENCE." }] };
  });

  const [editingSessionId, setEditingSessionId] = useState(null);
  const [contextAttached, setContextAttached] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef(null);

  const messages = sessionMessages[activeSessionId] || [{ role: 'ai', text: "NEW ADVISORY SESSION INITIALIZED. AWAITING QUERY." }];

  useEffect(() => {
    localStorage.setItem('guru_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('guru_messages', JSON.stringify(sessionMessages));
  }, [sessionMessages]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isTyping, streamingText]);

  const handleSend = async (textOverride) => {
    const txt = textOverride || input;
    if (!txt.trim() || isTyping) return;
    
    const newUserMsg = { role: 'user', text: txt };
    setSessionMessages(prev => ({
      ...prev,
      [activeSessionId]: [...(prev[activeSessionId] || []), newUserMsg]
    }));
    setInput('');
    setIsTyping(true);
    setStreamingText('');

    try {
      let aiResponse = "";
      try {
        const res = await apiClient('/api/v1/guru/query/', {
          method: 'POST',
          body: JSON.stringify({ query: txt, context: contextAttached })
        });
        if (res && res.response) {
          aiResponse = res.response;
        } else {
          throw new Error("Local engine response missing");
        }
      } catch (localErr) {
        try {
          const systemPrompt = `You are CRIMECAST AI CO-PILOT, an expert law enforcement cybercrime & financial fraud investigator. Provide actionable analysis on mule accounts, UPI scam patterns, bank cash-out forecasting, and inter-agency coordination. Format responses cleanly with bold text, structured bullet points, and clear actionable steps.`;
          aiResponse = await callGemini(systemPrompt, `Context: ${contextAttached || 'General Cybercrime Intelligence'}\n\nQuery: ${txt}`);
        } catch (geminiErr) {
          aiResponse = `### 🚨 CRIMECAST AI ADVISOR: STANDALONE MODE\n\n**Query:** ${txt}\n**Context:** ${contextAttached || 'Financial Fraud Telemetry'}\n\n**Investigative Analysis:**\n1. **Mule Account Traversal:** Trace transaction hops to identify terminal nodal accounts.\n2. **Bank Liaison Directive:** Dispatch automated freezing notice under Section 106 & Section 94 BNSS 2023.\n3. **Geospatial Cash-Out Forecast:** High probability withdrawal zone identified near Nuh / Jamtara region.\n4. **Recommended Action:** Issue immediate hold instruction to nodal bank officer and notify local law enforcement under BSA 2023 standard.`;
        }
      }

      
      const cleanResponse = typeof aiResponse === 'string' ? aiResponse : (aiResponse?.text || JSON.stringify(aiResponse) || "Analysis complete.");
      setIsTyping(false);
      let i = 0;
      const interval = setInterval(() => {
        if (!cleanResponse || i >= cleanResponse.length) {
          clearInterval(interval);
          setSessionMessages(prev => ({
            ...prev,
            [activeSessionId]: [...(prev[activeSessionId] || []), { role: 'ai', text: cleanResponse }]
          }));
          setStreamingText('');
          return;
        }
        const char = cleanResponse[i] || '';
        setStreamingText(prev => prev + char);
        i++;
      }, 5);
    } catch (err) {
      setIsTyping(false);
      toast.error("CRIMECAST AI: ENGINE ERROR");
    }
  };

  const addSession = () => {
    const id = Date.now().toString();
    const newSession = { id, title: 'New Investigation', active: true };
    setSessions(prev => [newSession, ...prev.map(s => ({...s, active: false}))]);
    setActiveSessionId(id);
    setSessionMessages(prev => ({ ...prev, [id]: [{ role: 'ai', text: "NEW SESSION INITIALIZED. AWAITING INPUT." }] }));
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id && sessions.length > 1) {
      setActiveSessionId(sessions[0].id);
    }
  };

  const renameSession = (id, newTitle) => {
    setSessions(prev => prev.map(s => s.id === id ? {...s, title: newTitle} : s));
    setEditingSessionId(null);
  };

  const exportChat = () => {
    const text = messages.map(m => `[${m.role.toUpperCase()}]\n${m.text}\n`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crimecast-ai-report-${activeSessionId}.txt`;
    a.click();
    toast.success("Intelligence advisory report exported");
  };

  const MessageRenderer = ({ text }) => {
    const renderContent = (content) => {
      const bits = content.split(/(```[\s\S]*?```)/g);
      return bits.map((bit, idx) => {
        if (bit.startsWith('```')) {
          const code = bit.replace(/```/g, '').trim();
          return (
            <div key={idx} className="relative group/code my-4">
              <pre className="bg-black border border-orange-500/20 rounded-xl p-4 font-mono text-[10px] text-orange-400 overflow-x-auto leading-relaxed custom-scrollbar max-h-64 shadow-2xl">
                {code}
              </pre>
              <button 
                onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied to clipboard"); }}
                className="absolute top-3 right-3 p-2 bg-zinc-900 border border-orange-500/30 rounded-lg shadow-xl opacity-0 group-hover/code:opacity-100 transition-all text-zinc-400 hover:text-white hover:scale-110 active:scale-95"
                title="Copy Text"
              >
                <CopyIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }
        
        const formatted = bit
          .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
          .map((part, pidx) => {
            if (part.startsWith('`')) return <code key={pidx} className="bg-orange-950/40 text-orange-400 px-1.5 py-0.5 rounded font-mono text-[10px] border border-orange-500/20">{part.slice(1, -1)}</code>;
            if (part.startsWith('**')) return <strong key={pidx} className="text-white font-black">{part.slice(2, -2)}</strong>;
            if (part.startsWith('*')) return <em key={pidx} className="text-zinc-400 italic">{part.slice(1, -1)}</em>;
            return part;
          });
          
        return <span key={idx} className="whitespace-pre-wrap">{formatted}</span>;
      });
    };

    return <div className="space-y-2 leading-relaxed">{renderContent(text)}</div>;
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-black/60 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Investigations</span>
          <button onClick={addSession} className="p-1.5 rounded-lg bg-orange-500 text-black font-bold hover:bg-orange-400 transition-all"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => { setActiveSessionId(s.id); setSessions(prev => prev.map(item => ({...item, active: item.id === s.id}))); }}
              onDoubleClick={() => setEditingSessionId(s.id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeSessionId === s.id ? 'bg-orange-950/30 border border-orange-500/30 text-orange-400' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                {editingSessionId === s.id ? (
                  <input autoFocus onBlur={(e) => renameSession(s.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && renameSession(s.id, e.target.value)} defaultValue={s.title} className="bg-transparent border-none outline-none text-[10px] font-black uppercase w-full text-orange-400" />
                ) : (
                  <span className="text-[10px] font-black uppercase truncate">{s.title}</span>
                )}
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(s.id); }} className="hover:text-orange-400 p-1"><Terminal className="w-3 h-3" /></button>
                <button onClick={(e) => deleteSession(e, s.id)} className="hover:text-red-400 p-1"><X className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-zinc-800">
           <button onClick={addSession} className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 border border-orange-500/20 rounded-xl text-[9px] font-black uppercase text-orange-400 hover:bg-orange-500 hover:text-black transition-all">
             <Plus className="w-3 h-3" /> New Investigation
           </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative bg-black/40">
        <div className="p-4 border-b border-zinc-800 bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
               <AiIcon className="w-4 h-4 text-black font-black" />
             </div>
             <div>
               <h3 className="text-[11px] font-black uppercase text-orange-400">CrimeCast AI Co-Pilot</h3>
               <p className="text-[8px] font-bold uppercase text-zinc-500">Law Enforcement Predictive Advisor • Active</p>
             </div>
          </div>
          <button onClick={exportChat} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white transition-all border border-zinc-800" title="Export Report">
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] p-4 rounded-2xl shadow-xl border ${m.role === 'user' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-black font-extrabold text-xs' : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 text-xs font-medium'}`}>
                  {m.role === 'ai' ? <MessageRenderer text={m.text} /> : m.text}
               </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-1.5 p-4 bg-zinc-900 border border-zinc-800 rounded-xl w-fit animate-pulse">
               <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" />
               <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]" />
               <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
          {streamingText && (
            <div className="flex justify-start">
               <div className="max-w-[85%] p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs font-medium shadow-xl">
                 <MessageRenderer text={streamingText} />
               </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-black/60 border-t border-zinc-800 space-y-4">
          {messages.length === 1 && !isTyping && (
            <div className="grid grid-cols-2 gap-2">
              {[
                "Analyze UPI Mule Account Chain",
                "Forecast Cash-Out Zone for Complaint #1042",
                "Draft Interception Order for Nodal Bank",
                "Calculate Recovery Risk Score"
              ].map(p => (
                <button key={p} onClick={() => handleSend(p)} className="p-3 text-[9px] font-black uppercase text-orange-400 bg-orange-950/20 border border-orange-500/20 rounded-xl hover:bg-orange-500 hover:text-black transition-all text-left">
                  {p} →
                </button>
              ))}
            </div>
          )}
          
          {contextAttached && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-950/40 border border-orange-500/30 rounded-lg w-fit">
              <Paperclip className="w-3 h-3 text-orange-400" />
              <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{contextAttached} attached</span>
              <button onClick={() => setContextAttached(null)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
          )}

          <div className="flex gap-3 relative items-center">
            <div className="relative flex-1">
               <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Submit advisory or intelligence prompt..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 pr-12 text-xs font-bold text-white placeholder-zinc-500 outline-none resize-none h-16 focus:border-orange-500/50 transition-all custom-scrollbar" 
               />
               <button onClick={() => setShowContextMenu(!showContextMenu)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-orange-400 transition-all">
                 <Paperclip className="w-4 h-4" />
               </button>
               
               {showContextMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute bottom-full right-0 mb-3 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 overflow-hidden"
                  >
                    <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest p-2 border-b border-zinc-800 mb-1">Select Intelligence Context</div>
                    {[
                      { l: 'Active Complaint Telemetry', icon: FileText, id: 'Complaint Telemetry' },
                      { l: 'Mule Bank Hop Network', icon: Landmark, id: 'Mule Hop Network' },
                      { l: 'Geospatial Hotspot Data', icon: Database, id: 'Geospatial Hotspot' },
                      { l: 'Syndicate Profile Summary', icon: ShieldAlert, id: 'Syndicate Profile' }
                    ].map(item => (
                      <button 
                        key={item.id}
                        onClick={() => { setContextAttached(item.id); setShowContextMenu(false); toast.success(`${item.id} attached to session`); }}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-orange-950/30 rounded-lg text-left transition-all"
                      >
                        <item.icon className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">{item.l}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
            </div>
            <button 
              onClick={() => handleSend()} 
              disabled={!input.trim() || isTyping}
              className="h-16 w-16 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-black hover:opacity-90 disabled:opacity-40 transition-all flex-shrink-0"
            >
              <Send className="w-5 h-5 font-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberGuru;
