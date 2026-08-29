import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '', title, subtitle, footer, action, glow = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    whileHover={{
      y: -4,
      transition: { duration: 0.3 }
    }}
    className={`glass-card rounded-2xl overflow-hidden flex flex-col group ${glow ? 'animate-pulse-glow' : ''} ${className}`}
  >
    {(title || action) && (
      <div className="px-5 py-4 border-b border-orange-500/10 flex justify-between items-center bg-black/30 backdrop-blur-sm">
        <div>
          <h3 className="gradient-text-accent font-bold tracking-tight uppercase text-xs">{title}</h3>
          {subtitle && <p className="text-zinc-500 text-[10px] mt-0.5 uppercase font-bold">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center">{action}</div>}
      </div>
    )}
    <div className="flex-1 p-5 min-h-0 flex flex-col relative z-10">{children}</div>
    {footer && <div className="px-5 py-3 bg-black/30 border-t border-orange-500/10 backdrop-blur-sm">{footer}</div>}
  </motion.div>
);

export default Card;
