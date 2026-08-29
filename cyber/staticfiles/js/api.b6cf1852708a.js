/**
 * API Client — all calls to Django REST API
 */
const API_BASE = '/api/v1';

const ApiClient = {
  // State
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  currentUser: JSON.parse(localStorage.getItem('current_user') || 'null'),

  // ── AUTH ───────────────────────────────────────
  async login(email, password) {
    const response = await this._fetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    if (response.access) {
      this.accessToken = response.access;
      this.refreshToken = response.refresh;
      this.currentUser = response.user;
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      localStorage.setItem('current_user', JSON.stringify(response.user));
    }
    return response;
  },

  async register(data) {
    return this._fetch('/auth/register/', { method: 'POST', body: JSON.stringify(data), auth: false });
  },

  async refreshAccessToken() {
    const response = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: this.refreshToken }),
    });
    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.access;
      localStorage.setItem('access_token', data.access);
      return data.access;
    }
    this.logout();
    return null;
  },

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    window.location.href = '/';
  },

  isAuthenticated() {
    return !!this.accessToken && !!this.currentUser;
  },

  // ── THREATS ────────────────────────────────────
  async getThreats(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/threats/${qs ? '?' + qs : ''}`);
  },

  async createThreat(data) {
    return this._fetch('/threats/', { method: 'POST', body: JSON.stringify(data) });
  },

  async classifyIoC(value, type, features = {}) {
    return this._fetch('/ml/classify/', {
      method: 'POST',
      body: JSON.stringify({ value, type, features }),
    });
  },

  async getAnnotations(iocId) {
    return this._fetch(`/threats/${iocId}/annotations/`);
  },

  async addAnnotation(iocId, comment) {
    return this._fetch(`/threats/${iocId}/annotations/`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  // ── PACKET ANALYSIS ────────────────────────────
  async uploadPCAP(formData) {
    return this._fetch('/analyze/packet/', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  async getAnalysisStatus(analysisId) {
    return this._fetch(`/analyze/packet/${analysisId}/`);
  },

  // ── SANDBOX ────────────────────────────────────
  async submitSandbox(data) {
    return this._fetch('/sandbox/submit/', { method: 'POST', body: JSON.stringify(data) });
  },

  async getSandboxJob(jobId) {
    return this._fetch(`/sandbox/${jobId}/`);
  },

  async classifyHash(hash) {
    return this._fetch('/sandbox/classify/', { method: 'POST', body: JSON.stringify({ hash }) });
  },

  // ── BLOCKCHAIN ─────────────────────────────────
  async getBlockchainTXs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/blockchain/transactions/${qs ? '?' + qs : ''}`);
  },

  async anchorEvidence(data) {
    return this._fetch('/blockchain/evidence/anchor/', { method: 'POST', body: JSON.stringify(data) });
  },

  async verifyEvidence(evidenceId) {
    return this._fetch(`/blockchain/evidence/${evidenceId}/verify/`, { method: 'POST' });
  },

  async generateZKProof(hash) {
    return this._fetch('/blockchain/zk/generate/', { method: 'POST', body: JSON.stringify({ hash }) });
  },

  async verifyZKProof(proof) {
    return this._fetch('/blockchain/zk/verify/', { method: 'POST', body: JSON.stringify({ proof }) });
  },

  async getGovernanceProposals() {
    return this._fetch('/blockchain/governance/proposals/');
  },

  async voteOnProposal(proposalId, vote) {
    return this._fetch('/blockchain/governance/vote/', {
      method: 'POST',
      body: JSON.stringify({ proposal_id: proposalId, vote }),
    });
  },

  // ── SANDBOX ────────────────────────────────────
  async queryCyberGuru(query, context = '') {
    return this._fetch('/guru/query/', {
      method: 'POST',
      body: JSON.stringify({ query, context }),
    });
  },

  // ── INCIDENTS ──────────────────────────────────
  async getIncidents(params = {}) {
    return this._fetch('/incidents/?' + new URLSearchParams(params).toString());
  },

  async createIncident(data) {
    return this._fetch('/incidents/', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateIncident(id, data) {
    return this._fetch(`/incidents/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  // ── ANALYTICS ──────────────────────────────────
  async getDashboardData() {
    return this._fetch('/analytics/dashboard/');
  },

  async getAnalytics(type) {
    return this._fetch(`/analytics/${type}/`);
  },

  async getAutoHuntResults() {
    return this._fetch('/ai/autohunt/results/');
  },

  // ── ADMIN ──────────────────────────────────────
  async getUsers(params = {}) {
    return this._fetch('/users/?' + new URLSearchParams(params).toString());
  },

  async updateUser(id, data) {
    return this._fetch(`/users/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async inviteUser(email, role) {
    return this._fetch('/users/invite/', { method: 'POST', body: JSON.stringify({ email, role }) });
  },

  async getMLModels() {
    return this._fetch('/ml/models/');
  },

  async getSystemHealth() {
    return this._fetch('/admin/system/health/');
  },

  async getAuditLog(params = {}) {
    return this._fetch('/audit-log/?' + new URLSearchParams(params).toString());
  },

  // ── ML ─────────────────────────────────────────
  async classifyNLQ(query) {
    return this._fetch('/ai/nlq/parse/', { method: 'POST', body: JSON.stringify({ query }) });
  },

  // ── INTEGRATIONS ───────────────────────────────
  async getIntegrations() {
    return this._fetch('/integrations/');
  },

  async saveIntegrationConfig(name, config) {
    return this._fetch(`/integrations/${name}/config/`, { method: 'POST', body: JSON.stringify(config) });
  },

  async testIntegration(name) {
    return this._fetch(`/integrations/${name}/test/`, { method: 'POST' });
  },

  // ── INTERNAL ───────────────────────────────────
  async get(path) { return this._fetch(path, { method: 'GET' }); },
  async post(path, data) { return this._fetch(path, { method: 'POST', body: JSON.stringify(data) }); },
  async patch(path, data) { return this._fetch(path, { method: 'PATCH', body: JSON.stringify(data) }); },
  async put(path, data) { return this._fetch(path, { method: 'PUT', body: JSON.stringify(data) }); },
  async delete(path) { return this._fetch(path, { method: 'DELETE' }); },

  async _fetch(path, options = {}) {
    const { method = 'GET', body, auth = true, isFormData = false } = options;

    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    headers['X-CSRFToken'] = document.querySelector('meta[name="csrf-token"]')?.content || '';

    if (auth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(API_BASE + path, {
      method,
      headers,
      body: isFormData ? body : body,
    });

    // Token refresh on 401
    if (response.status === 401 && auth && this.refreshToken) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(API_BASE + path, { method, headers, body });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || error.error || 'Request failed');
    }

    return response.json().catch(() => ({}));
  },
};
