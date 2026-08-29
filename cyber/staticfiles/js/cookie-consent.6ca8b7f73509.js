/**
 * Cookie Consent Banner — GDPR compliance
 * Checks localStorage for prior consent, shows banner after 1.5s delay.
 * Accept/reject stores decision in localStorage; reject clears tracking cookies.
 */

const COOKIE_KEY = 'crimecast_cookie_consent';

function getConsent() {
  try {
    const stored = localStorage.getItem(COOKIE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function hasConsented() {
  const consent = getConsent();
  return consent?.decision === 'accept';
}

function hasRejected() {
  const consent = getConsent();
  return consent?.decision === 'reject';
}

function hasMadeChoice() {
  return getConsent() !== null;
}

function showCookieBanner() {
  const existing = document.getElementById('cookie-consent-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'cookie-consent-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.setAttribute('aria-live', 'polite');
  banner.className = 'fixed bottom-0 left-0 right-0 z-[1000] bg-zinc-950 border-t border-emerald-900/30 shadow-2xl';
  banner.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-start gap-3 flex-1">
          <span class="text-emerald-500 text-lg mt-0.5 flex-shrink-0">🍪</span>
          <div>
            <p class="text-xs font-bold text-white">
              We use cookies to improve your experience and for security purposes.
            </p>
            <p class="text-[10px] text-zinc-500 mt-0.5">
              Essential cookies keep you logged in securely.
              <button id="cookie-consent-details-btn" class="text-emerald-500 underline hover:text-emerald-400 focus:outline-none">
                Learn more
              </button>
              ·
              <a href="/privacy/" class="text-emerald-500 underline hover:text-emerald-400">Privacy Policy</a>
              ·
              <a href="/cookies/" class="text-emerald-500 underline hover:text-emerald-400">Cookie Policy</a>
            </p>
          </div>
        </div>
        <div class="flex gap-3 flex-shrink-0">
          <button id="cookie-consent-reject" class="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-emerald-900/50 text-zinc-400 hover:border-emerald-500 hover:text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500">
            Reject All
          </button>
          <button id="cookie-consent-accept" class="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-black rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95">
            Accept All
          </button>
        </div>
      </div>
      <div id="cookie-consent-details" class="hidden mt-4 pt-4 border-t border-emerald-900/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-3 bg-black/40 rounded-lg">
          <p class="text-[10px] font-black text-emerald-500 uppercase mb-1">✓ Essential (Always Active)</p>
          <p class="text-[10px] text-zinc-500">Authentication cookies (access_token, refresh_token, csrftoken). Required for login and security. Cannot be disabled.</p>
        </div>
        <div class="p-3 bg-black/40 rounded-lg">
          <p class="text-[10px] font-black text-zinc-600 uppercase mb-1">✗ Analytics (Rejected)</p>
          <p class="text-[10px] text-zinc-500">We currently do not use analytics cookies. Future analytics will require your explicit consent.</p>
        </div>
        <div class="p-3 bg-black/40 rounded-lg">
          <p class="text-[10px] font-black text-zinc-600 uppercase mb-1">✗ Marketing (None)</p>
          <p class="text-[10px] text-zinc-500">CrimeCast does not use marketing or advertising cookies. No third-party tracking.</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  const detailsBtn = document.getElementById('cookie-consent-details-btn');
  const details = document.getElementById('cookie-consent-details');
  detailsBtn.addEventListener('click', () => {
    const isHidden = details.classList.contains('hidden');
    details.classList.toggle('hidden');
    detailsBtn.textContent = isHidden ? 'Hide details' : 'Learn more';
  });

  document.getElementById('cookie-consent-accept').addEventListener('click', () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({
      decision: 'accept',
      timestamp: new Date().toISOString(),
      version: '1.0',
    }));
    banner.remove();
  });

  document.getElementById('cookie-consent-reject').addEventListener('click', () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({
      decision: 'reject',
      timestamp: new Date().toISOString(),
      version: '1.0',
    }));
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (!['access_token', 'refresh_token', 'ws_token', 'csrftoken'].includes(name)) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    banner.remove();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (hasMadeChoice()) return;
  setTimeout(showCookieBanner, 1500);
});