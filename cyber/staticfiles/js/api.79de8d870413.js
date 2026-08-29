/**
 * API Client — all calls to Django REST API
 */
const ApiClient = {
  currentUser: JSON.parse(sessionStorage.getItem('current_user') || 'null'),
  
  // Remove ALL localStorage token methods
  // Tokens are now httpOnly cookies — browser handles them automatically
  
  async login(email, password) {
    const response = await this._fetch('/auth/login/', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    if (response.user) {
      this.currentUser = response.user;
      sessionStorage.setItem('current_user', JSON.stringify(response.user));
    }
    return response;
  },
  
  async logout() {
    try {
      await this._fetch('/auth/logout/', { method: 'POST' });
    } finally {
      this.currentUser = null;
      sessionStorage.removeItem('current_user');
      window.location.href = '/';
    }
  },
  
  isAuthenticated() {
    return !!this.currentUser;
  },
  
  // ── THREATS ────────────────────────────────────
  async getThreats(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/threats/${qs ? '?' + qs : ''}`, options);
  },
  
  async createThreat(data, options = {}) {
    return this._fetch('/threats/', { method: 'POST', body: data, ...options });
  },
  
  async classifyIoC(value, type, features = {}, options = {}) {
    return this._fetch('/ml/classify/', {
      method: 'POST',
      body: { value, type, features },
      ...options,
    });
  },
  
  async getAnnotations(iocId, options = {}) {
    return this._fetch(`/threats/${iocId}/annotations/`, options);
  },
  
  async addAnnotation(iocId, comment, options = {}) {
    return this._fetch(`/threats/${iocId}/annotations/`, {
      method: 'POST',
      body: { comment },
      ...options,
    });
  },
  
  // ── PACKET ANALYSIS ────────────────────────────
  async uploadPCAP(formData, options = {}) {
    return this._fetch('/analyze/packet/', {
      method: 'POST',
      body: formData,
      isFormData: true,
      ...options,
    });
  },
  
  async getAnalysisStatus(analysisId, options = {}) {
    return this._fetch(`/analyze/packet/${analysisId}/`, options);
  },
  
  // ── SANDBOX ────────────────────────────────────
  async submitSandbox(data, options = {}) {
    return this._fetch('/sandbox/submit/', { method: 'POST', body: data, ...options });
  },
  
  async getSandboxJob(jobId, options = {}) {
    return this._fetch(`/sandbox/${jobId}/`, options);
  },
  
  async classifyHash(hash, options = {}) {
    return this._fetch('/sandbox/classify/', { method: 'POST', body: { hash }, ...options });
  },
  
  // ── BLOCKCHAIN ─────────────────────────────────
  async getBlockchainTXs(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/blockchain/transactions/${qs ? '?' + qs : ''}`, options);
  },
  
  async anchorEvidence(data, options = {}) {
    return this._fetch('/blockchain/evidence/anchor/', { method: 'POST', body: data, ...options });
  },
  
  async verifyEvidence(evidenceId, options = {}) {
    return this._fetch(`/blockchain/evidence/${evidenceId}/verify/`, { method: 'POST', ...options });
  },
  
  async generateZKProof(hash, options = {}) {
    return this._fetch('/blockchain/zk/generate/', { method: 'POST', body: { hash }, ...options });
  },
  
  async verifyZKProof(proof, options = {}) {
    return this._fetch('/blockchain/zk/verify/', { method: 'POST', body: { proof }, ...options });
  },
  
  async getGovernanceProposals(options = {}) {
    return this._fetch('/blockchain/governance/proposals/', options);
  },
  
  async voteOnProposal(proposalId, vote, options = {}) {
    return this._fetch('/blockchain/governance/vote/', {
      method: 'POST',
      body: { proposal_id: proposalId, vote },
      ...options,
    });
  },
  
  // ── CYBER GURU ─────────────────────────────────
  async queryCyberGuru(query, context = '', options = {}) {
    return this._fetch('/guru/query/', {
      method: 'POST',
      body: { query, context },
      ...options,
    });
  },
  
  // ── INCIDENTS ──────────────────────────────────
  async getIncidents(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/incidents/${qs ? '?' + qs : ''}`, options);
  },
  
  async createIncident(data, options = {}) {
    return this._fetch('/incidents/', { method: 'POST', body: data, ...options });
  },
  
  async updateIncident(id, data, options = {}) {
    return this._fetch(`/incidents/${id}/`, { method: 'PATCH', body: data, ...options });
  },
  
  // ── ANALYTICS ──────────────────────────────────
  async getDashboardData(options = {}) {
    return this._fetch('/analytics/dashboard/', options);
  },
  
  async getAnalytics(type, options = {}) {
    return this._fetch(`/analytics/${type}/`, options);
  },
  
  async getAutoHuntResults(options = {}) {
    return this._fetch('/ai/autohunt/results/', options);
  },
  
  // ── ADMIN ──────────────────────────────────────
  async getUsers(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/users/${qs ? '?' + qs : ''}`, options);
  },
  
  async updateUser(id, data, options = {}) {
    return this._fetch(`/users/${id}/`, { method: 'PATCH', body: data, ...options });
  },
  
  async inviteUser(email, role, options = {}) {
    return this._fetch('/users/invite/', { method: 'POST', body: { email, role }, ...options });
  },
  
   async getMLModels(options = {}) {
    return this._fetch('/ai/models/', options);
  },
  
  async getSystemHealth(options = {}) {
    return this._fetch('/admin/health/', options);
  },
  
  async getAuditLog(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/audit-log/${qs ? '?' + qs : ''}`, options);
  },
  
  // ── ML ─────────────────────────────────────────
  async classifyNLQ(query, options = {}) {
    return this._fetch('/ai/nlq/parse/', { method: 'POST', body: { query }, ...options });
  },
  
  // ── COMPLIANCE ───────────────────────────────────
  async getFrameworks(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/compliance/frameworks/${qs ? '?' + qs : ''}`, options);
  },
  
  async generateEvidencePack(data, options = {}) {
    return this._fetch('/compliance/evidence-pack/', { method: 'POST', body: data, ...options });
  },
  
  // ── REPORTS ──────────────────────────────────────
  async saveReportConfig(data, options = {}) {
    return this._fetch('/reports/builder/save/', { method: 'POST', body: data, ...options });
  },
  
  // ── NETWORK ──────────────────────────────────────
  async getPeers(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/network/peers/${qs ? '?' + qs : ''}`, options);
  },
  
  async getInbox(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/network/inbox/${qs ? '?' + qs : ''}`, options);
  },
  
  async importInboxItem(id, options = {}) {
    return this._fetch(`/network/inbox/${id}/import/`, { method: 'POST', ...options });
  },
  
  async createInviteCode(data, options = {}) {
    return this._fetch('/network/invite-code/', { method: 'POST', body: data, ...options });
  },
  
  async updateNetworkPolicy(peerId, data, options = {}) {
    return this._fetch(`/network/policy/${peerId}/`, { method: 'PATCH', body: data, ...options });
  },
  
  // ── SHIFTS ───────────────────────────────────────
  async getCurrentShift(options = {}) {
    return this._fetch('/shifts/current/', options);
  },
  
  async addJournalEntry(data, options = {}) {
    return this._fetch('/shifts/journal/', { method: 'POST', body: data, ...options });
  },
  
  async getHandoverDraft(options = {}) {
    return this._fetch('/shifts/handover/draft/', options);
  },
  
  async signOffHandover(data, options = {}) {
    return this._fetch('/shifts/handover/', { method: 'POST', body: data, ...options });
  },
  
  // ── USER PROFILE EXTENSIONS ──────────────────────
  async getMe(options = {}) {
    return this._fetch('/users/me/', options);
  },
  
  async getAchievements(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/users/achievements/${qs ? '?' + qs : ''}`, options);
  },
  
  async getCertifications(options = {}) {
    return this._fetch('/users/certifications/', options);
  },
  
  async createCertification(data, options = {}) {
    return this._fetch('/users/certifications/', { method: 'POST', body: data, ...options });
  },
  
  async deleteCertification(id, options = {}) {
    return this._fetch(`/users/certifications/${id}/`, { method: 'DELETE', ...options });
  },
  
  // ── CAMPAIGNS (Correlation) ──────────────────────
  async getCampaigns(params = {}, options = {}) {
    const qs = new URLSearchParams(params).toString();
    return this._fetch(`/analytics/campaigns/${qs ? '?' + qs : ''}`, options);
  },
  
  async createCampaign(data, options = {}) {
    return this._fetch('/analytics/campaigns/', { method: 'POST', body: data, ...options });
  },
  
  // ── ML MODELS (Admin) ────────────────────────────
  async getModelDrift(id, options = {}) {
    return this._fetch(`/ai/models/${id}/drift/`, options);
  },
  
  async updateModelSplit(data, options = {}) {
    return this._fetch('/ai/models/split/', { method: 'PATCH', body: data, ...options });
  },
  
  async promoteModel(id, options = {}) {
    return this._fetch(`/ai/models/${id}/promote/`, { method: 'POST', ...options });
  },
  
  // ── INTEGRATIONS ────────────────────────────────
  async getIntegrations(options = {}) {
    return this._fetch('/integrations/', options);
  },
  
  async saveIntegrationConfig(name, config, options = {}) {
    return this._fetch(`/integrations/${name}/config/`, { method: 'POST', body: config, ...options });
  },
  
  async testIntegration(name, options = {}) {
    return this._fetch(`/integrations/${name}/test/`, { method: 'POST', ...options });
  },
  
  // ── INTERNAL ───────────────────────────────────
  async get(path, options = {}) { return this._fetch(path, { ...options, method: 'GET' }); },
  async post(path, data, options = {}) { return this._fetch(path, { ...options, method: 'POST', body: data }); },
  async patch(path, data, options = {}) { return this._fetch(path, { ...options, method: 'PATCH', body: data }); },
  async put(path, data, options = {}) { return this._fetch(path, { ...options, method: 'PUT', body: data }); },
  async delete(path, options = {}) { return this._fetch(path, { ...options, method: 'DELETE' }); },
  
  async _fetch(path, options = {}) {
    const { method = 'GET', body, auth = true, isFormData = false, signal } = options;
    
    const headers = {};
    if (!isFormData && body) {
      headers['Content-Type'] = 'application/json';
    }
    
    // CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      headers['X-CSRFToken'] = csrfToken;
    }
    
    const fetchOptions = {
      method,
      headers,
      credentials: 'include',  // Send cookies automatically
    };
    
    if (signal) fetchOptions.signal = signal;
    
    if (body) {
      fetchOptions.body = isFormData ? body : JSON.stringify(body);
    }
    
    let response = await fetch(`/api/v1${path}`, fetchOptions);
    
    // Handle token expiry
    if (response.status === 401 && auth) {
      // Try to refresh token
      const refreshed = await this._refreshToken();
      if (refreshed) {
        response = await fetch(`/api/v1${path}`, fetchOptions);
      } else {
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
    }
    
    // Handle 403
    if (response.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }
    
    // Handle 429 rate limit
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
    }
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: `HTTP ${response.status} Error` };
      }
      throw new Error(errorData.detail || errorData.error || Object.values(errorData)[0] || 'Request failed');
    }
    
    if (response.status === 204) return {};
    
    return response.json().catch(() => ({}));
  },
  
  async _refreshToken() {
    try {
      const response = await fetch('/api/v1/auth/refresh/', {
        method: 'POST',
        credentials: 'include',  // Sends refresh_token cookie
        headers: {
          'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.content || '',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
