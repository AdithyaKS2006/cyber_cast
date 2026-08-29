/**
 * Main app controller — handles routing, sidebar, auth state
 */

// ── STATE ──────────────────────────────────────
let currentPage = 'dashboard';
let sidebarCollapsed = false;
let mobileNavOpen = false;
let user = ApiClient.currentUser;
let theme = localStorage.getItem('theme') || 'dark';

// ── MENU CONFIG ─────────────────────────────────
const MENU_CONFIG = [
  { group: 'COMMAND', items: [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard', roles: ['analyst','validator','administrator'] },
    { id: 'threat-feed', icon: 'activity', label: 'Threat Feed', roles: ['analyst','validator','administrator'] },
    { id: 'analyzer/packet', icon: 'zap', label: 'Packet Analyzer', roles: ['analyst','administrator'] },
    { id: 'analyzer/sandbox', icon: 'microscope', label: 'Sandbox', roles: ['analyst','administrator'] },
    { id: 'compliance/engine', icon: 'shield-check', label: 'Compliance Engine', roles: ['validator','administrator'] },
    { id: 'guru', icon: 'message-square', label: 'Cyber Guru', roles: ['analyst','validator','administrator'] },
    { id: 'safety-scout', icon: 'globe', label: 'Safety Scout', roles: ['analyst','validator','administrator'] },
  ]},
  { group: 'AI & ML', items: [
    { id: 'ai/autohunt', icon: 'search-code', label: 'AutoHunt', roles: ['analyst','administrator'] },
    { id: 'ai/threat-scoring', icon: 'target', label: 'Threat Scoring', roles: ['administrator'] },
    { id: 'analytics/correlations', icon: 'git-merge', label: 'Correlation Engine', roles: ['analyst','validator','administrator'] },
  ]},
  { group: 'BLOCKCHAIN', items: [
    { id: 'blockchain/explorer', icon: 'database', label: 'Explorer', roles: ['validator','administrator'] },
    { id: 'blockchain/contracts', icon: 'file-code', label: 'Contracts', roles: ['validator','administrator'] },
    { id: 'blockchain/reputation', icon: 'trophy', label: 'Reputation', roles: ['validator','administrator'] },
    { id: 'blockchain/evidence-vault', icon: 'hard-drive', label: 'Evidence Vault', roles: ['validator','administrator'] },
    { id: 'blockchain/governance', icon: 'gavel', label: 'Governance', roles: ['validator','administrator'] },
    { id: 'blockchain/audit-log', icon: 'history', label: 'Audit Log', roles: ['administrator'] },
  ]},
  { group: 'NETWORK', items: [
    { id: 'network', icon: 'network', label: 'Network Map', roles: ['analyst','validator','administrator'] },
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
    { id: 'analytics/map', icon: 'globe', label: 'Threat Map', roles: ['analyst','validator','administrator'] },
    { id: 'reports/builder', icon: 'file-text', label: 'Report Builder', roles: ['analyst','validator','administrator'] },
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
    { id: 'profile/skills', icon: 'award', label: 'Skills', roles: ['analyst','validator','administrator'] },
  ]},
];

// PAGE → COMPONENT MAPPING
// Only routes with a defined page module are wired here.
// Routes without an implementation fall through to "Page not yet implemented".
const PAGE_LOADERS = {
  'dashboard': () => DashboardPage.render(),
  'threat-feed': () => ThreatFeedPage.render(),
  'analyzer/packet': () => PacketAnalyzerPage.render(),
  'analyzer/sandbox': () => SandboxPage.render(),
  'compliance/engine': () => ComplianceEnginePage.render(),
  'guru': () => CyberGuruPage.render(),
  'safety-scout': () => {},
  'analytics/map': () => ThreatMapPage.render(),
  'analytics/correlations': () => CorrelationPage.render(),
  'reports/builder': () => ReportBuilderPage.render(),
  'network': () => NetworkPage.render(),
  'blockchain/explorer': () => BlockchainPage.render(),
  'incidents': () => IncidentsPage.render(),
  'playbooks': () => {},
  'hunt': () => {},
  'shifts': () => ShiftsPage.render(),
  'analytics': async () => {
      // Lazy load Chart.js only when analytics page opens
      if (typeof Chart === 'undefined') {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js');
      }
      AnalyticsPage.render();
  },
  'admin/users': () => AdminPage.render(),
  'admin/system': () => AdminSystemPage.render(),
  'admin/api-keys': () => AdminPage.render(),
  'admin/ml-models': () => AdminMLModelsPage.render(),
  'integrations': () => IntegrationsPage.render(),
  'api-docs': () => ApiDocsPage.render(),
  'profile': () => ProfilePage.render(),
  'profile/skills': () => ProfileSkillsTab.render(),
};

async function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

const PAGE_ROLES = {
  'blockchain/explorer': ['validator','administrator'],
  'blockchain/contracts': ['validator','administrator'],
  'blockchain/reputation': ['validator','administrator'],
  'blockchain/evidence-vault': ['validator','administrator'],
  'blockchain/governance': ['validator','administrator'],
  'blockchain/audit-log': ['administrator'],
  'compliance/engine': ['validator','administrator'],
  'ai/threat-scoring': ['administrator'],
  'analytics/map': ['analyst','validator','administrator'],
  'analytics/correlations': ['analyst','validator','administrator'],
  'reports/builder': ['analyst','validator','administrator'],
  'network': ['analyst','validator','administrator'],
  'shifts': ['analyst','validator','administrator'],
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
  WS.init();
  initKeyboardShortcuts();
  loadNotifications();
});

// ── NAVIGATION ──────────────────────────────────
function navigate(page) {
  // Cleanup current page - destroy any active intervals, charts, or listeners
  // Only reference page modules that are actually loaded (see PAGE_LOADERS)
  if (typeof DashboardPage !== 'undefined' && currentPage === 'dashboard') DashboardPage.destroy?.();
  if (typeof ThreatFeedPage !== 'undefined' && currentPage === 'threat-feed') ThreatFeedPage.destroy?.();
  if (typeof PacketAnalyzerPage !== 'undefined' && currentPage === 'analyzer/packet') PacketAnalyzerPage.destroy?.();
  if (typeof SandboxPage !== 'undefined' && currentPage === 'analyzer/sandbox') SandboxPage.destroy?.();
  if (typeof ComplianceEnginePage !== 'undefined' && currentPage === 'compliance/engine') ComplianceEnginePage.destroy?.();
  if (typeof CyberGuruPage !== 'undefined' && currentPage === 'guru') CyberGuruPage.destroy?.();
  if (typeof ThreatMapPage !== 'undefined' && currentPage === 'analytics/map') ThreatMapPage.destroy?.();
  if (typeof CorrelationPage !== 'undefined' && currentPage === 'analytics/correlations') CorrelationPage.destroy?.();
  if (typeof ReportBuilderPage !== 'undefined' && currentPage === 'reports/builder') ReportBuilderPage.destroy?.();
  if (typeof NetworkPage !== 'undefined' && currentPage === 'network') NetworkPage.destroy?.();
  if (typeof BlockchainPage !== 'undefined' && currentPage === 'blockchain/explorer') BlockchainPage.destroy?.();
  if (typeof IncidentsPage !== 'undefined' && currentPage === 'incidents') IncidentsPage.destroy?.();
  if (typeof ShiftsPage !== 'undefined' && currentPage === 'shifts') ShiftsPage.destroy?.();
  if (typeof AnalyticsPage !== 'undefined' && currentPage === 'analytics') AnalyticsPage.destroy?.();
  if (typeof AdminPage !== 'undefined' && ['admin/users', 'admin/api-keys'].includes(currentPage)) AdminPage.destroy?.();
  if (typeof AdminSystemPage !== 'undefined' && currentPage === 'admin/system') AdminSystemPage.destroy?.();
  if (typeof AdminMLModelsPage !== 'undefined' && currentPage === 'admin/ml-models') AdminMLModelsPage.destroy?.();
  if (typeof IntegrationsPage !== 'undefined' && currentPage === 'integrations') IntegrationsPage.destroy?.();
  if (typeof ApiDocsPage !== 'undefined' && currentPage === 'api-docs') ApiDocsPage.destroy?.();
  if (typeof ProfilePage !== 'undefined' && currentPage === 'profile') ProfilePage.destroy?.();
  if (typeof ProfileSkillsTab !== 'undefined' && currentPage === 'profile/skills') ProfileSkillsTab.destroy?.();

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
  const mobileAvatar = document.getElementById('mobile-nav-avatar');
  const mobileUsername = document.getElementById('mobile-nav-username');
  const mobileRole = document.getElementById('mobile-nav-role');
  nav.innerHTML = '';
  mobileNav.innerHTML = '';

  if (mobileAvatar) {
    mobileAvatar.textContent = user?.avatar || user?.name?.substring(0, 2).toUpperCase() || '??';
  }
  if (mobileUsername) {
    mobileUsername.textContent = user?.name || user?.email || 'ANONYMOUS';
  }
  if (mobileRole) {
    mobileRole.textContent = (user?.role || 'ANALYST').toUpperCase();
  }

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
  const toggleBtn = document.getElementById('sidebar-toggle');
  if (sidebarCollapsed) {
    sidebar.style.width = '64px';
    document.querySelectorAll('.sidebar-label').forEach(el => el.classList.add('hidden'));
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
  } else {
    sidebar.style.width = '256px';
    document.querySelectorAll('.sidebar-label').forEach(el => el.classList.remove('hidden'));
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
  }
}

function openMobileNav() {
  mobileNavOpen = true;
  const overlay = document.getElementById('mobile-nav-overlay');
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  overlay.setAttribute('aria-hidden', 'false');
  const menuBtn = document.getElementById('mobile-nav-btn');
  if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
  const closeBtn = overlay.querySelector('button[aria-label="Close navigation"]');
  if (closeBtn) closeBtn.focus();
}

function closeMobileNav() {
  mobileNavOpen = false;
  const overlay = document.getElementById('mobile-nav-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = '';
  document.body.style.overflow = '';
  overlay.setAttribute('aria-hidden', 'true');
  const menuBtn = document.getElementById('mobile-nav-btn');
  if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
}

// ── HEADER ──────────────────────────────────────
function updateHeader() {
  document.getElementById('header-username').textContent = user?.name || 'ANONYMOUS';
  document.getElementById('header-role').textContent = user?.role?.toUpperCase() || 'ANALYST';
  document.getElementById('header-avatar').textContent = user?.avatar || '??';
  const menuBtn = document.getElementById('mobile-nav-btn');
  if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
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
function logout() {
    if (typeof WS !== 'undefined' && WS.destroy) WS.destroy();
    if (notifInterval) clearInterval(notifInterval);
    ApiClient.logout();
}

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
      if (mobileNavOpen) closeMobileNav();
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
let notifInterval = null;

async function loadNotifications() {
  // Fetch from API
  notifications = [
    { id: 'n1', type: 'CRITICAL_THREAT', title: 'Critical Alert', message: 'Malicious IP detected in live stream.', read: false, page: 'threat-feed', time: '2 min ago' },
    { id: 'n2', type: 'VALIDATION', title: 'Validation Request', message: 'IoC hash requires your validation.', read: false, page: 'blockchain/contracts', time: '8 min ago' },
    { id: 'n3', type: 'INCIDENT', title: 'Incident Assigned', message: 'You are now lead on INC-2024-001.', read: true, page: 'incidents', time: '15 min ago' },
  ];
  renderNotifications();
  updateNotifBadge();
  
  if (notifInterval) clearInterval(notifInterval);
  
  // New notif every 45s
  notifInterval = setInterval(() => {
    const types = [
      { type: 'CRITICAL_THREAT', title: 'New Critical IoC', message: 'Emerging threat detected.', page: 'threat-feed' },
      { type: 'SLA_WARNING', title: 'SLA Warning', message: 'Incident approaching SLA limit.', page: 'incidents' },
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    notifications.unshift({ id: Date.now(), ...t, read: false, time: 'just now' });
    if (notifications.length > 20) notifications.pop();
    renderNotifications();
    updateNotifBadge();
    if (typeof Components !== 'undefined' && Components.showToast) {
      Components.showToast(t.title, 'warning');
    }
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


