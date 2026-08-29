const ProfilePage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    try {
      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
    } catch (e) {
      console.error('ProfilePage render failed:', e);
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
    return `<div class="text-red-500 font-mono p-4">Error loading profile: ${message}</div>`;
  },

  _template() {
    const user = ApiClient.currentUser || { email: 'analyst@cybersandbox.io', role: 'analyst', reputation_score: 95 };

    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">My Profile</h1>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-1">
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Identity', `
            <div class="text-center py-6">
              <div class="w-24 h-24 bg-emerald-900/30 rounded-full mx-auto mb-4 border-2 border-emerald-500/50 flex items-center justify-center text-3xl text-emerald-500">
                ${user.email.charAt(0).toUpperCase()}
              </div>
              <h3 class="text-xl font-bold text-white font-mono">${user.email}</h3>
              <div class="mt-2">${typeof Components !== 'undefined' ? Components.badge(user.role) : user.role}</div>
            </div>
            <div class="border-t border-emerald-900/20 pt-4 mt-4">
              <div class="flex justify-between font-mono text-sm mb-2">
                <span class="text-zinc-500">Reputation</span>
                <span class="text-emerald-500">${user.reputation_score}/100</span>
              </div>
            </div>
          `) : ''}
        </div>

        <div class="md:col-span-2 space-y-6">
          ${typeof Components !== 'undefined' && Components.card ? Components.card('API Keys', `
            <div class="text-zinc-400 font-mono text-sm mb-4">Use API keys to authenticate scripts and CLI tools against the REST API.</div>
            <button class="bg-zinc-900 hover:bg-zinc-800 text-emerald-500 px-4 py-2 rounded border border-emerald-900/30 font-mono text-sm transition-colors">
              Generate New Key
            </button>
          `) : ''}

          ${typeof Components !== 'undefined' && Components.card ? Components.card('Appearance', `
            <div class="flex items-center gap-4">
               <button class="p-4 bg-zinc-900 rounded border border-emerald-500 text-white font-mono font-bold">Dark Mode</button>
               <button class="p-4 bg-zinc-900 rounded border border-zinc-800 text-zinc-500 font-mono hover:text-white transition-colors cursor-not-allowed" disabled>Light Mode</button>
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
  }
};
