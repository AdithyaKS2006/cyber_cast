const ThreatFeedPage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    try {
      const data = await ApiClient.get('/threats/indicators/');
      document.getElementById('page-content').innerHTML = this._template(data);
      this._bindEvents();
    } catch (e) {
      document.getElementById('page-content').innerHTML = `<div class="text-red-500 font-mono">Error: ${e.message}</div>`;
    }
  },

  _skeleton() { return Components.skeleton(); },

  _template(data) {
    const cols = [
      { key: 'indicator_value', label: 'Indicator' },
      { key: 'indicator_type', label: 'Type' },
      { key: 'severity', label: 'Severity', render: val => Components.badge(val) },
      { key: 'created_at', label: 'First Seen', render: val => new Date(val).toLocaleString() }
    ];

    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">Threat Feed</h1>
          <p class="text-zinc-500 font-mono text-sm">Live indicators of compromise (IoC) registry.</p>
        </div>
        <div class="flex gap-2">
          <input type="text" placeholder="Search hash, IP..." class="bg-black border border-emerald-900/20 rounded p-2 text-emerald-500 font-mono text-sm outline-none focus:border-emerald-500 transition-colors">
        </div>
      </div>
      
      ${Components.card('Recent Indicators', Components.dataTable({ columns, data }))}
    `;
  },

  _bindEvents() {
    lucide.createIcons();
  }
};
