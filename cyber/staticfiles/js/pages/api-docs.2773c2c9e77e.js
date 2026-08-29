const ApiDocsPage = {
  _selectedEndpoint: null,
  _activeLang: 'javascript',

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    try {
      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
    } catch (e) {
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
    return `<div class="text-red-500 font-mono p-4">Error loading API docs: ${message}</div>`;
  },

  _template() {
    const endpoints = [
      { group: 'Authentication', items: [
        { method: 'POST', path: '/api/v1/auth/login/', desc: 'Obtain JWT tokens (sets httpOnly cookies)' },
        { method: 'POST', path: '/api/v1/auth/logout/', desc: 'Clear session cookies' },
        { method: 'POST', path: '/api/v1/auth/refresh/', desc: 'Refresh access token via cookie' },
        { method: 'POST', path: '/api/v1/auth/register/', desc: 'Register new user (restricted)' },
      ]},
      { group: 'Threats', items: [
        { method: 'GET', path: '/api/v1/threats/', desc: 'List threat indicators (paginated)' },
        { method: 'POST', path: '/api/v1/threats/', desc: 'Create a new threat indicator' },
        { method: 'GET', path: '/api/v1/threats/{id}/', desc: 'Retrieve threat detail' },
        { method: 'PATCH', path: '/api/v1/threats/{id}/', desc: 'Update threat indicator' },
        { method: 'POST', path: '/api/v1/threats/{id}/submit-to-blockchain/', desc: 'Anchor to blockchain' },
        { method: 'POST', path: '/api/v1/threats/{id}/mark-false-positive/', desc: 'Mark as false positive' },
      ]},
      { group: 'Analysis', items: [
        { method: 'POST', path: '/api/v1/analyze/packet/', desc: 'Upload PCAP for analysis' },
        { method: 'GET', path: '/api/v1/analyze/packet/{id}/', desc: 'Get analysis status' },
        { method: 'POST', path: '/api/v1/ml/classify/', desc: 'Classify a single IoC' },
      ]},
      { group: 'Sandbox', items: [
        { method: 'POST', path: '/api/v1/sandbox/submit/', desc: 'Submit payload for detonation' },
        { method: 'GET', path: '/api/v1/sandbox/{id}/', desc: 'Get sandbox job status' },
        { method: 'POST', path: '/api/v1/sandbox/classify/', desc: 'Classify file hash' },
      ]},
      { group: 'Blockchain', items: [
        { method: 'GET', path: '/api/v1/blockchain/transactions/', desc: 'List blockchain transactions' },
        { method: 'POST', path: '/api/v1/blockchain/evidence/anchor/', desc: 'Anchor evidence to chain' },
        { method: 'POST', path: '/api/v1/blockchain/zk/generate/', desc: 'Generate ZK proof' },
        { method: 'POST', path: '/api/v1/blockchain/zk/verify/', desc: 'Verify ZK proof' },
      ]},
      { group: 'Guru', items: [
        { method: 'POST', path: '/api/v1/guru/query/', desc: 'Query Cyber Guru AI' },
        { method: 'GET', path: '/api/v1/guru/sessions/', desc: 'List chat sessions' },
      ]},
      { group: 'Analytics', items: [
        { method: 'GET', path: '/api/v1/analytics/dashboard/', desc: 'Dashboard KPIs and timeline' },
        { method: 'GET', path: '/api/v1/analytics/geography/', desc: 'Threat geography data' },
        { method: 'GET', path: '/api/v1/analytics/mitre-heatmap/', desc: 'MITRE ATT&CK heatmap' },
      ]},
      { group: 'Compliance', items: [
        { method: 'GET', path: '/api/v1/compliance/frameworks/', desc: 'List compliance frameworks' },
        { method: 'POST', path: '/api/v1/compliance/evidence-pack/', desc: 'Generate evidence pack' },
      ]},
      { group: 'Reports', items: [
        { method: 'POST', path: '/api/v1/reports/generate/', desc: 'Generate a report' },
        { method: 'POST', path: '/api/v1/reports/builder/save/', desc: 'Save report builder config' },
      ]},
      { group: 'Network', items: [
        { method: 'GET', path: '/api/v1/network/peers/', desc: 'List connected peers' },
        { method: 'GET', path: '/api/v1/network/inbox/', desc: 'List inbox items' },
      ]},
      { group: 'Shifts', items: [
        { method: 'GET', path: '/api/v1/shifts/current/', desc: 'Current shift info' },
        { method: 'POST', path: '/api/v1/shifts/journal/', desc: 'Add journal entry' },
      ]},
      { group: 'Admin', items: [
        { method: 'GET', path: '/api/v1/admin/health/', desc: 'System health check' },
        { method: 'GET', path: '/api/v1/users/', desc: 'List users (admin only)' },
        { method: 'GET', path: '/api/v1/users/me/', desc: 'Current user profile' },
        { method: 'GET', path: '/api/v1/users/achievements/', desc: 'User achievements' },
        { method: 'GET', path: '/api/v1/users/certifications/', desc: 'User certifications' },
      ]},
    ];

    const sidebarHTML = endpoints.map(group => `
      <div class="mb-4">
        <h3 class="text-xs font-black text-emerald-950 uppercase tracking-wider mb-2">${group.group}</h3>
        ${group.items.map(ep => `
          <button onclick="ApiDocsPage.selectEndpoint(${JSON.stringify({method: ep.method, path: ep.path, desc: ep.desc}).replace(/"/g, '&quot;')})"
                  class="w-full text-left p-2 rounded-lg hover:bg-zinc-900 font-mono text-xs transition-colors group">
            <span class="inline-block w-16 text-left font-black ${ep.method === 'GET' ? 'text-emerald-500' : ep.method === 'POST' ? 'text-blue-500' : ep.method === 'PATCH' ? 'text-yellow-500' : 'text-red-500'}">${ep.method}</span>
            <span class="text-zinc-400 group-hover:text-emerald-500 break-all">${ep.path}</span>
          </button>
        `).join('')}
      </div>
    `).join('');

    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">API Documentation</h1>
        <p class="text-zinc-500 font-mono text-sm">REST API endpoint reference — all requests use httpOnly cookies for auth.</p>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <div class="col-span-4 overflow-y-auto max-h-[600px]">
          <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4">
            <div class="search-box mb-3">
              <input type="text" id="api-search" placeholder="Search endpoints..." class="w-full bg-black border border-emerald-900/30 rounded p-2 text-emerald-500 font-mono text-xs outline-none focus:border-emerald-500">
            </div>
            ${sidebarHTML}
          </div>
        </div>

        <div class="col-span-8">
          <div id="endpoint-detail" class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-6">
            <div class="text-center py-12">
              <i data-lucide="code" class="w-12 h-12 text-zinc-600 mx-auto mb-4"></i>
              <p class="text-zinc-600 font-mono text-sm">Select an endpoint to view details</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  selectEndpoint(ep) {
    this._selectedEndpoint = ep;
    const detailEl = document.getElementById('endpoint-detail');
    if (!detailEl) return;

    const methodColors = {
      GET: 'bg-emerald-500',
      POST: 'bg-blue-500',
      PATCH: 'bg-yellow-500',
      DELETE: 'bg-red-500',
      PUT: 'bg-purple-500',
    };

    const examples = {
      javascript: `const res = await fetch('${ep.path}', {
  method: '${ep.method}',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
  body: ${ep.method !== 'GET' ? JSON.stringify({ key: 'value' }) : 'undefined'}
});
const data = await res.json();`,
      python: `import requests\n\nresponse = requests.${ep.method.toLowerCase()}(
    '${window.location.origin}${ep.path}',
    cookies={'sessionid': 'your-session-cookie'},
    headers={'X-CSRFToken': csrf_token},
    json=${ep.method !== 'GET' ? '{ "key": "value" }' : 'None'}
)\nprint(response.json())`,
      curl: `curl -X ${ep.method} ${window.location.origin}${ep.path} \`
  -H "Content-Type: application/json" \`
  -H "X-CSRFToken: $CSRF_TOKEN" \`
  -b "cookies.txt" \`
  ${ep.method !== 'GET' ? '-d \'' + JSON.stringify({ key: 'value' }) + '\'' : ''}`,
    };

    detailEl.innerHTML = `
      <div class="flex items-center gap-3 mb-6">
        <span class="px-3 py-1 rounded text-black font-black text-xs ${methodColors[ep.method] || 'bg-zinc-500'}">${ep.method}</span>
        <code class="text-emerald-400 font-mono text-sm bg-black px-3 py-1 rounded">${ep.path}</code>
      </div>
      <p class="text-sm text-zinc-400 font-mono mb-6">${ep.desc || 'No description available.'}</p>

      <div class="mb-4">
        <div class="flex gap-2 border-b border-emerald-900/20 mb-3">
          <button onclick="ApiDocsPage.setLang('javascript')" class="px-3 py-1 text-xs font-mono ${this._activeLang === 'javascript' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-zinc-600'}">JavaScript</button>
          <button onclick="ApiDocsPage.setLang('python')" class="px-3 py-1 text-xs font-mono ${this._activeLang === 'python' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-zinc-600'}">Python</button>
          <button onclick="ApiDocsPage.setLang('curl')" class="px-3 py-1 text-xs font-mono ${this._activeLang === 'curl' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-zinc-600'}">cURL</button>
        </div>
        <div class="relative">
          <pre class="bg-black border border-zinc-800 rounded-lg p-4 text-xs font-mono text-zinc-300 overflow-x-auto"><code>${this._escapeHtml(examples[this._activeLang])}</code></pre>
          <button onclick="ApiDocsPage.copyCode()" class="absolute top-2 right-2 p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 rounded transition-colors">
            <i data-lucide="copy" class="w-3 h-3"></i>
          </button>
        </div>
      </div>

      <div class="flex gap-3">
        <button onclick="ApiDocsPage.downloadPythonSDK()" class="bg-zinc-900 hover:bg-zinc-800 text-emerald-500 border border-emerald-900/30 px-4 py-2 rounded font-mono text-xs transition-colors">
          Download Python SDK
        </button>
        <button onclick="ApiDocsPage.downloadJsSDK()" class="bg-zinc-900 hover:bg-zinc-800 text-emerald-500 border border-emerald-900/30 px-4 py-2 rounded font-mono text-xs transition-colors">
          Download JS SDK
        </button>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  setLang(lang) {
    this._activeLang = lang;
    if (this._selectedEndpoint) this.selectEndpoint(this._selectedEndpoint);
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  copyCode() {
    const code = document.querySelector('#endpoint-detail pre code');
    if (!code) return;
    navigator.clipboard.writeText(code.textContent).then(() => {
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Copied to clipboard', 'success');
      }
    });
  },

  downloadPythonSDK() {
    if (typeof Components !== 'undefined' && Components.showToast) {
      Components.showToast('Python SDK download (mock): cybersandbox-sdk-1.0.0-py3-none-any.whl', 'success');
    }
  },

  downloadJsSDK() {
    if (typeof Components !== 'undefined' && Components.showToast) {
      Components.showToast('JS SDK download (mock): @cyber-sandbox/sdk v1.0.0', 'success');
    }
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    const search = document.getElementById('api-search');
    if (search) {
      search.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('#api-search')[0];
        document.querySelectorAll('button[onclick^="ApiDocsPage.selectEndpoint"]').forEach(btn => {
          btn.style.display = btn.textContent.toLowerCase().includes(query) ? '' : 'none';
        });
      });
    }
  },

  destroy() {
    this._selectedEndpoint = null;
  }
};
