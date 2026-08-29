const IntegrationsPage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    try {
      const data = await ApiClient.get('/integrations/');
      document.getElementById('page-content').innerHTML = this._template(data);
      this._bindEvents();
    } catch (e) {
      document.getElementById('page-content').innerHTML = `<div class="text-red-500 font-mono">Error: ${e.message}</div>`;
    }
  },

  _skeleton() { return Components.skeleton(); },

  _template(data) {
    const cards = data.map(i => `
      <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-5 hover:border-emerald-500/50 transition-colors">
        <div class="flex justify-between items-start mb-4">
          <div class="text-3xl">${i.icon}</div>
          ${i.is_connected ? `<span class="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>` : ''}
        </div>
        <h3 class="font-bold text-white font-mono">${i.display_name}</h3>
        <p class="text-xs text-zinc-500 font-mono mt-1 mb-4 h-8">${i.description}</p>
        <button class="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border ${i.is_connected ? 'border-emerald-500 text-emerald-500' : 'border-zinc-800 text-zinc-400'} rounded font-mono text-sm transition-colors" onclick="IntegrationsPage.toggle('${i.name}')">
          ${i.is_connected ? 'Configure' : 'Connect'}
        </button>
      </div>
    `).join('');

    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Integrations</h1>
        <p class="text-zinc-500 font-mono text-sm">Connect third-party SIEM, Identity, and Intel tools.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        ${cards}
      </div>
    `;
  },

  async toggle(name) {
    try {
      await ApiClient.post(\`/integrations/\${name}/toggle/\`, {});
      Components.showToast('Integration status updated.');
      this.render();
    } catch (e) {
      Components.showToast(e.message, 'error');
    }
  },

  _bindEvents() {
    lucide.createIcons();
  }
};
