const AdminPage = {
  _abortController: null,
  
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      const data = await ApiClient.getUsers({}, { signal: this._abortController.signal });
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
    return `<div class="text-red-500 font-mono p-4">Error loading admin panel: ${message}</div>`;
  },

  _template(data) {
    const cols = [
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role', render: v => typeof Components !== 'undefined' && Components.badge ? Components.badge(v) : v },
      { key: 'reputation_score', label: 'Reputation' },
      { key: 'is_active', label: 'Active', render: v => v ? 'Yes' : 'No' }
    ];

    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Admin Settings</h1>
        <p class="text-zinc-500 font-mono text-sm">Manage users, configurations, and ML models.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         <div class="md:col-span-2">
           ${typeof Components !== 'undefined' && Components.card ? Components.card('User Management', Components.dataTable({ columns: cols, data })) : ''}
         </div>
         <div>
           ${typeof Components !== 'undefined' && Components.card ? Components.card('System Status', `
             <div class="space-y-4">
               <div class="flex justify-between items-center"><span class="text-zinc-400 font-mono">ML Engine</span><span class="text-emerald-500">Online</span></div>
               <div class="flex justify-between items-center"><span class="text-zinc-400 font-mono">Celery Workers</span><span class="text-emerald-500">Online (4/4)</span></div>
               <div class="flex justify-between items-center"><span class="text-zinc-400 font-mono">Redis</span><span class="text-emerald-500">Connected</span></div>
               <div class="flex justify-between items-center"><span class="text-zinc-400 font-mono">Polygon RPC</span><span class="text-yellow-500">Lagging (5s)</span></div>
             </div>
           `) : ''}
         </div>
      </div>
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
