const ProfileSkillsTab = {
  _abortController: null,
  _charts: [],
  _activeTab: 'skills',
  _user: ApiClient.currentUser || {},
  _achievements: [],
  _certifications: [],
  _leaderboard: [],

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      await ChartLoader.load();

      const [userRes, achievementsRes, certsRes, leaderboardRes] = await Promise.all([
        ApiClient.getMe({ signal: this._abortController.signal }),
        ApiClient.getAchievements({}, { signal: this._abortController.signal }),
        ApiClient.getCertifications({ signal: this._abortController.signal }),
        ApiClient._fetch('/leaderboard/', { signal: this._abortController.signal }),
      ]);

      this._user = userRes;
      this._achievements = Array.isArray(achievementsRes) ? achievementsRes : (achievementsRes.results || []);
      this._certifications = Array.isArray(certsRes) ? certsRes : (certsRes.results || []);
      this._leaderboard = Array.isArray(leaderboardRes) ? leaderboardRes : (leaderboardRes.results || []);

      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
      this._initCharts();
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
    return `<div class="text-red-500 font-mono p-4">Error loading profile skills: ${message}</div>`;
  },

  _template() {
    const skillLabels = ['Threat Analysis', 'Blockchain', 'Malware', 'Incident Response', 'Threat Hunting', 'AI/ML'];
    const skillKeys = ['skill_threat_analysis', 'skill_blockchain', 'skill_malware', 'skill_incident_response', 'skill_threat_hunting', 'skill_ai_ml'];
    const skillValues = skillKeys.map(k => this._user[k] || 0);

    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Profile — Skills & Achievements</h1>
        <p class="text-zinc-500 font-mono text-sm">Skill development, achievements, and certifications.</p>
      </div>

      <div class="flex gap-2 mb-6 border-b border-emerald-900/20">
        <button onclick="ProfileSkillsTab.setTab('skills')" class="px-4 py-2 text-xs font-black font-mono uppercase ${this._activeTab === 'skills' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-zinc-600 hover:text-emerald-500'}">Skills</button>
        <button onclick="ProfileSkillsTab.setTab('achievements')" class="px-4 py-2 text-xs font-black font-mono uppercase ${this._activeTab === 'achievements' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-zinc-600 hover:text-emerald-500'}">Achievements</button>
        <button onclick="ProfileSkillsTab.setTab('certs')" class="px-4 py-2 text-xs font-black font-mono uppercase ${this._activeTab === 'certs' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-zinc-600 hover:text-emerald-500'}">Certifications</button>
        <button onclick="ProfileSkillsTab.setTab('leaderboard')" class="px-4 py-2 text-xs font-black font-mono uppercase ${this._activeTab === 'leaderboard' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-zinc-600 hover:text-emerald-500'}">Leaderboard</button>
      </div>

      <div id="tab-content">
        ${this._renderSkillsTab(skillLabels, skillValues)}
      </div>
    `;
  },

  _renderSkillsTab(skillLabels, skillValues) {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Skill Radar', `
            <div class="h-[350px]">
              <canvas id="skills-radar"></canvas>
            </div>
          `) : ''}
        </div>
        <div>
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Skill Levels', `
            <div class="space-y-3">
              ${skillLabels.map((label, i) => `
                <div>
                  <div class="flex justify-between text-xs font-mono mb-1">
                    <span class="text-zinc-400">${label}</span>
                    <span class="text-emerald-500">${skillValues[i]}/10</span>
                  </div>
                  <div class="w-full bg-zinc-900 rounded-full h-2">
                    <div class="bg-emerald-500 h-2 rounded-full" style="width: ${skillValues[i] * 10}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          `) : ''}
        </div>
      </div>
    `;
  },

  _renderAchievementsTab() {
    const earned = this._achievements.filter(a => a.earned);
    const unearned = this._achievements.filter(a => !a.earned);

    return `
      <div>
        <div class="mb-4">
          <p class="text-xs text-zinc-500 font-mono uppercase">Earned: ${earned.length}/${this._achievements.length}</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          ${earned.map(a => `
            <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4 text-center group hover:border-emerald-500/50 transition-colors">
              <div class="text-3xl mb-2">${a.icon || '★'}</div>
              <h3 class="text-sm font-bold text-white font-mono mb-1">${a.name}</h3>
              <p class="text-xs text-zinc-500 font-mono">${a.xp_reward} XP</p>
              <div class="mt-2 text-[8px] text-emerald-500 font-mono uppercase">${a.earned_at ? new Date(a.earned_at).toLocaleDateString() : 'Earned'}</div>
            </div>
          `).join('')}
          ${unearned.map(a => `
            <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center group relative" title="${a.earn_condition || ''}">
              <div class="text-3xl mb-2 grayscale opacity-30">${a.icon || '★'}</div>
              <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
              </div>
              <h3 class="text-sm font-bold text-zinc-600 font-mono mb-1">${a.name}</h3>
              <p class="text-xs text-zinc-600 font-mono">${a.xp_reward} XP</p>
              <div class="mt-2 text-[8px] text-zinc-600 font-mono uppercase">Locked</div>
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-900 border border-emerald-900/30 rounded-lg text-[8px] text-zinc-400 font-mono opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                ${a.earn_condition || 'Complete requirements to earn'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  _renderCertsTab() {
    return `
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-sm font-black text-emerald-500 font-mono uppercase">Your Certifications</h3>
          <button onclick="ProfileSkillsTab.addCertification()" class="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-500/50 px-3 py-1 rounded font-mono text-xs transition-colors">
            + Add
          </button>
        </div>
        <div class="space-y-3">
          ${this._certifications.length ? this._certifications.map(c => `
            <div class="bg-zinc-950 border border-emerald-900/20 rounded-xl p-4 flex justify-between items-center">
              <div>
                <h4 class="text-sm font-bold text-white font-mono">${c.name}</h4>
                <p class="text-xs text-zinc-500 font-mono">Issued by ${c.issuer} • ${c.issued_date}</p>
                ${c.expiry_date ? `<p class="text-xs text-zinc-600 font-mono">Expires: ${c.expiry_date}</p>` : ''}
              </div>
              <button onclick="ProfileSkillsTab.deleteCertification('${c.id}')" class="text-red-500 hover:text-red-400">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          `).join('') : '<p class="text-xs text-zinc-600 font-mono">No certifications added yet.</p>'}
        </div>
      </div>
    `;
  },

  _renderLeaderboardTab() {
    return `
      <div>
        ${typeof Components !== 'undefined' && Components.card ? Components.card('Top Analysts', `
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead><tr class="text-emerald-900 font-black uppercase text-[9px]">
                <th class="text-left py-2">#</th><th class="text-left py-2">Analyst</th><th class="text-left py-2">Level</th><th class="text-left py-2">XP</th>
              </tr></thead>
              <tbody>
                ${this._leaderboard.map((l, i) => `
                  <tr class="border-t border-emerald-900/10">
                    <td class="py-2 font-mono text-emerald-400">#${l.rank}</td>
                    <td class="py-2 font-mono text-zinc-300">${l.name || l.avatar} ${l.is_current_user ? '<span class="text-emerald-500">(You)</span>' : ''}</td>
                    <td class="py-2 font-mono text-zinc-400">${l.rank_title}</td>
                    <td class="py-2 font-mono text-emerald-500">${l.xp}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `) : ''}
      </div>
    `;
  },

  setTab(tab) {
    this._activeTab = tab;
    const content = document.getElementById('tab-content');
    if (!content) return;

    if (tab === 'skills') {
      const skillLabels = ['Threat Analysis', 'Blockchain', 'Malware', 'Incident Response', 'Threat Hunting', 'AI/ML'];
      const skillKeys = ['skill_threat_analysis', 'skill_blockchain', 'skill_malware', 'skill_incident_response', 'skill_threat_hunting', 'skill_ai_ml'];
      const skillValues = skillKeys.map(k => this._user[k] || 0);
      content.innerHTML = this._renderSkillsTab(skillLabels, skillValues);
    } else if (tab === 'achievements') {
      content.innerHTML = this._renderAchievementsTab();
    } else if (tab === 'certs') {
      content.innerHTML = this._renderCertsTab();
    } else if (tab === 'leaderboard') {
      content.innerHTML = this._renderLeaderboardTab();
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  _initCharts() {
    this._destroyCharts();

    const ctx = document.getElementById('skills-radar')?.getContext('2d');
    if (!ctx) return;

    const skillKeys = ['skill_threat_analysis', 'skill_blockchain', 'skill_malware', 'skill_incident_response', 'skill_threat_hunting', 'skill_ai_ml'];
    const skillLabels = ['Threat Analysis', 'Blockchain', 'Malware', 'Incident Response', 'Threat Hunting', 'AI/ML'];
    const skillValues = skillKeys.map(k => this._user[k] || 0);

    const chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: skillLabels,
        datasets: [{
          label: 'Skill Level',
          data: skillValues,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: '#10b981',
          borderWidth: 2,
          pointBackgroundColor: '#10b981',
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: '#064e3b33' },
            grid: { color: '#064e3b33' },
            suggestedMin: 0,
            suggestedMax: 10,
            ticks: { color: '#064e3b', font: { family: 'JetBrains Mono', size: 9 }, backdropColor: 'transparent' },
          }
        },
        plugins: { legend: { display: false } },
      }
    });
    this._charts.push(chart);
  },

  _destroyCharts() {
    this._charts.forEach(c => c.destroy());
    this._charts = [];
  },

  addCertification() {
    const name = prompt('Certification name:');
    if (!name) return;
    const issuer = prompt('Issuing organization:');
    if (!issuer) return;

    ApiClient.createCertification({ name, issuer, issued_date: new Date().toISOString().split('T')[0] })
      .then(() => {
        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast('Certification added', 'success');
        }
        this.render();
      })
      .catch(e => {
        if (typeof Components !== 'undefined' && Components.showToast) {
          Components.showToast(e.message, 'error');
        }
      });
  },

  async deleteCertification(id) {
    if (!confirm('Delete this certification?')) return;
    try {
      await ApiClient.deleteCertification(id);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Certification deleted', 'success');
      }
      this._certifications = this._certifications.filter(c => c.id !== id);
      this.setTab(this._activeTab);
    } catch (e) {
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
    this._destroyCharts();
    if (this._abortController) this._abortController.abort();
    this._user = {};
    this._achievements = [];
    this._certifications = [];
    this._leaderboard = [];
  }
};
