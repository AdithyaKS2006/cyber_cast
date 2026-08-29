const NetworkPage = {
  _pollInterval: null,
  _abortController: null,
  _peers: [],
  _inboxItems: [],

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      const [peersRes, inboxRes] = await Promise.all([
        ApiClient.getPeers({}, { signal: this._abortController.signal }),
        ApiClient.getInbox({}, { signal: this._abortController.signal }),
      ]);
      this._peers = Array.isArray(peersRes) ? peersRes : (peersRes.results || []);
      this._inboxItems = Array.isArray(inboxRes) ? inboxRes : (inboxRes.results || []);
      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
      this._drawNetwork();
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
    return `<div class="text-red-500 font-mono p-4">Error loading network page: ${message}</div>`;
  },

  _template() {
    const peerRows = this._peers.map(p => `
      <tr class="border-t border-emerald-900/10">
        <td class="py-3 px-4 font-mono text-sm text-emerald-400 truncate">${p.peer_id || p.id}</td>
        <td class="py-3 px-4 font-mono text-sm">${p.peer_name || p.name || p.address}</td>
        <td class="py-3 px-4"><span class="px-2 py-1 text-xs font-black uppercase rounded ${p.status === 'connected' ? 'bg-emerald-900/30 text-emerald-500' : 'bg-red-900/30 text-red-500'}">${p.status}</span></td>
        <td class="py-3 px-4 font-mono text-sm text-zinc-300">${p.last_seen || '—'}</td>
        <td class="py-3 px-4">
          <button onclick="NetworkPage.openPolicyConfig('${p.peer_id || p.id}')" class="text-xs text-emerald-500 hover:text-emerald-400">Configure</button>
        </td>
      </tr>
    `).join('');

    const inboxRows = this._inboxItems.map(item => `
      <tr class="border-t border-emerald-900/10">
        <td class="py-3 px-4 font-mono text-sm text-emerald-400 truncate">${item.id}</td>
        <td class="py-3 px-4 font-mono text-sm">${item.sender || item.title}</td>
        <td class="py-3 px-4 font-mono text-sm text-zinc-300">${item.created_at || '—'}</td>
        <td class="py-3 px-4">
          <button onclick="NetworkPage.importInboxItem('${item.id}')" class="text-xs bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-500 px-2 py-1 rounded transition-colors">
            Import
          </button>
        </td>
      </tr>
    `).join('');

    return `
      <div class="mb-6 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold font-mono text-white mb-2">Network Map</h1>
          <p class="text-zinc-500 font-mono text-sm">Peer-to-peer threat intelligence sharing network.</p>
        </div>
        <button onclick="NetworkPage.openInviteModal()" class="bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase px-4 py-2 rounded-lg font-mono text-sm transition-colors">
          Add Peer
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="lg:col-span-2">
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Network Diagram', `
            <div id="network-diagram" class="w-full h-[400px] relative">
              <svg width="100%" height="100%" viewBox="0 0 600 400"></svg>
            </div>
          `, '') : ''}
        </div>
        <div>
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Your Peer', `
            <div class="text-center py-6">
              <div class="w-16 h-16 bg-emerald-900/30 rounded-full mx-auto mb-4 border-2 border-emerald-500 flex items-center justify-center">
                <span class="text-xl font-black text-emerald-500">ME</span>
              </div>
              <p class="text-sm text-white font-mono">localhost</p>
              <p class="text-xs text-emerald-500 font-mono">Peer ID: ${ApiClient.currentUser?.id?.slice(0,8) || 'local'}</p>
            </div>
          `) : ''}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Connected Peers', `
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead><tr class="text-emerald-900 font-black uppercase text-[9px]">
                  <th class="text-left py-2">Peer ID</th><th class="text-left py-2">Name</th><th class="text-left py-2">Status</th><th class="text-left py-2">Last Seen</th><th class="text-left py-2">Actions</th>
                </tr></thead>
                <tbody>${peerRows || '<tr><td colspan="5" class="py-8 text-center text-zinc-500 font-mono">No peers connected</td></tr>'}</tbody>
              </table>
            </div>
          `) : ''}
        </div>
        <div>
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Sharing Inbox', `
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead><tr class="text-emerald-900 font-black uppercase text-[9px]">
                  <th class="text-left py-2">ID</th><th class="text-left py-2">Sender</th><th class="text-left py-2">Received</th><th class="text-left py-2">Actions</th>
                </tr></thead>
                <tbody>${inboxRows || '<tr><td colspan="4" class="py-8 text-center text-zinc-500 font-mono">No items in inbox</td></tr>'}</tbody>
              </table>
            </div>
          `) : ''}
        </div>
      </div>
    `;
  },

  _drawNetwork() {
    const svg = document.querySelector('#network-diagram svg');
    if (!svg) return;
    svg.innerHTML = '';

    const centerX = 300;
    const centerY = 200;

    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', centerX);
    centerCircle.setAttribute('cy', centerY);
    centerCircle.setAttribute('r', 24);
    centerCircle.setAttribute('fill', '#10b981');
    centerCircle.setAttribute('stroke', '#18181b');
    centerCircle.setAttribute('stroke-width', '3');
    svg.appendChild(centerCircle);

    const centerLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerLabel.setAttribute('x', centerX);
    centerLabel.setAttribute('y', centerY + 3);
    centerLabel.setAttribute('text-anchor', 'middle');
    centerLabel.setAttribute('fill', '#000');
    centerLabel.setAttribute('font-family', 'JetBrains Mono');
    centerLabel.setAttribute('font-size', '10');
    centerLabel.setAttribute('font-weight', 'bold');
    centerLabel.textContent = 'ME';
    svg.appendChild(centerLabel);

    this._peers.forEach((peer, i) => {
      const angle = (i / Math.max(this._peers.length, 1)) * 2 * Math.PI;
      const radius = 120;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', centerX);
      line.setAttribute('y1', centerY);
      line.setAttribute('x2', x);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#10b981');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('opacity', '0.4');
      line.setAttribute('stroke-dasharray', '4,2');
      svg.appendChild(line);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', 16);
      circle.setAttribute('fill', peer.status === 'connected' ? '#10b981' : '#ef4444');
      circle.setAttribute('stroke', '#18181b');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('class', 'cursor-pointer');
      circle.addEventListener('click', () => {
        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast(`${peer.peer_name || peer.name || 'Peer'}: ${peer.status}`, 'success');
        }
      });
      svg.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', y + 32);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#71717a');
      label.setAttribute('font-family', 'JetBrains Mono');
      label.setAttribute('font-size', '8');
      label.textContent = (peer.peer_name || peer.name || 'Peer').substring(0, 10);
      svg.appendChild(label);
    });
  },

  openInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (!modal) {
      const m = document.createElement('div');
      m.id = 'invite-modal';
      m.className = 'fixed inset-0 z-[300] bg-black/80 backdrop-blur hidden items-center justify-center';
      m.innerHTML = `
        <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-bold text-white font-mono mb-4">Invite Peer to Network</h3>
          <form id="invite-form" class="space-y-4">
            <div>
              <label class="block text-xs text-zinc-500 font-mono uppercase mb-1">Peer Endpoint</label>
              <input type="text" name="endpoint" placeholder="e.g. 192.168.1.100" class="w-full bg-black border border-emerald-900/50 rounded p-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" required>
            </div>
            <div class="flex justify-end gap-2 pt-4">
              <button type="button" onclick="NetworkPage.closeInviteModal()" class="px-4 py-2 text-sm font-mono text-zinc-500 hover:text-white">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase rounded">Generate</button>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(m);
    }
    document.getElementById('invite-modal').classList.remove('hidden');
    document.getElementById('invite-modal').classList.add('flex');

    document.getElementById('invite-form').onsubmit = async (e) => {
      e.preventDefault();
      const endpoint = e.target.endpoint.value;
      try {
        const res = await ApiClient.createInviteCode({ endpoint });
        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast(`Invite code: ${res.invite_code || res.code}`, 'success');
        }
      } catch (err) {
        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast(err.message, 'error');
        }
      }
    };
  },

  closeInviteModal() {
    const el = document.getElementById('invite-modal');
    if (el) el.classList.add('hidden');
  },

  async importInboxItem(id) {
    try {
      await ApiClient.importInboxItem(id);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Inbox item imported successfully', 'success');
      }
      this._inboxItems = this._inboxItems.filter(i => i.id !== id);
      this.render();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast(e.message, 'error');
      }
    }
  },

  openPolicyConfig(peerId) {
    const peer = this._peers.find(p => p.peer_id === peerId || p.id === peerId);
    if (!peer) return;

    const modal = document.getElementById('policy-modal');
    if (!modal) {
      const m = document.createElement('div');
      m.id = 'policy-modal';
      m.className = 'fixed inset-0 z-[300] bg-black/80 backdrop-blur hidden items-center justify-center';
      m.innerHTML = `
        <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-bold text-white font-mono mb-4">Peer Policy — ${peer.peer_name || peer.name || peerId}</h3>
          <form id="policy-form" class="space-y-4">
            <div>
              <label class="block text-xs text-zinc-500 font-mono uppercase mb-1">Rate Limit (req/min)</label>
              <input type="number" name="rate_limit" value="${peer.rate_limit || 100}" class="w-full bg-black border border-emerald-900/50 rounded p-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" required>
            </div>
            <div>
              <label class="block text-xs text-zinc-500 font-mono uppercase mb-1">Encryption</label>
              <select name="encryption" class="w-full bg-black border border-emerald-900/50 rounded p-2 text-white font-mono text-sm focus:border-emerald-500 outline-none">
                <option value="tls1_3" ${peer.encryption === 'tls1_3' ? 'selected' : ''}>TLS 1.3</option>
                <option value="tls1_2" ${peer.encryption === 'tls1_2' ? 'selected' : ''}>TLS 1.2</option>
              </select>
            </div>
            <div class="flex justify-end gap-2 pt-4">
              <button type="button" onclick="NetworkPage.closePolicyModal()" class="px-4 py-2 text-sm font-mono text-zinc-500 hover:text-white">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase rounded">Save</button>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(m);
    }
    document.getElementById('policy-modal').classList.remove('hidden');
    document.getElementById('policy-modal').classList.add('flex');

    document.getElementById('policy-form').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await ApiClient.updateNetworkPolicy(peerId, {
          rate_limit: parseInt(formData.get('rate_limit')),
          encryption: formData.get('encryption'),
        });
        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast('Policy updated', 'success');
        }
        NetworkPage.closePolicyModal();
      } catch (err) {
        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast(err.message, 'error');
        }
      }
    };
  },

  closePolicyModal() {
    const el = document.getElementById('policy-modal');
    if (el) el.classList.add('hidden');
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  destroy() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    if (this._abortController) this._abortController.abort();
    this._peers = [];
    this._inboxItems = [];
  }
};
