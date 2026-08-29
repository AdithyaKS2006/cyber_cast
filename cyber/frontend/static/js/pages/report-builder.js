const ReportBuilderPage = {
  _abortController: null,
  _canvasWidgets: [],

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      document.getElementById('page-content').innerHTML = this._template();
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
      ? Components.skeleton(6)
      : '<div class="animate-pulse space-y-4">' + Array(6).fill('<div class="h-12 bg-zinc-900/50 rounded-lg w-full"></div>').join('') + '</div>';
  },

  _error(message) {
    return `<div class="text-red-500 font-mono p-4">Error loading report builder: ${message}</div>`;
  },

  _template() {
    const widgets = [
      { id: 'threat-feed', label: 'Threat Feed', icon: 'activity' },
      { id: 'severity-distribution', label: 'Severity Distribution', icon: 'pie-chart' },
      { id: 'attack-class', label: 'Attack Classes', icon: 'target' },
      { id: 'timeline', label: 'Threat Timeline', icon: 'bar-chart-3' },
      { id: 'top-actors', label: 'Top Threat Actors', icon: 'globe' },
      { id: 'mitre', label: 'MITRE Heatmap', icon: 'grid-3x3' },
      { id: 'geography', label: 'Geography Map', icon: 'map' },
      { id: 'analyst-performance', label: 'Analyst Performance', icon: 'users' },
    ];

    const templates = [
      { name: 'Executive Brief', widgets: ['top-actors', 'threat-feed', 'severity-distribution'] },
      { name: 'Incident Report', widgets: ['timeline', 'attack-class', 'threat-feed'] },
      { name: 'Threat Intel Summary', widgets: ['geography', 'mitre', 'top-actors'] },
    ];

    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">Report Builder</h1>
          <p class="text-zinc-500 font-mono text-sm">Drag widgets onto the canvas to compose reports.</p>
        </div>
        <div class="flex gap-2">
          <button onclick="ReportBuilderPage.applyTemplate('executive')" class="bg-zinc-900 hover:bg-zinc-800 text-emerald-500 border border-emerald-900/30 px-4 py-2 rounded-lg font-mono text-sm transition-colors">
            Apply Template
          </button>
          <button onclick="ReportBuilderPage.saveReport()" class="bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase px-4 py-2 rounded-lg font-mono text-sm transition-colors">
            Save
          </button>
          <button onclick="ReportBuilderPage.exportReport()" class="bg-zinc-900 hover:bg-zinc-800 text-emerald-500 border border-emerald-900/30 px-4 py-2 rounded-lg font-mono text-sm transition-colors">
            Export
          </button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- Widget Library -->
        <div class="col-span-3">
          <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4">
            <h3 class="text-sm font-black text-emerald-500 font-mono uppercase mb-4">Widget Library</h3>
            <div class="space-y-2">
              ${widgets.map(w => `
                <div draggable="true" ondragstart="ReportBuilderPage.dragStart('${w.id}', '${w.label}')"
                     class="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 cursor-grab hover:border-emerald-500/30 transition-colors group">
                  <div class="flex items-center gap-2">
                    <i data-lucide="${w.icon}" class="w-4 h-4 text-emerald-500"></i>
                    <span class="text-xs font-mono text-zinc-300 group-hover:text-emerald-500">${w.label}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="mt-4 space-y-2">
            <h3 class="text-xs font-black text-emerald-900 uppercase">Templates</h3>
            ${templates.map(t => `
              <button onclick="ReportBuilderPage.applyTemplate('${t.name.toLowerCase().replace(' ', '-')}')"
                      class="w-full text-left p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg hover:border-emerald-500/30 transition-colors font-mono text-xs text-zinc-300">
                ${t.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Canvas -->
        <div class="col-span-9">
          <div id="report-canvas" ondragover="event.preventDefault(); event.dataTransfer.dropEffect='copy';"
               ondrop="ReportBuilderPage.dropWidget(event)"
               class="min-h-[500px] bg-zinc-950 border-2 border-dashed border-emerald-900/30 rounded-xl p-6 transition-colors hover:border-emerald-500/50">
            <div id="canvas-content" class="grid grid-cols-2 gap-4">
              <p class="text-xs text-zinc-600 font-mono uppercase">Drag widgets here to build your report layout</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  dragStart(widgetId, label) {
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    const dt = event.dataTransfer;
    dt.setData('text/plain', JSON.stringify({ id: widgetId, label: label }));
  },

  dropWidget(e) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const canvas = document.getElementById('canvas-content');
    if (!canvas) return;

    const is_empty = canvas.children.length === 1 && canvas.children[0].tagName === 'P';
    if (is_empty) canvas.innerHTML = '';

    this._canvasWidgets.push(data);

    const widgetCard = document.createElement('div');
    widgetCard.className = 'bg-zinc-900 border border-emerald-900/20 rounded-xl p-4 relative group';
    widgetCard.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <h4 class="text-sm font-bold text-white font-mono">${data.label}</h4>
        <button onclick="this.parentElement.parentElement.remove(); ReportBuilderPage._canvasWidgets = ReportBuilderPage._canvasWidgets.filter(w => w.id !== '${data.id}');"
                class="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 transition-opacity">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div class="bg-zinc-950 border border-zinc-800 rounded-lg h-40 flex items-center justify-center">
        <span class="text-xs text-zinc-600 font-mono uppercase">${data.label} preview</span>
      </div>
    `;
    canvas.appendChild(widgetCard);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  applyTemplate(templateId) {
    const templates = {
      'executive': ['top-actors', 'threat-feed', 'severity-distribution'],
      'incident report': ['timeline', 'attack-class', 'threat-feed'],
      'threat intel summary': ['geography', 'mitre', 'top-actors'],
    };
    const widgetIds = templates[templateId] || [];
    const canvas = document.getElementById('canvas-content');
    if (!canvas) return;

    canvas.innerHTML = '';
    this._canvasWidgets = [];

    widgetIds.forEach(id => {
      const label = {
        'top-actors': 'Top Threat Actors',
        'threat-feed': 'Threat Feed',
        'severity-distribution': 'Severity Distribution',
        'timeline': 'Threat Timeline',
        'attack-class': 'Attack Classes',
        'geography': 'Geography Map',
        'mitre': 'MITRE Heatmap',
      }[id] || id;

      const widget = { id, label };
      this._canvasWidgets.push(widget);

      const widgetCard = document.createElement('div');
      widgetCard.className = 'bg-zinc-900 border border-emerald-900/20 rounded-xl p-4';
      widgetCard.innerHTML = `
        <div class="flex justify-between items-center mb-2">
          <h4 class="text-sm font-bold text-white font-mono">${label}</h4>
          <button onclick="this.parentElement.parentElement.remove()" class="text-zinc-500 hover:text-red-500">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="bg-zinc-950 border border-zinc-800 rounded-lg h-40 flex items-center justify-center">
          <span class="text-xs text-zinc-600 font-mono uppercase">${label} preview</span>
        </div>
      `;
      canvas.appendChild(widgetCard);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async saveReport() {
    if (!this._canvasWidgets.length) {
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Add widgets to the canvas before saving', 'error');
      }
      return;
    }

    const name = prompt('Enter report name:', 'Untitled Report');
    if (!name) return;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Report name';
    nameInput.className = 'w-full bg-zinc-900 border border-emerald-900/30 rounded p-2 text-white font-mono text-sm mb-4';
    nameInput.value = name;

    try {
      await ApiClient.saveReportConfig({
        name: name,
        widgets: this._canvasWidgets,
      });
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Report saved successfully', 'success');
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  async exportReport() {
    if (!this._canvasWidgets.length) {
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Add widgets to the canvas before exporting', 'error');
      }
      return;
    }

    try {
      const result = await ApiClient._fetch('/reports/generate/', {
        method: 'POST',
        body: { widgets: this._canvasWidgets }
      });

      if (result.download_url) {
        const link = document.createElement('a');
        link.href = result.download_url;
        link.download = result.filename || 'report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast('Report exported', 'success');
        }
      }
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
  },

  destroy() {
    if (this._abortController) this._abortController.abort();
    this._canvasWidgets = [];
  }
};
