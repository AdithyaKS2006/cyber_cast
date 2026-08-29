/**
 * Main app controller — handles routing, sidebar, auth state
 */

// ── STATE ──────────────────────────────────────
let currentPage = 'dashboard';
let sidebarCollapsed = false;
let user = ApiClient.currentUser;
let theme = localStorage.getItem('theme') || 'dark';

// ── MENU CONFIG ─────────────────────────────────
const MENU_CONFIG = [
  { group: 'COMMAND', items: [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard', roles: ['analyst','validator','administrator'] },
    { id: 'threat-feed', icon: 'activity', label: 'Threat Feed', roles: ['analyst','validator','administrator'] },
    { id: 'analyzer/packet', icon: 'zap', label: 'Packet Analyzer', roles: ['analyst','administrator'] },
    { id: 'analyzer/sandbox', icon: 'microscope', label: 'Sandbox', roles: ['analyst','administrator'] },
    { id: 'guru', icon: 'message-square', label: 'Cyber Guru', roles: ['analyst','validator','administrator'] },
    { id: 'safety-scout', icon: 'globe', label: 'Safety Scout', roles: ['analyst','validator','administrator'] },
  ]},
  { group: 'AI & ML', items: [
    { id: 'ai/autohunt', icon: 'search-code', label: 'AutoHunt', roles: ['analyst','administrator'] },
    { id: 'ai/threat-scoring', icon: 'target', label: 'Threat Scoring', roles: ['administrator'] },
  ]},
  { group: 'BLOCKCHAIN', items: [
    { id: 'blockchain/explorer', icon: 'database', label: 'Explorer', roles: ['validator','administrator'] },
    { id: 'blockchain/contracts', icon: 'file-code', label: 'Contracts', roles: ['validator','administrator'] },
    { id: 'blockchain/reputation', icon: 'trophy', label: 'Reputation', roles: ['validator','administrator'] },
    { id: 'blockchain/evidence-vault', icon: 'hard-drive', label: 'Evidence Vault', roles: ['validator','administrator'] },
    { id: 'blockchain/governance', icon: 'gavel', label: 'Governance', roles: ['validator','administrator'] },
    { id: 'blockchain/audit-log', icon: 'history', label: 'Audit Log', roles: ['administrator'] },
  ]},
  { group: 'COLLABORATE', items: [
    { id: 'incidents', icon: 'shield-alert', label: 'Incidents', roles: ['analyst','validator','administrator'] },
    { id: 'playbooks', icon: 'briefcase', label: 'Playbooks', roles: ['analyst','validator','administrator'] },
    { id: 'hunt', icon: 'file-search', label: 'Threat Hunt', roles: ['analyst','validator','administrator'] },
    { id: 'shifts', icon: 'clock', label: 'Shifts', roles: ['analyst','validator','administrator'] },
  ]},
  { group: 'ANALYTICS', items: [
    { id: 'dashboard/executive', icon: 'bar-chart-3', label: 'Executive', roles: ['analyst','validator','administrator'] },
    { id: 'analytics', icon: 'pie-chart', label: 'Analytics', roles: ['analyst','validator','administrator'] },
    { id: 'reports', icon: 'file-text', label: 'Reports', roles: ['analyst','validator','administrator'] },
  ]},
  { group: 'ADMIN', items: [
    { id: 'admin/users', icon: 'users', label: 'Users', roles: ['administrator'] },
    { id: 'admin/system', icon: 'server', label: 'System Health', roles: ['administrator'] },
    { id: 'admin/api-keys', icon: 'key', label: 'API Keys', roles: ['administrator'] },
    { id: 'admin/ml-models', icon: 'cpu', label: 'ML Models', roles: ['administrator'] },
  ]},
  { group: 'ACCOUNT', items: [
    { id: 'integrations', icon: 'boxes', label: 'Integrations', roles: ['administrator'] },
    { id: 'api-docs', icon: 'code', label: 'API Docs', roles: ['analyst','validator','administrator'] },
    { id: 'profile', icon: 'settings', label: 'Profile', roles: ['analyst','validator','administrator'] },
  ]},
];

// PAGE → COMPONENT MAPPING
const PAGE_LOADERS = {
  'dashboard': () => DashboardPage.render(),
  'threat-feed': () => ThreatFeedPage.render(),
  'analyzer/packet': () => PacketAnalyzerPage.render(),
  'analyzer/sandbox': () => SandboxPage.render(),
  'guru': () => CyberGuruPage.render(),
  'blockchain/explorer': () => BlockchainExplorerPage.render(),
  'blockchain/contracts': () => BlockchainContractsPage.render(),
  'blockchain/reputation': () => BlockchainReputationPage.render(),
  'blockchain/evidence-vault': () => EvidenceVaultPage.render(),
  'blockchain/governance': () => GovernancePage.render(),
  'blockchain/audit-log': () => AuditLogPage.render(),
  'incidents': () => IncidentsPage.render(),
  'playbooks': () => PlaybooksPage.render(),
  'hunt': () => HuntPage.render(),
  'shifts': () => ShiftsPage.render(),
  'dashboard/executive': () => ExecutiveDashboardPage.render(),
  'analytics': () => AnalyticsPage.render(),
  'reports': () => ReportsPage.render(),
  'reports/builder': () => ReportBuilderPage.render(),
  'admin/users': () => AdminUsersPage.render(),
  'admin/system': () => AdminSystemPage.render(),
  'admin/api-keys': () => AdminApiKeysPage.render(),
  'admin/ml-models': () => AdminMLModelsPage.render(),
  'ai/autohunt': () => AutoHuntPage.render(),
  'ai/threat-scoring': () => ThreatScoringPage.render(),
  'integrations': () => IntegrationsPage.render(),
  'profile': () => ProfilePage.render(),
};

const PAGE_ROLES = {
  'blockchain/explorer': ['validator','administrator'],
  'blockchain/contracts': ['validator','administrator'],
  'blockchain/reputation': ['validator','administrator'],
  'blockchain/evidence-vault': ['validator','administrator'],
  'blockchain/governance': ['validator','administrator'],
  'blockchain/audit-log': ['administrator'],
  'ai/threat-scoring': ['administrator'],
  'admin/users': ['administrator'],
  'admin/system': ['administrator'],
  'admin/api-keys': ['administrator'],
  'admin/ml-models': ['administrator'],
  'integrations': ['administrator'],
};

// ── INIT ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!ApiClient.isAuthenticated()) {
    window.location.href = '/';
    return;
  }
  
  user = ApiClient.currentUser;
  applyTheme(theme);
  buildSidebar();
  updateHeader();
  navigate(currentPage);
  initWebSockets();
  initKeyboardShortcuts();
  loadNotifications();
});

// ── NAVIGATION ──────────────────────────────────
function navigate(page) {
  window.scrollTo(0, 0);
  document.getElementById('main-content').scrollTop = 0;
  
  const requiredRoles = PAGE_ROLES[page];
  if (requiredRoles && !requiredRoles.includes(user?.role)) {
    renderAccessDenied();
    return;
  }
  
  currentPage = page;
  updateSidebarActive();
  updateBreadcrumb();
  
  const pageContent = document.getElementById('page-content');
  pageContent.innerHTML = '<div class="animate-pulse space-y-6"><div class="h-8 w-40 bg-zinc-900 rounded"></div><div class="grid grid-cols-4 gap-4">' + Array(4).fill('<div class="h-28 bg-zinc-900 rounded"></div>').join('') + '</div><div class="h-64 bg-zinc-900 rounded"></div></div>';
  
  const loader = PAGE_LOADERS[page];
  if (loader) {
    setTimeout(() => loader(), 150);
  } else {
    pageContent.innerHTML = '<div class="text-center py-32"><p class="text-zinc-600 uppercase font-black text-sm">Page not yet implemented</p></div>';
  }
  
  closeMobileNav();
}

function renderAccessDenied() {
  document.getElementById('page-content').innerHTML = `
    <div class="flex flex-col items-center justify-center h-96 gap-4">
      <svg class="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      <h2 class="text-xl font-black text-white uppercase">Access Denied</h2>
      <p class="text-zinc-500 text-xs uppercase font-bold">Your role (${user?.role}) does not have permission for this page.</p>
      <button onclick="navigate('dashboard')" class="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-emerald-500 border border-emerald-900/30 rounded-lg font-bold">Return to Dashboard</button>
    </div>
  `;
}

// ── SIDEBAR ─────────────────────────────────────
function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  const mobileNav = document.getElementById('mobile-nav-items');
  nav.innerHTML = '';
  mobileNav.innerHTML = '';
  
  MENU_CONFIG.forEach(group => {
    const allowedItems = group.items.filter(item => item.roles.includes(user?.role));
    if (!allowedItems.length) return;
    
    const groupEl = document.createElement('div');
    groupEl.className = 'space-y-1';
    groupEl.innerHTML = `<p class="sidebar-label text-[10px] font-black text-emerald-900 uppercase px-3 mb-2 tracking-[0.2em]">${group.group}</p>`;
    
    allowedItems.forEach(item => {
      const btn = document.createElement('button');
      btn.id = `nav-${item.id.replace('/', '-')}`;
      btn.className = `w-full flex items-center gap-3 p-3 rounded-xl transition-all ${currentPage === item.id ? 'bg-emerald-600 text-black font-black shadow-lg' : 'text-zinc-600 hover:text-emerald-500 hover:bg-emerald-950/20'}`;
      btn.onclick = () => navigate(item.id);
      btn.innerHTML = `<span class="w-5 h-5 flex-shrink-0"><!-- icon --></span><span class="sidebar-label text-[11px] uppercase tracking-wider">${item.label}</span>`;
      groupEl.appendChild(btn);
      
      // Mobile
      const mBtn = btn.cloneNode(true);
      mBtn.onclick = () => { navigate(item.id); closeMobileNav(); };
      mobileNav.appendChild(mBtn);
    });
    
    nav.appendChild(groupEl);
  });
}

function updateSidebarActive() {
  document.querySelectorAll('[id^="nav-"]').forEach(btn => {
    btn.classList.remove('bg-emerald-600', 'text-black', 'font-black', 'shadow-lg');
    btn.classList.add('text-zinc-600', 'hover:text-emerald-500', 'hover:bg-emerald-950/20');
  });
  const activeId = `nav-${currentPage.replace('/', '-')}`;
  const activeBtn = document.getElementById(activeId);
  if (activeBtn) {
    activeBtn.classList.add('bg-emerald-600', 'text-black', 'font-black', 'shadow-lg');
    activeBtn.classList.remove('text-zinc-600', 'hover:text-emerald-500', 'hover:bg-emerald-950/20');
  }
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  const sidebar = document.getElementById('sidebar');
  if (sidebarCollapsed) {
    sidebar.style.width = '64px';
    document.querySelectorAll('.sidebar-label').forEach(el => el.classList.add('hidden'));
  } else {
    sidebar.style.width = '256px';
    document.querySelectorAll('.sidebar-label').forEach(el => el.classList.remove('hidden'));
  }
}

function openMobileNav() { document.getElementById('mobile-nav-overlay').classList.remove('hidden'); }
function closeMobileNav() { document.getElementById('mobile-nav-overlay').classList.add('hidden'); }

// ── HEADER ──────────────────────────────────────
function updateHeader() {
  document.getElementById('header-username').textContent = user?.name || 'ANONYMOUS';
  document.getElementById('header-role').textContent = user?.role?.toUpperCase() || 'ANALYST';
  document.getElementById('header-avatar').textContent = user?.avatar || '??';
}

function updateBreadcrumb() {
  const parts = currentPage.split('/');
  const crumbs = document.getElementById('breadcrumb');
  crumbs.innerHTML = `<span class="hover:text-emerald-500 cursor-pointer" onclick="navigate('dashboard')">Protocol</span>`;
  parts.forEach((p, i) => {
    crumbs.innerHTML += `<svg class="w-3 h-3 text-zinc-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`;
    crumbs.innerHTML += `<span class="${i === parts.length-1 ? 'text-emerald-500' : 'hover:text-emerald-500 cursor-pointer'}">${p}</span>`;
  });
}

// ── THEME ────────────────────────────────────────
function applyTheme(t) {
  theme = t;
  localStorage.setItem('theme', t);
  const root = document.getElementById('html-root');
  if (t === 'light') {
    root.classList.remove('dark');
    root.classList.add('light-mode');
    document.getElementById('theme-icon-moon').classList.add('hidden');
    document.getElementById('theme-icon-sun').classList.remove('hidden');
  } else {
    root.classList.add('dark');
    root.classList.remove('light-mode');
    document.getElementById('theme-icon-sun').classList.add('hidden');
    document.getElementById('theme-icon-moon').classList.remove('hidden');
  }
}
function toggleTheme() { applyTheme(theme === 'dark' ? 'light' : 'dark'); }

// ── AUTH ─────────────────────────────────────────
function logout() { ApiClient.logout(); }

// ── KEYBOARD SHORTCUTS ───────────────────────────
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openNLQ();
    }
    if (e.key === 'Escape') {
      closeNLQ();
      document.getElementById('notif-panel').style.transform = 'translateX(100%)';
    }
  });
}

// ── NLQ ──────────────────────────────────────────
function openNLQ() {
  document.getElementById('nlq-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('nlq-input').focus(), 50);
}
function closeNLQ() { document.getElementById('nlq-overlay').classList.add('hidden'); }

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('nlq-input');
  if (!input) return;
  let nlqTimer;
  input.addEventListener('input', () => {
    clearTimeout(nlqTimer);
    nlqTimer = setTimeout(async () => {
      const query = input.value.trim();
      if (!query) return;
      const resultsEl = document.getElementById('nlq-results');
      resultsEl.classList.remove('hidden');
      resultsEl.innerHTML = '<p class="text-emerald-900 text-xs uppercase font-bold animate-pulse">Analysing query...</p>';
      try {
        const result = await ApiClient.classifyNLQ(query);
        resultsEl.innerHTML = `
          <p class="text-[10px] text-zinc-500 uppercase font-bold mb-3">Results for: "${query}"</p>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <tr class="text-emerald-900 font-black uppercase text-[9px]"><th>Type</th><th>Value</th><th>Severity</th><th>Class</th></tr>
              ${(result.sample_results || []).map(r => `
                <tr class="border-t border-emerald-900/10">
                  <td class="py-2 px-1">${r.type}</td>
                  <td class="py-2 px-1 font-mono text-emerald-400">${r.value}</td>
                  <td class="py-2 px-1">${r.severity}</td>
                  <td class="py-2 px-1">${r.attack_class || '—'}</td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="text-center py-4 text-zinc-600">No results found</td></tr>'}
            </table>
          </div>
        `;
      } catch (e) {
        resultsEl.innerHTML = `<p class="text-red-500 text-xs font-bold">Query failed: ${e.message}</p>`;
      }
    }, 800);
  });
});

// ── NOTIFICATIONS ─────────────────────────────────
let notifications = [];

async function loadNotifications() {
  // Fetch from API
  notifications = [
    { id: 'n1', type: 'CRITICAL_THREAT', title: 'Critical Alert', message: 'Malicious IP detected in live stream.', read: false, page: 'threat-feed', time: '2 min ago' },
    { id: 'n2', type: 'VALIDATION', title: 'Validation Request', message: 'IoC hash requires your validation.', read: false, page: 'blockchain/contracts', time: '8 min ago' },
    { id: 'n3', type: 'INCIDENT', title: 'Incident Assigned', message: 'You are now lead on INC-2024-001.', read: true, page: 'incidents', time: '15 min ago' },
  ];
  renderNotifications();
  updateNotifBadge();
  
  // New notif every 45s
  setInterval(() => {
    const types = [
      { type: 'CRITICAL_THREAT', title: 'New Critical IoC', message: 'Emerging threat detected.', page: 'threat-feed' },
      { type: 'SLA_WARNING', title: 'SLA Warning', message: 'Incident approaching SLA limit.', page: 'incidents' },
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    notifications.unshift({ id: Date.now(), ...t, read: false, time: 'just now' });
    if (notifications.length > 20) notifications.pop();
    renderNotifications();
    updateNotifBadge();
    showToast(t.title, 'warning');
  }, 45000);
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  const borderColors = {
    CRITICAL_THREAT: 'border-red-500', VALIDATION: 'border-orange-500',
    INCIDENT: 'border-blue-500', SANDBOX: 'border-emerald-500',
    SLA_WARNING: 'border-yellow-500', REPORT: 'border-teal-500',
  };
  list.innerHTML = notifications.map(n => `
    <div class="p-4 border-l-2 ${borderColors[n.type] || 'border-emerald-500'} mx-4 mb-2 bg-black rounded-r cursor-pointer hover:bg-zinc-900" onclick="handleNotifClick('${n.id}', '${n.page}')">
      <div class="flex justify-between items-start">
        <p class="text-[10px] font-black text-${n.read ? 'zinc-500' : 'emerald-400'} uppercase">${n.title}</p>
        ${!n.read ? '<span class="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></span>' : ''}
      </div>
      <p class="text-[9px] text-zinc-600 uppercase mt-1 leading-relaxed">${n.message}</p>
      <p class="text-[8px] text-emerald-950 uppercase mt-1">${n.time}</p>
    </div>
  `).join('');
}

function handleNotifClick(id, page) {
  const notif = notifications.find(n => n.id == id);
  if (notif) notif.read = true;
  updateNotifBadge();
  renderNotifications();
  navigate(page);
  document.getElementById('notif-panel').style.transform = 'translateX(100%)';
}

function updateNotifBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  badge.textContent = unread;
  badge.classList.toggle('hidden', unread === 0);
}

function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  const isOpen = panel.style.transform === 'translateX(0%)';
  panel.style.transform = isOpen ? 'translateX(100%)' : 'translateX(0%)';
}

function markAllRead() {
  notifications.forEach(n => n.read = true);
  renderNotifications();
  updateNotifBadge();
}

// ── WEBSOCKETS ───────────────────────────────────
function initWebSockets() {
  const token = ApiClient.accessToken;
  if (!token) return;
  
  // Dashboard WS
  const dashWS = new WebSocket(`ws://${location.host}/ws/dashboard/?token=${token}`);
  dashWS.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'dashboard_init' && currentPage === 'dashboard') {
      DashboardPage.updateStats(data.data);
    }
    if (data.type === 'threat_timeline_update' && currentPage === 'dashboard') {
      DashboardPage.updateChart(data.data);
    }
  };
  
  // Notification WS
  const notifWS = new WebSocket(`ws://${location.host}/ws/notifications/?token=${token}`);
  notifWS.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'notification') {
      notifications.unshift({ ...data.data, read: false });
      renderNotifications();
      updateNotifBadge();
    }
  };
}
