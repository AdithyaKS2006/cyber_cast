const DashboardPage = {
  chartInstance: null,
  _pollInterval: null,
  _abortController: null,

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      const data = await ApiClient.getDashboardData({ signal: this._abortController.signal });
      document.getElementById('page-content').innerHTML = this._template(data);
      this._initChart(data.timeline || []);
      this.updateStats(data.kpis || data);
      this._startRealTimeUpdates();
      this._bindEvents();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Dashboard render failed:', e);
      document.getElementById('page-content').innerHTML = this._error(e.message);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  _skeleton() {
    return `
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        ${Array(4).fill(0).map(() => `<div class="h-24 bg-zinc-900/50 animate-pulse rounded-xl"></div>`).join('')}
      </div>
      ${typeof Components !== 'undefined' && Components.skeleton ? Components.skeleton(5) : ''}
    `;
  },

  _error(message) {
    return `<div class="text-red-500 p-4 font-mono">Error loading dashboard: ${message}</div>`;
  },

  _template(data) {
    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">SOC Command Center</h1>
          <p class="text-zinc-500 font-mono text-sm">Real-time threat telemetry and sandboxing status.</p>
        </div>
        <div class="flex gap-2">
            <button class="bg-zinc-900 hover:bg-zinc-800 text-emerald-500 border border-emerald-900/30 px-4 py-2 rounded-lg font-mono text-sm transition-colors" onclick="navigate('sandbox')">
             + New Detonation
            </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-zinc-500 font-mono text-xs uppercase">Active Threats</p>
            <p class="text-3xl font-bold text-white mt-2 font-mono" id="stat-active-threats">${data.active_threats || 0}</p>
          </div>
          <div class="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
            <i data-lucide="shield-alert"></i>
          </div>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-zinc-500 font-mono text-xs uppercase">Labs Running</p>
            <p class="text-3xl font-bold text-white mt-2 font-mono" id="stat-labs-running">${data.labs_running || 0}</p>
          </div>
          <div class="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
            <i data-lucide="flame"></i>
          </div>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-zinc-500 font-mono text-xs uppercase">Chain Anchors</p>
            <p class="text-3xl font-bold text-white mt-2 font-mono" id="stat-chain-anchors">${data.chain_anchors || 0}</p>
          </div>
          <div class="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
            <i data-lucide="activity"></i>
          </div>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-zinc-500 font-mono text-xs uppercase">Guru Queries</p>
            <p class="text-3xl font-bold text-white mt-2 font-mono" id="stat-guru-queries">${data.guru_queries || 0}</p>
          </div>
          <div class="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
            <i data-lucide="network"></i>
          </div>
        </div>
      </div>

      <!-- Charts & Tables -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          ${typeof Components !== 'undefined' ? Components.card('Activity Timeline', `
            <div class="h-[300px]">
               <canvas id="threat-chart"></canvas>
            </div>
          `, '24 hour threat volume') : ''}
        </div>
        
        <div class="lg:col-span-1">
          ${typeof Components !== 'undefined' ? Components.card('Quick Actions', `
            <div class="flex flex-col gap-3">
              <button class="w-full text-left bg-zinc-900 hover:bg-emerald-900/20 border border-zinc-800 hover:border-emerald-500/30 p-3 rounded text-zinc-300 font-mono text-sm transition-colors" onclick="navigate('threat-feed')">🔍 Search Indicators</button>
              <button class="w-full text-left bg-zinc-900 hover:bg-emerald-900/20 border border-zinc-800 hover:border-emerald-500/30 p-3 rounded text-zinc-300 font-mono text-sm transition-colors" onclick="navigate('packet-analyzer')">📡 Analyze PCAP</button>
              <button class="w-full text-left bg-zinc-900 hover:bg-emerald-900/20 border border-zinc-800 hover:border-emerald-500/30 p-3 rounded text-zinc-300 font-mono text-sm transition-colors" onclick="navigate('cyber-guru')">💬 Ask Cyber Guru</button>
            </div>
          `) : ''}
        </div>
      </div>
    `;
  },

  _initChart(initialData) {
    const ctx = document.getElementById('threat-chart')?.getContext('2d');
    if (!ctx) return;
    
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
    
    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initialData.map(d => d.time),
        datasets: [{
          label: 'Threats',
          data: initialData.map(d => d.threats),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 1,
          fill: true,
          stepped: 'after',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        scales: {
          x: { grid: { color: '#064e3b33' }, ticks: { color: '#064e3b', font: { family: 'JetBrains Mono' } } },
          y: { grid: { color: '#064e3b33' }, ticks: { color: '#064e3b', font: { family: 'JetBrains Mono' } } },
        },
        plugins: { legend: { display: false } },
      }
    });
  },

  updateChart(newDataPoint) {
    if (!this.chartInstance) return;
    const chart = this.chartInstance;
    chart.data.labels.push(newDataPoint.time);
    chart.data.datasets[0].data.push(newDataPoint.threats);
    if (chart.data.labels.length > 24) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.update('none');  // 'none' = no animation for smooth real-time
  },

  updateStats(data) {
    const update = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value?.toLocaleString() || '0';
    };
    update('stat-active-threats', data?.active_threats);
    update('stat-labs-running', data?.labs_running);
    update('stat-chain-anchors', data?.chain_anchors);
    update('stat-guru-queries', data?.guru_queries || data?.total_threats);
  },

  _startRealTimeUpdates() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    this._pollInterval = setInterval(async () => {
      try {
        const data = await ApiClient.getDashboardData({ signal: this._abortController?.signal });
        this.updateStats(data.kpis || data);
      } catch (e) {
        // Silent fail on polling
      }
    }, 30000);  // Poll every 30s as fallback
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  destroy() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    if (this._abortController) this._abortController.abort();
    if (this.chartInstance) this.chartInstance.destroy();
    this.chartInstance = null;
  }
};
