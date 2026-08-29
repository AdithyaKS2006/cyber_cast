const BlockchainPage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    try {
      const data = await ApiClient.get('/blockchain/transactions/');
      document.getElementById('page-content').innerHTML = this._template(data);
      this._bindEvents();
    } catch (e) {
      document.getElementById('page-content').innerHTML = `<div class="text-red-500 font-mono">Error: ${e.message}</div>`;
    }
  },

  _skeleton() { return Components.skeleton(); },

  _template(data) {
    const cols = [
      { key: 'tx_hash', label: 'TX Hash', render: v => `<span class="text-emerald-500 truncate block w-48">${v}</span>` },
      { key: 'block_number', label: 'Block' },
      { key: 'action_type', label: 'Action' },
      { key: 'status', label: 'Status', render: v => Components.badge(v) }
    ];

    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Immutable Ledger</h1>
        <p class="text-zinc-500 font-mono text-sm">Polygon network anchoring and zero-knowledge evidence proofs.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        ${Components.card('Network', '<div class="text-2xl text-white font-mono">Polygon Mumbai</div>')}
        ${Components.card('Block Height', '<div class="text-2xl text-emerald-500 font-mono animate-pulse">45,912,109</div>')}
        ${Components.card('Anchored IoCs', '<div class="text-2xl text-white font-mono">1,204</div>')}
      </div>

      ${Components.card('Transaction Log', Components.dataTable({ columns: cols, data }))}
    `;
  },

  _bindEvents() {
    lucide.createIcons();
  }
};
