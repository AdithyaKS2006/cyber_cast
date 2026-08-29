const Validator = {
    rules: {
        required: (val) => val !== null && val !== undefined && val.toString().trim() !== '' || 'This field is required',
        email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email address',
        minLength: (min) => (val) => val.length >= min || `Minimum ${min} characters required`,
        maxLength: (max) => (val) => val.length <= max || `Maximum ${max} characters allowed`,
        sha256: (val) => /^[a-fA-F0-9]{64}$/.test(val) || 'Must be a valid SHA-256 hash (64 hex characters)',
        ip: (val) => /^(\d{1,3}\.){3}\d{1,3}$/.test(val) || 'Invalid IP address format',
        url: (val) => { try { new URL(val); return true; } catch { return 'Invalid URL format'; }},
        password: (val) => val.length >= 8 || 'Password must be at least 8 characters',
    },
    
    validate(data, schema) {
        const errors = {};
        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            for (const rule of (Array.isArray(rules) ? rules : [rules])) {
                const check = typeof rule === 'function' ? rule(value) : this.rules[rule]?.(value);
                if (check !== true && check !== undefined) {
                    errors[field] = check;
                    break;
                }
            }
        }
        return { valid: Object.keys(errors).length === 0, errors };
    },
    
    showErrors(formId, errors) {
        // Clear existing errors
        document.querySelectorAll(`#${formId} .field-error`).forEach(el => el.remove());
        document.querySelectorAll(`#${formId} .border-red-500`).forEach(el => {
            el.classList.remove('border-red-500');
        });
        
        for (const [field, message] of Object.entries(errors)) {
            const input = document.querySelector(`#${formId} [name="${field}"]`);
            if (input) {
                input.classList.add('border-red-500');
                const error = document.createElement('p');
                error.className = 'field-error text-red-500 text-[9px] font-bold uppercase mt-1';
                error.textContent = message;
                input.parentNode.insertBefore(error, input.nextSibling);
            }
        }
    },
};

const ChartLoader = {
    _loaded: false,
    
    async load() {
        if (this._loaded && typeof Chart !== 'undefined') return;
        if (typeof Chart !== 'undefined') { this._loaded = true; return; }
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
            script.onload = () => { this._loaded = true; resolve(); };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    async loadD3() {
        if (typeof d3 !== 'undefined') return;
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://d3js.org/d3.v7.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    createChart(ctx, config) {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded. Call ChartLoader.load() first.');
            return null;
        }
        return new Chart(ctx, config);
    },
};

// ── Global Error Handling ──────────────────────────────────────────────────

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (event.reason?.message) {
        if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast(`Error: ${event.reason.message}`, 'error');
        }
    }
    // Report to backend
    if (typeof ApiClient !== 'undefined') {
        ApiClient._fetch('/core/client-error/', {
            method: 'POST',
            body: {
                error: event.reason?.message || String(event.reason),
                stack: event.reason?.stack || '',
                page: typeof currentPage !== 'undefined' ? currentPage : 'unknown',
                timestamp: new Date().toISOString(),
            },
        }).catch(() => {});
    }
});

window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
    if (event.error?.message) {
        if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast(`JavaScript Error: ${event.error.message}`, 'error');
        }
    }
});

