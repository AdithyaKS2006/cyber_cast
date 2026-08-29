const ComplianceEnginePage = {
  _pollInterval: null,
  _abortController: null,
  _frameworks: [],
  _activeControl: null,

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      const data = await ApiClient.getFrameworks({}, { signal: this._abortController.signal });
      this._frameworks = Array.isArray(data) ? data : (data.results || data.frameworks || []);
      document.getElementById('page-content').innerHTML = this._template(this._frameworks);
      this._bindEvents();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('ComplianceEngine render failed:', e);
      document.getElementById('page-content').innerHTML = this._error(e.message);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  _skeleton() {
    return typeof Components !== 'undefined' && Components.skeleton
      ? Components.skeleton(6)
      : '<div class="animate-pulse space-y-4">' + Array(6).fill('<div class="h-12 bg-zinc-900/50 rounded-lg w-full"></div>').join('') + '</div>';
  },

  _error(message) {
    return `<div class="text-red-500 font-mono p-4">Error loading compliance engine: ${message}</div>`;
  },

  _template(frameworks) {
    const statusColors = {
      compliant: 'bg-emerald-500',
      non_compliant: 'bg-red-500',
      partial: 'bg-yellow-500',
      pending: 'bg-zinc-500',
    };

    const frameworkCards = frameworks.map(fw => {
      const totalControls = fw.controls?.length || 0;
      const compliant = fw.controls?.filter(c => c.status === 'compliant').length || 0;
      const pct = totalControls ? Math.round((compliant / totalControls) * 100) : 0;

      return `
        <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-5">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-lg font-bold text-white font-mono">${fw.name || fw.framework || 'Unknown Framework'}</h3>
              <p class="text-xs text-zinc-500 font-mono">${fw.description || ''}</p>
            </div>
            <div class="text-right">
              <span class="text-2xl font-bold text-emerald-500 font-mono">${pct}%</span>
              <p class="text-[10px] text-zinc-500 font-black uppercase">${compliant}/${totalControls} controls</p>
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            ${(fw.controls || []).map(ctrl => {
              const dot = statusColors[ctrl.status] || statusColors.pending;
              return `
                <button onclick="ComplianceEnginePage.openControlDetail('${fw.id}', '${ctrl.id}')"
                        class="text-left p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg hover:border-emerald-500/30 transition-colors group cursor-pointer">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="w-2 h-2 rounded-full ${dot} flex-shrink-0"></span>
                    <span class="text-xs font-black text-zinc-400 uppercase group-hover:text-emerald-500 transition-colors">${ctrl.category || ctrl.id?.substring(0,8)}</span>
                  </div>
                  <p class="text-xs text-zinc-300 font-mono truncate">${ctrl.title || ctrl.name || ctrl.id}</p>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">Compliance Engine</h1>
          <p class="text-zinc-500 font-mono text-sm">Framework checklist and control grid for audit readiness.</p>
        </div>
        <button onclick="ComplianceEnginePage.generateEvidencePack()"
                class="bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase tracking-widest px-6 py-3 rounded-lg font-mono text-sm transition-colors">
          Generate Evidence Pack
        </button>
      </div>

      <div class="space-y-6" id="compliance-framework-list">
        ${frameworkCards || '<p class="text-zinc-600 font-mono">No compliance frameworks found.</p>'}
      </div>

      <!-- Slide-over for control detail -->
      <div id="compliance-slide-over" class="fixed top-0 right-0 w-full md:w-1/3 h-full bg-zinc-950 border-l border-emerald-900/20 transform translate-x-full transition-transform duration-300 z-50 overflow-y-auto">
        <div id="slide-content"><div class="p-6"><h3 class="text-lg font-bold text-white font-mono">Loading...</h3></div></div>
      </div>
    `;
  },

  openControlDetail(frameworkId, controlId) {
    const fw = this._frameworks.find(f => f.id === frameworkId);
    const ctrl = fw?.controls?.find(c => c.id === controlId);
    if (!ctrl) return;

    this._activeControl = { frameworkId, controlId, ...ctrl };

    const detailEl = document.getElementById('compliance-slide-over');
    if (!detailEl) return;
    detailEl.classList.remove('translate-x-full');

    detailEl.querySelector('#slide-content').innerHTML = `
      <div class="p-6 overflow-y-auto">
        <div class="flex justify-between items-start mb-6">
          <h2 class="text-xl font-black text-white font-mono uppercase">${ctrl.title || ctrl.name}</h2>
          <button onclick="ComplianceEnginePage.closeControlDetail()" class="text-zinc-500 hover:text-white">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-6">
          <div>
            <p class="text-xs text-zinc-500 font-mono uppercase mb-2">Control ID</p>
            <p class="text-sm text-zinc-300 font-mono">${ctrl.id}</p>
          </div>
          <div>
            <p class="text-xs text-zinc-500 font-mono uppercase mb-2">Description</p>
            <p class="text-sm text-zinc-300">${ctrl.description || 'No description available.'}</p>
          </div>
          <div>
            <p class="text-xs text-zinc-500 font-mono uppercase mb-2">Gap Analysis</p>
            <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p class="text-sm text-zinc-300 mb-2">${ctrl.gap_analysis || 'No gap analysis available.'}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="px-2 py-1 text-xs font-black uppercase rounded ${ctrl.status === 'compliant' ? 'bg-emerald-900/30 text-emerald-500' : 'bg-red-900/30 text-red-500'}">
                  ${ctrl.status || 'pending'}
                </span>
              </div>
            </div>
          </div>
          <div>
            <p class="text-xs text-zinc-500 font-mono uppercase mb-2">Evidence Upload</p>
            <div class="border-2 border-dashed border-emerald-900/40 rounded-lg p-6 text-center bg-zinc-950 cursor-pointer hover:border-emerald-500/50 transition-colors">
              <i data-lucide="upload" class="w-8 h-8 text-emerald-500 mx-auto mb-2"></i>
              <p class="text-xs text-zinc-500 font-mono">Click to upload evidence document</p>
              <input type="file" id="evidence-upload" accept=".pdf,.doc,.docx,.json" class="hidden">
            </div>
          </div>
        </div>
      </div>
    `;

    const uploadZone = detailEl.querySelector('.border-dashed');
    if (uploadZone) {
      uploadZone.onclick = () => document.getElementById('evidence-upload')?.click();
    }
    const fileInput = detailEl.querySelector('#evidence-upload');
    if (fileInput) {
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const formData = new FormData();
          formData.append('evidence', file);
          formData.append('framework_id', frameworkId);
          formData.append('control_id', controlId);
          await ApiClient._fetch('/compliance/evidence/', { method: 'POST', body: formData, isFormData: true });
          if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast('Evidence uploaded successfully', 'success');
          }
        } catch (err) {
          if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast(err.message, 'error');
          }
        }
      };
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  closeControlDetail() {
    const el = document.getElementById('compliance-slide-over');
    if (el) el.classList.add('translate-x-full');
    this._activeControl = null;
  },

  async generateEvidencePack() {
    try {
      const stages = [
        'Assembling compliance artifacts...',
        'Verifying evidence chains...',
        'Generating ZK proof...',
        'Packaging evidence pack...'
      ];
      let currentStage = 0;

      const progressEl = document.getElementById('page-content');
      progressEl.innerHTML = `
        <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-8">
          <h3 class="text-lg font-bold text-white font-mono mb-4">Generating Evidence Pack</h3>
          <div class="space-y-3">
            ${stages.map((s, i) => `
              <div class="flex items-center gap-3">
                <div id="stage-${i}" class="w-4 h-4 rounded-full bg-zinc-700 flex-shrink-0"></div>
                <span id="stage-text-${i}" class="text-sm text-zinc-400 font-mono">${s}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      for (let i = 0; i < stages.length; i++) {
        currentStage = i;
        const dot = document.getElementById(`stage-${i}`);
        const text = document.getElementById(`stage-text-${i}`);
        if (dot) dot.className = 'w-4 h-4 rounded-full bg-emerald-500 animate-pulse flex-shrink-0';
        if (text) text.className = 'text-sm text-emerald-500 font-mono animate-pulse';

        await new Promise(r => setTimeout(r, 500));
      }

      const result = await ApiClient.generateEvidencePack({ frameworks: this._frameworks.map(f => f.id) });

      if (result.download_url || result.blob) {
        const link = document.createElement('a');
        link.href = result.download_url || result.blob;
        link.download = result.filename || 'evidence-pack.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast('Evidence pack downloaded', 'success');
        }
      } else {
        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast('Evidence pack generated', 'success');
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Evidence pack generation failed:', e);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
      document.getElementById('page-content').innerHTML = this._template(this._frameworks);
    }
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  destroy() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    if (this._abortController) this._abortController.abort();
    this._frameworks = [];
    this._activeControl = null;
  }
};
