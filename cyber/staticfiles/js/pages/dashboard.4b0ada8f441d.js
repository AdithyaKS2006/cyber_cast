const DashboardPage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    try {
      const data = await ApiClient.get('/analytics/dashboard/');
      document.getElementById('page-content').innerHTML = this._template(data);
      this._bindEvents();
    } catch (e) {
      document.getElementById('page-content').innerHTML = `<div class="text-red-500 p-4 font-mono">Error loading dashboard: ${e.message}</div>`;
    }
  },

  _skeleton() {
    return `
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        ${Array(4).fill(0).map(() => `<div class="h-24 bg-zinc-900/50 animate-pulse rounded-xl"></div>`).join('')}
      </div>
      ${Components.skeleton(5)}
    `;
  },

  _template(data) {
    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">SOC Command Center</h1>
          <p class="text-zinc-500 font-mono text-sm">Real-time threat telemetry and sandboxing status.</p>
        </div>
        <div class="flex gap-2">
          <button class="bg-zinc-900 hover:bg-zinc-800 text-emerald-500 border border-emerald-900/30 px-4 py-2 rounded-lg font-mono text-sm transition-colors" onclick="app.navigate('sandbox')">
            + New Detonation
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${Components.statCard('shield-alert', 'Total Threats', data.total_threats || 0, '+12%')}
        ${Components.statCard('flame', 'Critical Alerts', data.critical_threats || 0, '+2')}
        ${Components.statCard('activity', 'Active Incidents', data.active_incidents || 0, '-1')}
        ${Components.statCard('network', 'Packets Analyzed', data.packets_analyzed || 0)}
      </div>

      <!-- Charts & Tables -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          ${Components.card('Activity Timeline', `
            <div class="h-[300px] flex items-center justify-center border border-dashed border-zinc-800 rounded bg-zinc-950/50">
               <span class="text-zinc-600 font-mono text-sm">Chart.js Implementation Pending</span>
            </div>
          `, '24 hour threat volume')}
        </div>
        
        <div class="lg:col-span-1">
          ${Components.card('Quick Actions', `
            <div class="flex flex-col gap-3">
              <button class="w-full text-left bg-zinc-900 hover:bg-emerald-900/20 border border-zinc-800 hover:border-emerald-500/30 p-3 rounded text-zinc-300 font-mono text-sm transition-colors" onclick="app.navigate('threat-feed')">🔍 Search Indicators</button>
              <button class="w-full text-left bg-zinc-900 hover:bg-emerald-900/20 border border-zinc-800 hover:border-emerald-500/30 p-3 rounded text-zinc-300 font-mono text-sm transition-colors" onclick="app.navigate('packet-analyzer')">📡 Analyze PCAP</button>
              <button class="w-full text-left bg-zinc-900 hover:bg-emerald-900/20 border border-zinc-800 hover:border-emerald-500/30 p-3 rounded text-zinc-300 font-mono text-sm transition-colors" onclick="app.navigate('cyber-guru')">💬 Ask Cyber Guru</button>
            </div>
          `)}
        </div>
      </div>
    `;
  },

  _bindEvents() {
    lucide.createIcons();
  }
};
