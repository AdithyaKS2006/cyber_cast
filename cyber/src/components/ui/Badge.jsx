import React from 'react';
import { SEVERITY } from '../../constants';

const Badge = ({ severity, children }) => {
  const config = SEVERITY[severity] || SEVERITY.INFO;
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${config.color} ${config.text} transition-all duration-300 hover:brightness-110`}>
      {children || config.label}
    </span>
  );
};

export default Badge;
