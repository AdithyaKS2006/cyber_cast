const AdminSystemPage = {
  _pollInterval: null,
  _abortController: null,
  _charts: [],
  _healthData: null,

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      await ChartLoader.load();
      const data = await ApiClient.getSystemHealth({ signal: this._abortController.signal });
      this._healthData = data;
      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
      this._initCharts();
      this._startPolling();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('AdminSystemPage render failed:', e);
      document.getElementById('page-content').innerHTML = this._error(e.message);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  _skeleton() {
    return typeof Components !== 'undefined' && Components.skeleton
      ? Components.skeleton(6)
      : '<div class="animate-pulse space-y-4">' + Array(6).fill('<div class="h-12 bg-zinc-900/50 rounded-lg w-full"></div>').join('') + '</div>';
  },

  _error(message) {
    return `<div class="text-red-500 font-mono p-4">Error loading system health: ${message}</div>`;
  },

  _template() {
    const services = [
      { name: 'Django API', status: this._healthData?.celery === 'running' ? 'online' : 'online', desc: 'Main web framework' },
      { name: 'Celery Workers', status: this._healthData?.celery === 'running' ? 'online' : 'offline', desc: 'Background task queue' },
      { name: 'Redis Cache', status: this._healthData?.database === 'connected' ? 'online' : 'offline', desc: 'Caching layer' },
      { name: 'PostgreSQL', status: this._healthData?.database === 'connected' ? 'online' : 'offline', desc: 'Primary database' },
      { name: 'Polygon RPC', status: 'online', desc: 'Blockchain gateway' },
    ];

    const serviceCards = services.map(s => `
      <div class="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center">
        <div class="flex-shrink-0 mr-3">
          <span class="w-3 h-3 rounded-full ${s.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : s.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'} block"></span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-bold text-white font-mono">${s.name}</p>
          <p class="text-xs text-zinc-500 font-mono">${s.desc}</p>
        </div>
      </div>
    `).join('');

    const pipelines = [
      { name: 'main-deploy', status: 'success', duration: '2m 14s', triggered: '2 min ago' },
      { name: 'staging-deploy', status: 'success', duration: '1m 52s', triggered: '5 min ago' },
      { name: 'model-retrain', status: 'running', duration: '—', triggered: 'Running' },
      { name: 'security-scan', status: 'failed', duration: '4m 31s', triggered: '12 min ago' },
    ];

    const pipelineRows = pipelines.map(p => `
      <tr class="border-t border-emerald-900/10">
        <td class="py-3 px-4 font-mono text-sm text-emerald-400">${p.name}</td>
        <td class="py-3 px-4"><span class="px-2 py-1 text-xs font-black uppercase rounded ${p.status === 'success' ? 'bg-emerald-900/30 text-emerald-500' : p.status === 'running' ? 'bg-yellow-900/30 text-yellow-500' : 'bg-red-900/30 text-red-500'}">${p.status}</span></td>
        <td class="py-3 px-4 font-mono text-sm text-zinc-300">${p.duration}</td>
        <td class="py-3 px-4 font-mono text-sm text-zinc-500">${p.triggered}</td>
      </tr>
    `).join('');

    const errorLogs = [
      { timestamp: '2024-01-15 14:32:01', level: 'ERROR', message: 'WebSocket connection timeout for peer 0x8a2f' },
      { timestamp: '2024-01-15 14:28:45', level: 'WARNING', message: 'Rate limit threshold reached (95%) for /api/v1/threats/' },
      { timestamp: '2024-01-15 14:15:22', level: 'ERROR', message: 'Database connection pool exhausted' },
      { timestamp: '2024-01-15 14:02:10', level: 'INFO', message: 'AutoHunt scan completed: 0 anomalies detected' },
    ];

    const logRows = errorLogs.map(l => `
      <tr class="border-t border-emerald-900/10">
        <td class="py-2 px-4 font-mono text-xs text-zinc-500">${l.timestamp}</td>
        <td class="py-2 px-4"><span class="px-2 py-1 text-xs font-black uppercase rounded ${l.level === 'ERROR' ? 'bg-red-900/30 text-red-500' : l.level === 'WARNING' ? 'bg-yellow-900/30 text-yellow-500' : 'bg-emerald-900/30 text-emerald-500'}">${l.level}</span></td>
        <td class="py-2 px-4 font-mono text-sm text-zinc-300">${l.message}</td>
      </tr>
    `).join('');

    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">System Health</h1>
          <p class="text-zinc-500 font-mono text-sm">Real-time infrastructure monitoring and CI/CD status.</p>
        </div>
        <div class="text-xs text-zinc-500 font-mono" id="last-updated">Last updated: ${new Date().toLocaleTimeString()}</div>
      </div>

      <!-- Service Status Cards -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        ${serviceCards}
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4">
          <h3 class="text-sm font-black text-emerald-500 font-mono uppercase mb-2">CPU Usage (24h)</h3>
          <canvas id="chart-cpu" class="w-full h-[200px]"></canvas>
        </div>
        <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4">
          <h3 class="text-sm font-black text-emerald-500 font-mono uppercase mb-2">Memory (24h)</h3>
          <canvas id="chart-memory" class="w-full h-[200px]"></canvas>
        </div>
        <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4">
          <h3 class="text-sm font-black text-emerald-500 font-mono uppercase mb-2">API Response (ms)</h3>
          <canvas id="chart-api" class="w-full h-[200px]"></canvas>
        </div>
        <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4">
          <h3 class="text-sm font-black text-emerald-500 font-mono uppercase mb-2">Throughput (req/s)</h3>
          <canvas id="chart-throughput" class="w-full h-[200px]"></canvas>
        </div>
      </div>

      <!-- CI/CD Pipeline Table -->
      <div class="mb-6">
        ${typeof Components !== 'undefined' && Components.card ? Components.card('CI/CD Pipeline', `
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead><tr class="text-emerald-900 font-black uppercase text-[9px]">
                <th class="text-left py-2">Pipeline</th><th class="text-left py-2">Status</th><th class="text-left py-2">Duration</th><th class="text-left py-2">Triggered</th>
              </tr></thead>
              <tbody>${pipelineRows}</tbody>
            </table>
          </div>
        `) : ''}
      </div>

      <!-- Error Logs -->
      <div>
        ${typeof Components !== 'undefined' && Components.card ? Components.card('Error Log', `
          <div class="flex gap-2 mb-3">
            <input type="text" id="log-search" placeholder="Search logs..." class="flex-1 bg-black border border-emerald-900/30 rounded p-2 text-emerald-500 font-mono text-xs outline-none focus:border-emerald-500">
          </div>
          <div class="overflow-x-auto max-h-[300px]">
            <table class="w-full text-xs">
              <thead><tr class="text-emerald-900 font-black uppercase text-[9px] sticky top-0 bg-zinc-900">
                <th class="text-left py-2">Timestamp</th><th class="text-left py-2">Level</th><th class="text-left py-2">Message</th>
              </tr></thead>
              <tbody id="log-table-body">${logRows}</tbody>
            </table>
          </div>
        `) : ''}
      </div>
    `;
  },

  _initCharts() {
    this._destroyCharts();

    const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const cpuData = Array(24).fill(0).map(() => Math.floor(Math.random() * 40) + 30);
    const memData = Array(24).fill(0).map(() => Math.floor(Math.random() * 30) + 45);
    const apiData = Array(24).fill(0).map(() => Math.floor(Math.random() * 50) + 20);
    const throughputData = Array(24).fill(0).map(() => Math.floor(Math.random() * 200) + 50);

    const chartConfig = (label, data, borderColor, bg) => ({
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label,
          data,
          borderColor,
          backgroundColor: bg,
          borderWidth: 1,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
          x: { grid: { color: '#064e3b33' }, ticks: { color: '#064e3b', font: { family: 'JetBrains Mono', size: 8 } } },
          y: { grid: { color: '#064e3b33' }, ticks: { color: '#064e3b', font: { family: 'JetBrains Mono', size: 8 } } },
        },
        plugins: { legend: { display: false } },
      }
    });

    ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'].forEach((color, i) => {
      const ctx = document.getElementById(`chart-${['cpu','memory','api','throughput'][i]}`)?.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, chartConfig('metric', [cpuData, memData, apiData, throughputData][i], color, color + '20'));
        this._charts.push(chart);
      }
    });
  },

  _destroyCharts() {
    this._charts.forEach(c => c.destroy());
    this._charts = [];
  },

  async updateHealth() {
    try {
      if (this._abortController) this._abortController.abort();
      this._abortController = new AbortController();
      const data = await ApiClient.getSystemHealth({ signal: this._abortController.signal });
      this._healthData = data;

      const updated = document.getElementById('last-updated');
      if (updated) updated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

      this._charts.forEach((chart, i) => {
        const keyMap = ['cpu_percent', 'memory_percent', 'api_response_ms', null];
        const key = keyMap[i];
        if (key && data[key] !== undefined) {
          const val = typeof data[key] === 'string' ? parseInt(data[key]) : data[key];
          chart.data.datasets[0].data.shift();
          chart.data.datasets[0].data.push(val);
          chart.data.labels.shift();
          chart.data.labels.push(new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
          chart.update('none');
        }
      });
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Health update failed:', e);
    }
  },

  _startPolling() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    this._pollInterval = setInterval(() => {
      this.updateHealth();
    }, 10000);
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    const search = document.getElementById('log-search');
    if (search) {
      search.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#log-table-body tr');
        rows.forEach(row => {
          row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
        });
      });
    }
  },

  destroy() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    this._destroyCharts();
    if (this._abortController) this._abortController.abort();
    this._healthData = null;
  }
};
