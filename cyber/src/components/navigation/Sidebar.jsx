import React, { useState } from 'react';
import { Menu, ChevronRight, ChevronDown } from 'lucide-react';
import { Logo } from '../ui/Common';
import { ALL_MENU_GROUPS } from '../../constants/menu';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({
  user, currentPage, navigate,
  collapsed, onToggleCollapse, onClose
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const menuGroups = ALL_MENU_GROUPS
    .map(g => ({ 
      ...g, 
      items: g.items.filter(i => i.roles.includes(user?.role)) 
    }))
    .filter(g => g.items.length > 0);

  const toggleGroup = (title) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) { next.delete(title); } else { next.add(title); }
      return next;
    });
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {!collapsed && (
        <div
          className="sidebar-overlay md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

    <aside
      className={`
        flex flex-col transition-all duration-400 z-[200] relative
        ${collapsed
          ? '-translate-x-full md:translate-x-0 w-0 md:w-16 md:flex hidden'
          : 'fixed inset-y-0 left-0 w-72 md:w-64 md:relative md:flex flex'}
      `}
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.92), rgba(5,5,5,0.96))',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        borderRight: '1px solid rgba(249,115,22,0.09)',
      }}>

      {/* Sidebar glow accent */}
      <div className="absolute top-0 right-0 w-[1px] h-full overflow-hidden pointer-events-none">
        <div className="w-full h-32 absolute top-0"
             style={{ background: 'linear-gradient(180deg, #f97316, transparent)' , opacity: 0.3 }} />
      </div>

      {/* Sidebar Header Logo */}
      <div
        className="p-6 flex items-center justify-between cursor-pointer overflow-hidden"
        style={{ borderBottom: '1px solid rgba(249,115,22,0.08)' }}
        onClick={() => navigate('dashboard')}
      >
        <Logo className={collapsed ? 'scale-75 -ml-2' : ''} hideText={collapsed} />
        {!collapsed && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="md:hidden p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
          >
            <Menu className="w-5 h-5 rotate-90" />
          </button>
        )}
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 px-3 space-y-6 pt-6 overflow-y-auto custom-scrollbar">
        {menuGroups.map((g, idx) => {
          const isGroupCollapsed = collapsedGroups.has(g.title);
          return (
            <div key={idx} className="space-y-1">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(g.title)}
                  className="w-full flex items-center justify-between text-[9px] font-black uppercase px-3 mb-2 tracking-[0.2em] transition-colors"
                  style={{ color: 'rgba(249,115,22,0.5)' }}
                >
                  <span className="hover:text-emerald-400 transition-colors">{g.title}</span>
                  {isGroupCollapsed ? <ChevronRight className="w-3 h-3 text-zinc-700" /> : <ChevronDown className="w-3 h-3 text-zinc-700" />}
                </button>
              ) : (
                <div className="my-4" style={{ borderTop: '1px solid rgba(16,185,129,0.05)' }} />
              )}

              <AnimatePresence>
                {(!isGroupCollapsed || collapsed) && g.items.map(i => {
                  const Icon = i.icon;
                  const isActive = currentPage === i.id;
                  return (
                    <motion.button
                      key={i.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      type="button"
                      onClick={() => {
                        navigate(i.id);
                        if (window.innerWidth < 768) onClose();
                      }}
                      title={collapsed ? i.label : undefined}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 relative overflow-hidden
                        touch-feedback
                        ${isActive
                          ? 'text-orange-400 font-black'
                          : 'text-zinc-500 hover:text-orange-300'}`}
                      style={isActive ? {
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(239,68,68,0.06))',
                        boxShadow: 'inset 0 0 20px rgba(249,115,22,0.06)',
                      } : {}}
                    >
                      {/* Active gradient bar */}
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="w-1 h-full absolute left-0 top-0 rounded-r-md"
                          style={{ background: 'linear-gradient(180deg, #f97316, #ef4444)' }}
                        />
                      )}

                      <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${isActive ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]' : ''}`} />
                      {!collapsed && (
                        <span className="text-[10.5px] uppercase tracking-wider text-left">{i.label}</span>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer Account Status */}
      <div className="p-6 space-y-4" style={{ borderTop: '1px solid rgba(16,185,129,0.06)' }}>
        {!collapsed && (
          <div className="p-4 rounded-xl glass-card">
            <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Authorization</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse"
                   style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 0 8px rgba(249,115,22,0.5)' }} />
              <span className="text-[10px] font-black uppercase tracking-widest"
                    style={{ background: 'linear-gradient(90deg, #f97316, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.role}</span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex justify-center p-3 text-zinc-600 hover:text-orange-400 transition-all glass-card rounded-xl"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>
    </aside>
    </>
  );
};

export default React.memo(Sidebar);
