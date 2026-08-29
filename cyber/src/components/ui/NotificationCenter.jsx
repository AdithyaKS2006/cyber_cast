import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Trash2, Info, AlertTriangle, ShieldAlert, Zap, Flame } from 'lucide-react';
import { useNotificationWebSocket } from '../../hooks/useWebSocket';
import { toast } from 'react-hot-toast';

const NotificationCenter = ({ 
  isOpen, onClose, notifications, 
  setNotifications, navigate 
}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNewNotification = useCallback((notif) => {
    const normalized = {
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: notif.type || 'VALIDATION',
      title: notif.title || 'New Alert',
      message: notif.message || 'WebSocket notification received',
      read: false,
      page: notif.page || 'notifications',
      time: notif.time || 'Just now',
    };
    setNotifications(prev => [normalized, ...prev].slice(0, 20));
    setUnreadCount(prev => prev + 1);

    // Show a high-visibility toast banner for critical/historical notifications
    if (normalized.type === 'historical_match' || normalized.type === 'CRITICAL_THREAT') {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-zinc-950 shadow-2xl rounded-lg pointer-events-auto flex ring-1 ring-red-500/50 relative overflow-hidden group border border-red-500/30`}
          >
            {/* Flashing background effect */}
            <div className="absolute inset-0 bg-red-500/10 animate-pulse mix-blend-screen pointer-events-none"></div>
            
            <div className="flex-1 w-0 p-4 relative z-10">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Flame className="h-5 w-5 text-red-500 animate-pulse" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-1">
                    {normalized.title}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-zinc-400 uppercase leading-relaxed">
                    {normalized.message}
                  </p>
                  
                  {normalized.type === 'historical_match' && (
                    <button
                      onClick={() => {
                        toast.dismiss(t.id);
                        navigate(normalized.page);
                        onClose && onClose();
                      }}
                      className="mt-3 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-[9px] font-black tracking-widest uppercase rounded transition-colors"
                    >
                      Review & Apply Fix
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex border-l border-red-900/30 relative z-10 bg-black/40">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-zinc-500 hover:text-white transition-colors focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ),
        { duration: 8000 }
      );
    }
  }, [setNotifications, navigate, onClose]);

  const handleUnreadCount = useCallback((count) => {
    setUnreadCount(count);
  }, []);

  useNotificationWebSocket(handleNewNotification, handleUnreadCount);

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const icons = {
    CRITICAL_THREAT: <ShieldAlert className="w-4 h-4 text-red-500" />,
    VALIDATION: <Zap className="w-4 h-4 text-orange-400" />,
    INCIDENT: <AlertTriangle className="w-4 h-4 text-orange-500" />,
    SANDBOX: <Info className="w-4 h-4 text-amber-500" />,
    REPORT: <Check className="w-4 h-4 text-zinc-400" />,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex justify-end pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" 
          />
          <motion.div 
            initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col pointer-events-auto h-screen"
          >
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-orange-400" />
                <h3 className="font-black text-white uppercase tracking-tighter">Notification Center</h3>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                  <Bell className="w-12 h-12 text-zinc-700" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Quiet on the channel</p>
                </div>
              ) : (
                notifications.map(n => (
                  <motion.div 
                    layout key={n.id} 
                    className={`p-4 rounded-xl border transition-all cursor-pointer group hover:border-orange-500/30 ${n.read ? 'bg-black border-zinc-800' : 'bg-orange-950/10 border-orange-500/30 shadow-lg shadow-orange-500/5'}`}
                    onClick={() => { markRead(n.id); navigate(n.page); onClose(); }}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                         {icons[n.type] || icons.REPORT}
                         <span className="text-[9px] font-black text-white uppercase">{n.title}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="text-[8px] font-bold text-zinc-600 uppercase">{n.time}</span>
                         <button 
                           onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                           className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                         >
                           <Trash2 className="w-3 h-3" />
                         </button>
                       </div>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 leading-relaxed uppercase">{n.message}</p>
                  </motion.div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 border-t border-zinc-800 bg-black">
                <button 
                  onClick={clearAll}
                  className="w-full py-2 text-[9px] font-black text-zinc-500 hover:text-orange-400 uppercase tracking-widest transition-all"
                >
                  Clear All Alerts
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
