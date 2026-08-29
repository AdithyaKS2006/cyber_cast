const IncidentsPage = {
  _abortController: null,
  
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      const data = await ApiClient.getIncidents({}, { signal: this._abortController.signal });
      document.getElementById('page-content').innerHTML = this._template(data);
      this._bindEvents();
    } catch (e) {
      if (e.name === 'AbortError') return;
      document.getElementById('page-content').innerHTML = this._error(e.message);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  _skeleton() {
    return typeof Components !== 'undefined' && Components.skeleton
      ? Components.skeleton(5)
      : '<div class="animate-pulse space-y-4">' + Array(5).fill('<div class="h-12 bg-zinc-900/50 rounded-lg w-full"></div>').join('') + '</div>';
  },

  _error(message) {
    return `<div class="text-red-500 font-mono p-4">Error loading incidents: ${message}</div>`;
  },

  _template(data) {
    const cols = [
      { key: 'incident_id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'severity', label: 'Severity', render: v => typeof Components !== 'undefined' && Components.badge ? Components.badge(v) : v },
      { key: 'status', label: 'Status' },
      { key: 'sla_minutes', label: 'SLA (mins)' }
    ];

    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">Incident Management</h1>
          <p class="text-zinc-500 font-mono text-sm">Triaging, SLA tracking, and resolution.</p>
        </div>
        <button class="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-white font-mono text-sm font-bold transition-colors">
          Open Ticket
        </button>
      </div>

      ${typeof Components !== 'undefined' && Components.card ? Components.card('Active Incidents', Components.dataTable({ columns: cols, data })) : ''}
    `;
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  destroy() {
    if (this._abortController) this._abortController.abort();
  }
};
