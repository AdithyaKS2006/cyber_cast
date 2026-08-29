const ShiftsPage = {
  _pollInterval: null,
  _abortController: null,
  _shift: null,
  _journalEntries: [],

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      const data = await ApiClient.getCurrentShift({ signal: this._abortController.signal });
      this._shift = data;
      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
      this._startCountdown();
      await this._loadJournal();
      await this._loadHandoverDraft();
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
    return `<div class="text-red-500 font-mono p-4">Error loading shifts: ${message}</div>`;
  },

  _template() {
    const endTime = this._shift?.end_time || new Date(Date.now() + 4 * 3600000).toISOString();
    const end = new Date(endTime);
    const now = new Date();
    const diffMs = end - now;
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">Shift Handover</h1>
          <p class="text-zinc-500 font-mono text-sm">Real-time shift management and journal logging.</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-zinc-500 font-mono uppercase">Shift Ends In</p>
          <div id="countdown" class="text-2xl font-bold text-emerald-500 font-mono">
            ${this._formatCountdown(totalSeconds)}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Shift Info + Journal -->
        <div class="lg:col-span-2 space-y-6">
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Shift Info', `
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div><span class="text-zinc-500 font-mono">Analyst</span><span class="text-white font-mono">${this._shift?.analyst_name || ApiClient.currentUser?.name || 'ANONYMOUS'}</span></div>
              <div><span class="text-zinc-500 font-mono">Role</span><span class="text-emerald-500 font-mono">${this._shift?.role || ApiClient.currentUser?.role || 'analyst'}</span></div>
              <div><span class="text-zinc-500 font-mono">Start</span><span class="text-zinc-300 font-mono">${this._shift?.start_time ? new Date(this._shift.start_time).toLocaleTimeString() : new Date().toLocaleTimeString()}</span></div>
              <div><span class="text-zinc-500 font-mono">End</span><span class="text-zinc-300 font-mono">${new Date(endTime).toLocaleTimeString()}</span></div>
            </div>
          `) : ''}

          ${typeof Components !== 'undefined' && Components.card ? Components.card('Shift Journal', `
            <div class="space-y-3">
              <div id="journal-form" class="flex gap-2">
                <input type="text" id="journal-input" placeholder="Add journal entry..." class="flex-1 bg-black border border-emerald-900/30 rounded p-2 text-emerald-500 font-mono text-sm outline-none focus:border-emerald-500 transition-colors" autocomplete="off">
                <button onclick="ShiftsPage.addJournalEntry()" class="bg-emerald-600 hover:bg-emerald-500 text-black font-black px-4 py-2 rounded font-mono text-xs transition-colors">Add</button>
              </div>
              <div id="journal-entries" class="space-y-2 max-h-[300px] overflow-y-auto mt-3">
                ${this._journalEntries.length ? this._journalEntries.map(e => `
                  <div class="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                    <p class="text-xs text-zinc-300 font-mono">${e.entry || e.text}</p>
                    <p class="text-[9px] text-zinc-600 font-mono mt-1">${e.timestamp || new Date().toLocaleTimeString()}</p>
                  </div>
                `).join('') : '<p class="text-xs text-zinc-600 font-mono">No journal entries yet.</p>'}
              </div>
            </div>
          `) : ''}
        </div>

        <!-- Handover Report -->
        <div>
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Handover Report', `
            <div class="space-y-3">
              <textarea id="handover-text" placeholder="Handover notes..." class="w-full bg-black border border-emerald-900/30 rounded p-3 text-emerald-500 font-mono text-sm outline-none focus:border-emerald-500 transition-colors resize-none h-[200px]"></textarea>
              <div class="flex justify-end">
                <button onclick="ShiftsPage.signOffHandover()" class="bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase px-4 py-2 rounded font-mono text-xs transition-colors">
                  Sign Off
                </button>
              </div>
            </div>
          `) : ''}
        </div>
      </div>
    `;
  },

  _formatCountdown(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  _startCountdown() {
    const endTime = new Date(this._shift?.end_time || Date.now() + 4 * 3600000);

    this._pollInterval = setInterval(() => {
      const now = new Date();
      const diffMs = endTime - now;
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      const el = document.getElementById('countdown');
      if (el) el.textContent = this._formatCountdown(totalSeconds);
    }, 1000);
  },

  async _loadJournal() {
    try {
      this._journalEntries = await ApiClient._fetch('/shifts/journal/', {
        signal: this._abortController.signal
      });
      if (!Array.isArray(this._journalEntries)) {
        this._journalEntries = this._journalEntries.results || this._journalEntries.entries || [];
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._journalEntries = [];
    }

    const container = document.getElementById('journal-entries');
    if (container) {
      container.innerHTML = this._journalEntries.length
        ? this._journalEntries.map(e => `
            <div class="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
              <p class="text-xs text-zinc-300 font-mono">${e.entry || e.text}</p>
              <p class="text-[9px] text-zinc-600 font-mono mt-1">${e.timestamp || new Date().toLocaleTimeString()}</p>
            </div>
          `).join('')
        : '<p class="text-xs text-zinc-600 font-mono">No journal entries yet.</p>';
    }
  },

  async _loadHandoverDraft() {
    try {
      const draft = await ApiClient.getHandoverDraft({ signal: this._abortController.signal });
      const textarea = document.getElementById('handover-text');
      if (textarea && draft.content) textarea.value = draft.content;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  },

  async addJournalEntry() {
    const input = document.getElementById('journal-input');
    if (!input || !input.value.trim()) return;

    const entry = { entry: input.value.trim() };
    input.value = '';

    try {
      const result = await ApiClient.addJournalEntry(entry);
      if (result && (result.id || result.entry)) {
        this._journalEntries.unshift({
          entry: result.entry || entry.entry,
          timestamp: result.created_at || new Date().toISOString(),
        });
      } else {
        this._journalEntries.unshift({
          entry: entry.entry,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      const container = document.getElementById('journal-entries');
      if (container) {
        container.innerHTML = this._journalEntries.map(e => `
          <div class="p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
            <p class="text-xs text-zinc-300 font-mono">${e.entry || e.text}</p>
            <p class="text-[9px] text-zinc-600 font-mono mt-1">${e.timestamp || new Date().toLocaleTimeString()}</p>
          </div>
        `).join('');
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  signOffHandover() {
    const textarea = document.getElementById('handover-text');
    const content = textarea ? textarea.value.trim() : '';

    if (!confirm('Sign off on this handover report? This action cannot be undone.')) {
      return;
    }

    this._signOffConfirm(content);
  },

  async _signOffConfirm(content) {
    try {
      await ApiClient.signOffHandover({ content, signed: true });
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Handover signed successfully', 'success');
      }
      navigate('dashboard');
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    const input = document.getElementById('journal-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.addJournalEntry();
      });
    }
  },

  destroy() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    if (this._abortController) this._abortController.abort();
    this._journalEntries = [];
    this._shift = null;
  }
};
