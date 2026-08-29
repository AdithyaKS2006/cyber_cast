const AnalyticsPage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    try {
      const data = await ApiClient.get('/analytics/dashboard/');
      document.getElementById('page-content').innerHTML = this._template(data);
      this._bindEvents();
    } catch (e) {
      document.getElementById('page-content').innerHTML = `<div class="text-red-500 font-mono">Error: ${e.message}</div>`;
    }
  },

  _skeleton() { return Components.skeleton(); },

  _template(data) {
    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Analytics Engine</h1>
        <p class="text-zinc-500 font-mono text-sm">Machine learning metrics and AutoHunt results.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        ${Components.card('Severity Distribution', `
          <div class="h-64 flex items-center justify-center border border-dashed border-zinc-800 rounded">
            <span class="text-zinc-600 font-mono text-sm">Chart rendering context</span>
          </div>
        `)}
        ${Components.card('Attack Classes (ML Prediction)', `
          <div class="h-64 flex items-center justify-center border border-dashed border-zinc-800 rounded">
            <span class="text-zinc-600 font-mono text-sm">Chart rendering context</span>
          </div>
        `)}
      </div>
      
      ${Components.card('AutoHunt ML Results', `
        <div class="text-zinc-400 font-mono text-sm mb-4">Last run: 2 hours ago. Found 0 anomalies.</div>
        <button class="bg-zinc-900 hover:bg-zinc-800 text-emerald-500 px-4 py-2 rounded border border-emerald-900/30 font-mono text-sm transition-colors">
          Trigger Manual Scan
        </button>
      `)}
    `;
  },

  _bindEvents() {
    lucide.createIcons();
  }
};
