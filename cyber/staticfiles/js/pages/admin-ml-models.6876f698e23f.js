const AdminMLModelsPage = {
  _abortController: null,
  _charts: [],
  _models: [],
  _selectedModel: null,

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      await ChartLoader.load();
      const data = await ApiClient.getMLModels({ signal: this._abortController.signal });
      this._models = Array.isArray(data) ? data : (data.results || []);
      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('AdminMLModelsPage render failed:', e);
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
    return `<div class="text-red-500 font-mono p-4">Error loading ML models: ${message}</div>`;
  },

  _template() {
    const modelRows = this._models.map(m => `
      <tr class="border-t border-emerald-900/10 hover:bg-emerald-900/5 cursor-pointer transition-colors" onclick="AdminMLModelsPage.viewModel('${m.id}')">
        <td class="py-3 px-4 font-mono text-sm text-white">${m.name}</td>
        <td class="py-3 px-4 font-mono text-sm text-zinc-300">${m.model_type}</td>
        <td class="py-3 px-4 font-mono text-sm text-zinc-400">${m.version}</td>
        <td class="py-3 px-4">${typeof Components !== 'undefined' && Components.badge ? Components.badge(m.status) : m.status}</td>
        <td class="py-3 px-4 font-mono text-sm text-emerald-400">${(m.accuracy * 100).toFixed(1)}%</td>
        <td class="py-3 px-4">${m.champion ? '<span class="text-yellow-500">★ Champion</span>' : ''}</td>
      </tr>
    `).join('');

    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">ML Models</h1>
          <p class="text-zinc-500 font-mono text-sm">Model registry, drift monitoring, and A/B testing.</p>
        </div>
        <button onclick="AdminMLModelsPage.exportReport()" class="bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase px-4 py-2 rounded-lg font-mono text-sm transition-colors">
          Export Report
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Model Registry', `
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead><tr class="text-emerald-900 font-black uppercase text-[9px]">
                  <th class="text-left py-2">Model</th><th class="text-left py-2">Type</th><th class="text-left py-2">Version</th><th class="text-left py-2">Status</th><th class="text-left py-2">Accuracy</th><th class="text-left py-2">Champion</th>
                </tr></thead>
                <tbody>${modelRows || '<tr><td colspan="6" class="py-8 text-center text-zinc-500 font-mono">No models registered</td></tr>'}</tbody>
              </table>
            </div>
          `) : ''}
        </div>
        <div>
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Model Details', `
            <div id="model-detail-panel" class="text-center py-12">
              <p class="text-zinc-600 font-mono text-sm">Select a model to view drift chart</p>
            </div>
          `) : ''}
        </div>
      </div>
    `;
  },

  async viewModel(modelId) {
    this._selectedModel = this._models.find(m => m.id === modelId);
    if (!this._selectedModel) return;

    try {
      const driftData = await ApiClient.getModelDrift(modelId, { signal: this._abortController.signal });

      const panel = document.getElementById('model-detail-panel');
      if (!panel) return;

      panel.innerHTML = `
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold text-white font-mono">${this._selectedModel.name} v${this._selectedModel.version}</h3>
            <span class="px-2 py-1 text-xs font-black uppercase rounded ${this._selectedModel.champion ? 'bg-yellow-900/30 text-yellow-500' : 'bg-emerald-900/30 text-emerald-500'}">
              ${this._selectedModel.champion ? 'Champion' : this._selectedModel.ab_test_group || 'Staging'}
            </span>
          </div>
          <p class="text-xs text-zinc-500 font-mono">Accuracy: ${(this._selectedModel.accuracy * 100).toFixed(2)}% | F1: ${(this._selectedModel.f1_score * 100).toFixed(1)}%</p>

          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="text-xs text-zinc-500 font-mono uppercase">A/B Traffic Split</label>
              <span class="text-xs text-emerald-500 font-mono" id="split-value">${Math.round(this._selectedModel.traffic_split * 100)}%</span>
            </div>
            <input type="range" id="traffic-split" min="0" max="100" value="${Math.round(this._selectedModel.traffic_split * 100)}" class="w-full">
          </div>

          <div id="drift-chart-container" class="h-[180px]">
            <canvas id="drift-chart"></canvas>
          </div>
        </div>
      `;

      this._destroyCharts();
      const ctx = document.getElementById('drift-chart')?.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: driftData.map(d => d.date),
            datasets: [{
              label: 'Accuracy',
              data: driftData.map(d => d.accuracy),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
              y: { grid: { color: '#064e3b33' }, ticks: { color: '#064e3b', font: { family: 'JetBrains Mono', size: 8 } }, min: 0, max: 1 },
            },
            plugins: { legend: { display: false } },
          }
        });
        this._charts.push(chart);
      }

      const splitInput = document.getElementById('traffic-split');
      if (splitInput) {
        splitInput.addEventListener('input', async (e) => {
          const val = parseInt(e.target.value);
          document.getElementById('split-value').textContent = `${val}%`;
          await ApiClient.updateModelSplit({
            model_id: modelId,
            traffic_split: val / 100,
          });
          if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast(`Traffic split set to ${val}%`, 'success');
          }
        });
      }

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Model drift load failed:', e);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  async promoteModel(modelId) {
    if (!confirm('Promote this model to champion? This will replace the current champion.')) return;
    try {
      await ApiClient.promoteModel(modelId, { signal: this._abortController.signal });
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Model promoted to champion', 'success');
      }
      this.render();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  exportReport() {
    if (typeof Components !== 'undefined' && Components.showToast) {
      Components.showToast('Export feature coming soon', 'success');
    }
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  destroy() {
    this._destroyCharts();
    if (this._abortController) this._abortController.abort();
    this._models = [];
    this._selectedModel = null;
  },

  _destroyCharts() {
    this._charts.forEach(c => c.destroy());
    this._charts = [];
  }
};
