/**
 * Landing Page interactions (Modals, Cookies, Stats counter)
 */

function openAuthModal(type) {
    const modal = document.getElementById('auth-modal');
    const card = document.getElementById('auth-card');
    
    let html = '';
    if (type === 'login') {
        html = `
            <div class="mb-8">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter mb-2">System Login</h2>
                <p class="text-xs text-zinc-500 font-bold uppercase tracking-wider">Access the CrimeCast Platform</p>
            </div>
            <form onsubmit="handleLogin(event)" class="space-y-4">
                <div>
                    <label class="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Email</label>
                    <input type="email" id="login-email" class="w-full bg-black border border-emerald-900/50 rounded p-2 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none" required value="analyst@cyber.io">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Password</label>
                    <input type="password" id="login-password" class="w-full bg-black border border-emerald-900/50 rounded p-2 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none" required value="demo1234">
                </div>
                <div id="login-error" class="text-red-500 text-xs font-bold hidden mt-2"></div>
                <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase tracking-widest py-3 rounded mt-6 transition-colors">Authenticate</button>
                <button type="button" onclick="closeAuthModal()" class="w-full text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest mt-4">Cancel</button>
            </form>
        `;
    } else {
        html = `
            <div class="mb-8">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter mb-2">Initialize Node</h2>
                <p class="text-xs text-zinc-500 font-bold uppercase tracking-wider">Join the Network</p>
            </div>
            <p class="text-zinc-400 text-sm mb-6">Registration is currently restricted to network validators. Please contact an administrator.</p>
            <button type="button" onclick="closeAuthModal()" class="w-full text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest mt-4">Close</button>
        `;
    }
    
    card.innerHTML = html;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    try {
        const response = await fetch('/api/v1/auth/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('current_user', JSON.stringify(data.user));
            window.location.href = '/app/';
        } else {
            errorEl.textContent = 'Authentication Failed: Invalid credentials';
            errorEl.classList.remove('hidden');
        }
    } catch (err) {
        errorEl.textContent = 'Network error connecting to auth server.';
        errorEl.classList.remove('hidden');
    }
}

function acceptCookies() {
    document.getElementById('cookie-banner').style.display = 'none';
}

function rejectCookies() {
    document.getElementById('cookie-banner').style.display = 'none';
}

function openVideoModal() {
    document.getElementById('video-modal').classList.remove('hidden');
    document.getElementById('video-modal').classList.add('flex');
}

function closeVideoModal() {
    document.getElementById('video-modal').classList.add('hidden');
    document.getElementById('video-modal').classList.remove('flex');
}
