import React from 'react';
import { ChevronRight } from 'lucide-react';

const Breadcrumbs = ({ path = '' }) => {
  const crumbs = (path || '').split('/').filter(Boolean);
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500 tracking-tighter overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
      <span className="hover:text-orange-400 cursor-pointer transition-colors">Protocol</span>
      {crumbs.map((p, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3 text-zinc-700" />
          <span className={`${i === crumbs.length - 1 ? 'text-orange-400 underline underline-offset-4 decoration-orange-500/30 font-black' : 'hover:text-orange-400 cursor-pointer transition-colors'}`}>
            {p.replace(/-/g, ' ')}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumbs;
