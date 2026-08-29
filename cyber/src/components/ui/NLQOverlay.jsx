import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Sparkles, Command, ArrowRight } from 'lucide-react';
import { callGemini } from '../../utils/api';

const NLQOverlay = ({ isOpen, onClose }) => {
  const [query, setQuery] = React.useState('');
  const [result, setResult] = React.useState(null);
  const [recentQueries] = React.useState(['Critical IPs last 7 days', 'Malware by family this week', 'Open incidents by severity']);
  const [loading, setLoading] = React.useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const prompt = `You are a cybersecurity expert. Provide a concise, professional analysis for: ${query}. Use bullet points.`;
      const res = await callGemini(prompt, query);
      setResult(res);
    } catch (err) {
      setResult("ERROR: Neural Link Interrupted. Trace: 401/RATE_LIMIT");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl pointer-events-auto" 
          />
          <motion.div 
            initial={{ scale: 0.95, y: -20, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.95, y: -10, opacity: 0 }}
            className="relative w-full max-w-2xl bg-zinc-950 border border-orange-500/30 rounded-2xl shadow-[0_0_100px_rgba(249,115,22,0.1)] flex flex-col pointer-events-auto"
          >
            <form onSubmit={handleSearch} className="relative p-6">
              <Search className="absolute left-10 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-900" />
              <input 
                autoFocus 
                value={query} 
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask Cyber Guru anything... (e.g., 'Show me critical IPs')" 
                className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-14 pr-12 text-sm text-orange-400 outline-none focus:border-orange-500 transition-all placeholder:text-zinc-600"
              />
              <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {loading ? (
                  <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                ) : (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-800 text-[8px] font-black text-zinc-500">
                    <Command className="w-2 h-2" /> K
                  </div>
                )}
              </div>
            </form>

            <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar px-6 pb-6">
              {result ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-orange-400 text-[10px] font-black uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" /> Cyber Guru Response
                  </div>
                  <div className="p-4 bg-orange-950/10 border border-orange-900/20 rounded-xl text-zinc-300 text-xs leading-relaxed font-bold uppercase whitespace-pre-wrap">
                    {result}
                  </div>
                  <button onClick={() => setResult(null)} className="text-[10px] font-black text-zinc-500 uppercase hover:text-orange-400 transition-colors">Clear Results</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Recent Telemetry Queries</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {recentQueries.map(q => (
                        <button 
                          key={q} 
                          onClick={() => { setQuery(q); handleSearch(); }}
                          className="flex items-center justify-between p-3 rounded-lg bg-black border border-zinc-800 group hover:border-orange-500/30 transition-all text-left"
                        >
                          <span className="text-[10px] font-bold text-zinc-400 group-hover:text-orange-400 uppercase">{q}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-black/50 text-center rounded-b-2xl">
              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">AI-Powered Security Intelligence Node v2.5</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NLQOverlay;
