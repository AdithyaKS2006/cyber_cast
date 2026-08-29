const ThreatMapPage = {
  _pollingInterval: null,
  _timeInterval: null,
  _abortController: null,
  _chartInstance: null,
  _mapData: [],
  _isPlaying: false,
  _currentTimeIndex: 0,
  _layers: { origins: true, targets: true, arcs: true },

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      const data = await ApiClient._fetch('/analytics/geography/', { signal: this._abortController.signal });
      this._mapData = Array.isArray(data) ? data : (data.results || []);
      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
      this._drawMap();
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
    return `<div class="text-red-500 font-mono p-4">Error loading threat map: ${message}</div>`;
  },

  _template() {
    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">Threat Intelligence Map</h1>
          <p class="text-zinc-500 font-mono text-sm">Geographic distribution of threat origins and targets.</p>
        </div>
        <div class="flex gap-2 items-center">
          <div class="flex gap-1 items-center">
            <button onclick="ThreatMapPage.toggleLayer('origins')" class="px-2 py-1 text-xs font-mono rounded ${this._layers.origins ? 'bg-emerald-600 text-black' : 'bg-zinc-800 text-zinc-500'}">Origins</button>
            <button onclick="ThreatMapPage.toggleLayer('targets')" class="px-2 py-1 text-xs font-mono rounded ${this._layers.targets ? 'bg-emerald-600 text-black' : 'bg-zinc-800 text-zinc-500'}">Targets</button>
            <button onclick="ThreatMapPage.toggleLayer('arcs')" class="px-2 py-1 text-xs font-mono rounded ${this._layers.arcs ? 'bg-emerald-600 text-black' : 'bg-zinc-800 text-zinc-500'}">Arcs</button>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="ThreatMapPage.togglePlay()" class="p-1 bg-zinc-900 border border-emerald-900/30 rounded text-emerald-500 hover:bg-emerald-900/20 transition-colors">
              <i data-lucide="${this._isPlaying ? 'pause' : 'play'}" class="w-4 h-4"></i>
            </button>
            <input type="range" id="time-scrub" min="0" max="23" value="0" class="w-32">
            <span class="text-xs font-mono text-zinc-500" id="time-label">00:00</span>
          </div>
        </div>
      </div>

      <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4">
        <div id="threat-map-svg" class="w-full h-[500px] relative">
          <svg width="100%" height="100%" viewBox="0 0 800 500" class="w-full h-full">
            <!-- World map outline (simplified) -->
            <rect x="0" y="0" width="800" height="500" fill="#0a0a0a" stroke="#10b981" stroke-width="1" />
            <text x="400" y="250" text-anchor="middle" class="fill-zinc-600 font-mono text-xs" font-family="JetBrains Mono">Interactive Threat Map</text>
          </svg>
        </div>
      </div>

      <!-- Detail Slide-over -->
      <div id="threat-map-detail" class="fixed top-0 right-0 w-full md:w-1/3 h-full bg-zinc-950 border-l border-emerald-900/20 transform translate-x-full transition-transform duration-300 z-50 overflow-y-auto hidden md:block">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold text-white font-mono">Threat Details</h3>
            <button onclick="ThreatMapPage.closeDetail()" class="text-zinc-500 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <div id="detail-content"></div>
        </div>
      </div>
    `;
  },

  _drawMap() {
    const svg = document.getElementById('threat-map-svg')?.querySelector('svg');
    if (!svg) return;

    svg.innerHTML = '<rect x="0" y="0" width="800" height="500" fill="#0a0a0a" stroke="#10b981" stroke-width="1" />';

    const dotCoords = {
      'US': { x: 120, y: 180 }, 'GB': { x: 370, y: 140 }, 'DE': { x: 390, y: 150 },
      'FR': { x: 380, y: 155 }, 'NL': { x: 395, y: 145 }, 'RU': { x: 500, y: 180 },
      'CN': { x: 600, y: 220 }, 'JP': { x: 640, y: 190 }, 'KR': { x: 620, y: 210 },
      'BR': { x: 180, y: 340 }, 'IN': { x: 560, y: 280 }, 'CA': { x: 110, y: 150 },
      'AU': { x: 700, y: 380 }, 'SG': { x: 580, y: 300 }, 'UA': { x: 470, y: 170 },
    };

    if (this._layers.origins) {
      this._mapData.forEach(d => {
        const coords = dotCoords[d.country_code];
        if (!coords) return;
        const size = Math.max(4, Math.min(20, (d.count || 10) / 10));
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', coords.x);
        circle.setAttribute('cy', coords.y);
        circle.setAttribute('r', size);
        circle.setAttribute('fill', '#ef4444');
        circle.setAttribute('stroke', '#18181b');
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('class', 'threat-dot cursor-pointer hover:fill-red-300 transition-all');
        circle.setAttribute('data-country', d.country_code);
        circle.setAttribute('data-count', d.count || 0);
        svg.appendChild(circle);

        circle.addEventListener('click', () => this._showDotDetail(d, coords));
      });
    }

    if (this._layers.arcs) {
      const originCoords = dotCoords['US'] || { x: 120, y: 180 };
      this._mapData.slice(0, 5).forEach(d => {
        const target = dotCoords[d.country_code];
        if (!target) return;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const midX = (originCoords.x + target.x) / 2;
        const midY = (originCoords.y + target.y) / 2 - 30;
        path.setAttribute('d', `M${originCoords.x},${originCoords.y} Q${midX},${midY} ${target.x},${target.y}`);
        path.setAttribute('stroke', '#10b981');
        path.setAttribute('stroke-width', '1');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '4,4');
        path.setAttribute('opacity', '0.3');
        svg.appendChild(path);
      });
    }

    if (this._layers.targets) {
      const targetCoords = dotCoords['GB'] || { x: 370, y: 140 };
      const targetCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      targetCircle.setAttribute('cx', targetCoords.x);
      targetCircle.setAttribute('cy', targetCoords.y);
      targetCircle.setAttribute('r', 8);
      targetCircle.setAttribute('fill', '#3b82f6');
      targetCircle.setAttribute('stroke', '#18181b');
      targetCircle.setAttribute('stroke-width', '2');
      targetCircle.setAttribute('opacity', this._layers.targets ? '0.6' : '0.2');
      svg.appendChild(targetCircle);
    }
  },

  _showDotDetail(data, coords) {
    const detailEl = document.getElementById('threat-map-detail');
    if (!detailEl) return;
    detailEl.classList.remove('translate-x-full');
    detailEl.querySelector('#detail-content').innerHTML = `
      <h3 class="text-xl font-bold text-white font-mono mb-4">${data.country_name || data.country_code}</h3>
      <div class="space-y-4">
        <div>
          <p class="text-xs text-zinc-500 font-mono uppercase">IoC Count</p>
          <p class="text-2xl font-bold text-emerald-500 font-mono">(${data.count || 0})</p>
        </div>
        <div>
          <p class="text-xs text-zinc-500 font-mono uppercase">Severity Breakdown</p>
          <div class="grid grid-cols-2 gap-2 mt-2">
            ${Object.entries(data.severity_breakdown || {}).map(([k, v]) => `
              <div class="flex justify-between"><span class="text-zinc-400">${k}</span><span class="text-white">${v}</span></div>
            `).join('')}
          </div>
        </div>
        <button onclick="navigate('threat-feed'); ThreatMapPage.closeDetail();"
                class="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-2 rounded-lg font-mono text-sm transition-colors">
          View in Threat Feed
        </button>
      </div>
    `;
  },

  closeDetail() {
    const el = document.getElementById('threat-map-detail');
    if (el) el.classList.add('translate-x-full');
  },

  toggleLayer(layer) {
    this._layers[layer] = !this._layers[layer];
    this._drawMap();
  },

  togglePlay() {
    this._isPlaying = !this._isPlaying;
    if (this._isPlaying) {
      this._timeInterval = setInterval(() => {
        this._currentTimeIndex = (this._currentTimeIndex + 1) % 24;
        const hour = String(this._currentTimeIndex).padStart(2, '0');
        const label = document.getElementById('time-label');
        if (label) label.textContent = `${hour}:00`;
        const scrub = document.getElementById('time-scrub');
        if (scrub) scrub.value = this._currentTimeIndex;
      }, 1000);
    } else {
      if (this._timeInterval) clearInterval(this._timeInterval);
    }
    const iconEl = document.querySelector('button[onclick="ThreatMapPage.togglePlay()"] i[data-lucide]');
    if (iconEl) {
      iconEl.setAttribute('data-lucide', this._isPlaying ? 'pause' : 'play');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    const scrub = document.getElementById('time-scrub');
    if (scrub) {
      scrub.addEventListener('input', (e) => {
        this._currentTimeIndex = parseInt(e.target.value);
        const hour = String(this._currentTimeIndex).padStart(2, '0');
        const label = document.getElementById('time-label');
        if (label) label.textContent = `${hour}:00`;
      });
    }
  },

  destroy() {
    if (this._timeInterval) clearInterval(this._timeInterval);
    if (this._pollingInterval) clearInterval(this._pollingInterval);
    if (this._abortController) this._abortController.abort();
    this._mapData = [];
    this._isPlaying = false;
  }
};
