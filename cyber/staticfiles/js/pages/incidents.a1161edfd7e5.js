const IncidentsPage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    try {
      const data = await ApiClient.get('/incidents/');
      document.getElementById('page-content').innerHTML = this._template(data);
      this._bindEvents();
    } catch (e) {
      document.getElementById('page-content').innerHTML = `<div class="text-red-500 font-mono">Error: ${e.message}</div>`;
    }
  },

  _skeleton() { return Components.skeleton(); },

  _template(data) {
    const cols = [
      { key: 'incident_id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'severity', label: 'Severity', render: v => Components.badge(v) },
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

      ${Components.card('Active Incidents', Components.dataTable({ columns: cols, data }))}
    `;
  },

  _bindEvents() {
    lucide.createIcons();
  }
};
