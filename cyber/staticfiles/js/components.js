const Components = {
  badge(severity) {
    const colors = {
      critical: 'bg-red-600/20 text-red-500 border-red-500/30',
      high: 'bg-orange-600/20 text-orange-500 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      low: 'bg-emerald-600/20 text-emerald-500 border-emerald-500/30'
    };
    const color = colors[severity.toLowerCase()] || colors.low;
    return `<span class="px-2 py-1 text-xs font-bold uppercase rounded border ${color}">${severity}</span>`;
  },
  
  dataTable({ columns, data, onRowClick = '' }) {
    let thead = columns.map(c => `<th class="text-left py-3 px-4 text-zinc-500 uppercase text-xs tracking-wider border-b border-emerald-900/20">${c.label}</th>`).join('');
    
    let tbody = data.map(row => {
      let tds = columns.map(c => {
        let val = row[c.key] || '-';
        if (c.render) val = c.render(val, row);
        return `<td class="py-3 px-4 whitespace-nowrap text-zinc-300 font-mono text-sm">${val}</td>`;
      }).join('');
      return `<tr class="bg-zinc-900/40 hover:bg-emerald-900/10 cursor-pointer transition-colors border-l-2 border-transparent hover:border-emerald-500" ${onRowClick ? `onclick="${onRowClick}"` : ''}>${tds}</tr>`;
    }).join('');
    
    if (data.length === 0) {
      tbody = `<tr><td colspan="${columns.length}" class="py-8 text-center text-zinc-500 font-mono text-sm">No data available</td></tr>`;
    }

    return `
      <div class="overflow-x-auto">
        <table class="w-full border-separate border-spacing-y-2">
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
  },
  
  card(title, content, subtitle = '', action = '') {
    return `
      <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-5 shadow-2xl relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-br from-emerald-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div class="flex justify-between items-center mb-4 relative z-10">
          <div>
            <h3 class="text-lg font-bold text-emerald-500 font-mono">${title}</h3>
            ${subtitle ? `<p class="text-xs text-zinc-500 font-mono mt-1">${subtitle}</p>` : ''}
          </div>
          ${action ? `<div>${action}</div>` : ''}
        </div>
        <div class="relative z-10">${content}</div>
      </div>
    `;
  },
  
  statCard(icon, label, value, trend = '') {
    let trendHtml = '';
    if (trend) {
      const isUp = trend.startsWith('+');
      trendHtml = `<span class="text-xs font-mono ml-2 ${isUp ? 'text-emerald-500' : 'text-red-500'}">${trend}</span>`;
    }
    return `
      <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4 flex items-center shadow-xl">
        <div class="p-3 bg-emerald-900/20 rounded-lg text-emerald-500 mr-4">
          <i class="lucide-${icon} w-6 h-6"></i>
        </div>
        <div>
          <p class="text-zinc-500 text-xs font-mono uppercase tracking-wider">${label}</p>
          <div class="flex items-baseline">
            <h4 class="text-2xl font-bold text-white font-mono">${value}</h4>
            ${trendHtml}
          </div>
        </div>
      </div>
    `;
  },
  
  skeleton(rows = 4) {
    return `
      <div class="animate-pulse space-y-4">
        ${Array(rows).fill(0).map(() => `
          <div class="h-12 bg-zinc-900/50 rounded-lg w-full"></div>
        `).join('')}
      </div>
    `;
  },

  svgGauge(value, max = 100, size = 120, color = '#10b981') {
    const radius = size * 0.4;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / max) * circumference;
    return `
      <div class="relative flex justify-center items-center" style="width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}" class="transform -rotate-90">
          <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="#18181b" stroke-width="8" fill="none" />
          <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${color}" stroke-width="8" fill="none"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
                  class="transition-all duration-1000 ease-out" />
        </svg>
        <span class="absolute text-xl font-bold font-mono text-white">${value}</span>
      </div>
    `;
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container') || (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
      document.body.appendChild(el);
      return el;
    })();
    
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'bg-emerald-600/90' : 'bg-red-600/90';
    toast.className = `${bg} text-white px-4 py-3 rounded shadow-lg font-mono text-sm transform transition-all duration-300 translate-y-10 opacity-0`;
    toast.innerHTML = message;
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-10', 'opacity-0');
    });
    
    // Animate out
    setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};
