const BlockchainPage = {
  _abortController: null,
  
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      const data = await ApiClient.getBlockchainTXs({}, { signal: this._abortController.signal });
      const transactions = Array.isArray(data) ? data : (data.results || []);
      document.getElementById('page-content').innerHTML = this._template(transactions);
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
    return typeof Components !== 'undefined' && Components.skeleton ? Components.skeleton(5) : ''; 
  },

  _error(message) {
    return `<div class="text-red-500 font-mono p-4">Error loading blockchain transactions: ${message}</div>`;
  },

  _template(data) {
    const cols = [
      { key: 'hash', label: 'TX Hash', render: v => `<span class="text-emerald-500 truncate block w-48">${v}</span>` },
      { key: 'block', label: 'Block' },
      { key: 'action', label: 'Action' },
      { key: 'status', label: 'Status', render: v => typeof Components !== 'undefined' && Components.badge ? Components.badge(v) : v }
    ];

    const tableHTML = typeof Components !== 'undefined' && Components.dataTable ? Components.dataTable({ columns: cols, data }) : '';

    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Immutable Ledger</h1>
        <p class="text-zinc-500 font-mono text-sm">Polygon network anchoring and zero-knowledge evidence proofs.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        ${typeof Components !== 'undefined' && Components.card ? Components.card('Network', '<div class="text-2xl text-white font-mono">Polygon Mumbai</div>') : ''}
        ${typeof Components !== 'undefined' && Components.card ? Components.card('Block Height', '<div class="text-2xl text-emerald-500 font-mono animate-pulse">45,912,109</div>') : ''}
        ${typeof Components !== 'undefined' && Components.card ? Components.card('Anchored IoCs', '<div class="text-2xl text-white font-mono">1,204</div>') : ''}
      </div>

      ${typeof Components !== 'undefined' && Components.card ? Components.card('Transaction Log', tableHTML) : tableHTML}
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
