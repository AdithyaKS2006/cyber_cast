const ThreatFeedPage = {
  _abortController: null,
  
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      const data = await ApiClient.getThreats({}, { signal: this._abortController.signal });
      const indicators = Array.isArray(data) ? data : (data.results || []);
      document.getElementById('page-content').innerHTML = this._template(indicators);
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
    return `<div class="text-red-500 font-mono p-4">Error loading threat feed: ${message}</div>`;
  },

  _template(data) {
    const cols = [
      { key: 'value', label: 'Indicator' },
      { key: 'ioc_type', label: 'Type' },
      { key: 'severity', label: 'Severity', render: val => typeof Components !== 'undefined' && Components.badge ? Components.badge(val) : val },
      { key: 'first_seen', label: 'First Seen', render: val => val ? new Date(val).toLocaleString() : 'N/A' }
    ];

    const tableHTML = typeof Components !== 'undefined' && Components.dataTable
      ? Components.dataTable({ columns: cols, data })
      : '';

    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">Threat Feed</h1>
          <p class="text-zinc-500 font-mono text-sm">Live indicators of compromise (IoC) registry.</p>
        </div>
        <div class="flex gap-2">
          <input type="text" id="threat-feed-search" placeholder="Search hash, IP..." class="bg-black border border-emerald-900/20 rounded p-2 text-emerald-500 font-mono text-sm outline-none focus:border-emerald-500 transition-colors">
        </div>
      </div>

      ${typeof Components !== 'undefined' && Components.card ? Components.card('Recent Indicators', tableHTML) : tableHTML}
    `;
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    const searchInput = document.getElementById('threat-feed-search');
    if (searchInput) {
      searchInput.addEventListener('input', async (e) => {
        const query = e.target.value;
        try {
          const data = await ApiClient.getThreats({ search: query });
          const indicators = Array.isArray(data) ? data : (data.results || []);

          const cardBody = document.querySelector('#page-content .custom-scrollbar, #page-content table');
          if (cardBody) {
            const cols = [
              { key: 'value', label: 'Indicator' },
              { key: 'ioc_type', label: 'Type' },
              { key: 'severity', label: 'Severity', render: val => typeof Components !== 'undefined' && Components.badge ? Components.badge(val) : val },
              { key: 'first_seen', label: 'First Seen', render: val => val ? new Date(val).toLocaleString() : 'N/A' }
            ];
            const newTable = typeof Components !== 'undefined' && Components.dataTable
              ? Components.dataTable({ columns: cols, data: indicators })
              : '';
            const parentCard = cardBody.closest('.bg-zinc-900');
            if (parentCard) {
              const bodyContainer = parentCard.querySelector('.p-6') || parentCard;
              bodyContainer.innerHTML = newTable;
            }
          }
        } catch (err) {
          if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast(err.message, 'error');
          }
        }
      });
    }
  },

  destroy() {
    if (this._abortController) this._abortController.abort();
  }
};
