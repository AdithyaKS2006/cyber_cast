const CorrelationPage = {
  _abortController: null,
  _chartContainer: null,
  _d3Instance: null,
  _selectedCampaign: null,
  _threshold: 0.7,
  _graphData: [],

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      await this._loadD3();
      const data = await ApiClient.getCampaigns({}, { signal: this._abortController.signal });
      this._graphData = Array.isArray(data) ? data : (data.results || []);
      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
      this._initForceGraph();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('CorrelationPage render failed:', e);
      document.getElementById('page-content').innerHTML = this._error(e.message);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  async _loadD3() {
    if (typeof d3 !== 'undefined') return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://d3js.org/d3.v7.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  _skeleton() {
    return typeof Components !== 'undefined' && Components.skeleton
      ? Components.skeleton(5)
      : '<div class="animate-pulse space-y-4">' + Array(5).fill('<div class="h-12 bg-zinc-900/50 rounded-lg w-full"></div>').join('') + '</div>';
  },

  _error(message) {
    return `<div class="text-red-500 font-mono p-4">Error loading correlation engine: ${message}</div>`;
  },

  _template() {
    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">Correlation Engine</h1>
          <p class="text-zinc-500 font-mono text-sm">D3 force-directed graph of campaign relationships.</p>
        </div>
        <button onclick="CorrelationPage.createCampaign()" class="bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase px-4 py-2 rounded-lg font-mono text-sm transition-colors">
          Create Campaign
        </button>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <div class="col-span-8">
          <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4">
            <div id="correlation-graph" class="w-full h-[500px] relative">
              <svg width="100%" height="100%"></svg>
              <div class="absolute bottom-4 left-4 text-xs text-zinc-500 font-mono">
                Node types: ● IP (circle)  ■ Domain (square)  ◊ Hash (diamond)  ★ Campaign (star)
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-4">
          <div class="space-y-4">
            <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4">
              <h3 class="text-sm font-black text-emerald-500 font-mono uppercase mb-3">Confidence Filter</h3>
              <input type="range" id="confidence-threshold" min="0" max="100" value="70" class="w-full">
              <div class="flex justify-between text-xs text-zinc-600 font-mono mt-1">
                <span>0.0</span>
                <span id="threshold-value">0.70</span>
                <span>1.0</span>
              </div>
              <div class="mt-4">
                <p class="text-xs text-zinc-500 font-mono uppercase mb-2">Selected Nodes</p>
                <div id="node-list" class="space-y-1">
                  <p class="text-xs text-zinc-600 font-mono">Drag to explore relationships</p>
                </div>
              </div>
            </div>

            <div id="campaign-detail-panel" class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4 hidden">
              <h3 class="text-sm font-black text-emerald-500 font-mono uppercase mb-3">Campaign Details</h3>
              <div id="campaign-detail-content" class="space-y-3"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _initForceGraph() {
    const svg = d3.select('#correlation-graph svg');
    const width = 600;
    const height = 500;

    svg.attr('width', width).attr('height', height);

    const nodes = [];
    const links = [];
    const nodeTypes = { campaign: 'star', ioc: 'circle', domain: 'square', hash: 'diamond' };

    this._graphData.forEach(campaign => {
      nodes.push({ id: campaign.id, name: campaign.name, type: 'campaign', group: 'campaign' });
      (campaign.related_iocs || []).slice(0, 8).forEach(ioc => {
        nodes.push({ id: ioc.id || ioc.value, name: ioc.value, type: 'ioc', group: ioc.severity || 'low' });
        links.push({ source: campaign.id, target: ioc.id || ioc.value, value: ioc.confidence || 0.8 });
      });
    });

    const filteredLinks = links.filter(l => l.value >= this._threshold);

    const link = svg.append('g')
      .selectAll('line')
      .data(filteredLinks)
      .enter().append('line')
      .attr('stroke', '#10b981')
      .attr('stroke-width', d => Math.max(1, d.value * 3))
      .attr('opacity', 0.4);

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    const shapes = {
      circle: (d) => d3.symbol().type(d3.symbolCircle).size(200)(),
      square: (d) => d3.symbol().type(d3.symbolSquare).size(200)(),
      diamond: (d) => d3.symbol().type(d3.symbolDiamond).size(200)(),
      star: (d) => d3.symbol().type(d3.symbolStar).size(300)(),
    };

    node.append('path')
      .attr('d', d => shapes[d.type](d))
      .attr('fill', d => d.type === 'campaign' ? '#10b981' : d.type === 'ioc' ? '#ef4444' : '#f59e0b')
      .attr('stroke', '#18181b')
      .attr('stroke-width', 2);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(filteredLinks).id(d => d.id).distance(80).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    node.append('title').text(d => d.name);

    node.on('click', (event, d) => {
      if (d.type === 'campaign') {
        this._selectCampaign(d.id);
      }
    });

    d3.selectAll('#node-list').html('');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event) { simulation.alphaTarget(0.3).restart(); }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event) { simulation.alphaTarget(0); }
  },

  _selectCampaign(campaignId) {
    const campaign = this._graphData.find(c => c.id === campaignId || c.name === campaignId);
    if (!campaign) return;
    this._selectedCampaign = campaign;

    const detailPanel = document.getElementById('campaign-detail-panel');
    const content = document.getElementById('campaign-detail-content');
    if (detailPanel && content) {
      detailPanel.classList.remove('hidden');
      content.innerHTML = `
        <p class="text-xs text-zinc-500 font-mono uppercase">ID</p>
        <p class="text-sm text-white font-mono mb-2">${campaign.id}</p>
        <p class="text-xs text-zinc-500 font-mono uppercase">Confidence</p>
        <p class="text-sm text-emerald-500 font-mono mb-2">${(campaign.confidence * 100).toFixed(1)}%</p>
        <p class="text-xs text-zinc-500 font-mono uppercase">Related IoCs</p>
        <p class="text-sm text-zinc-300 font-mono">${(campaign.related_iocs || []).length} indicators linked</p>
        <button onclick="navigate('threat-feed')" class="mt-3 w-full bg-zinc-900 hover:bg-zinc-800 text-emerald-500 border border-emerald-900/30 py-2 rounded font-mono text-xs transition-colors">
          View Threats
        </button>
      `;
    }
  },

  async createCampaign() {
    const name = prompt('Enter campaign name:', 'New Campaign');
    if (!name) return;

    try {
      const result = await ApiClient.createCampaign({ name, description: 'Generated via Correlation Engine' });
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Campaign created', 'success');
      }
      this.render();
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
    const threshold = document.getElementById('confidence-threshold');
    if (threshold) {
      threshold.addEventListener('input', (e) => {
        this._threshold = parseInt(e.target.value) / 100;
        document.getElementById('threshold-value').textContent = this._threshold.toFixed(2);
        this._initForceGraph();
      });
    }
  },

  destroy() {
    if (this._abortController) this._abortController.abort();
    this._graphData = [];
    this._selectedCampaign = null;
  }
};
