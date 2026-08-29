const SandboxPage = {
  _pollTimeout: null,
  _abortController: null,

  async render() {
    document.getElementById('page-content').innerHTML = this._skeleton();
    this._abortController = new AbortController();
    try {
      document.getElementById('page-content').innerHTML = this._template();
      this._bindEvents();
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('SandboxPage render failed:', e);
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
    return `<div class="text-red-500 font-mono p-4">Error loading sandbox page: ${message}</div>`;
  },

  _template() {
    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Malware Sandbox</h1>
        <p class="text-zinc-500 font-mono text-sm">Isolated execution and behavioral analysis.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${typeof Components !== 'undefined' && Components.card ? Components.card('Submit Payload', `
          <form id="sandbox-form" class="space-y-4">
            <div>
              <label class="block text-zinc-500 font-mono text-sm mb-2">Environment</label>
              <select name="environment" class="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-emerald-500 font-mono outline-none">
                <option value="win10">Windows 10 x64</option>
                <option value="ubuntu">Ubuntu 22.04 LTS</option>
                <option value="android">Android 13</option>
              </select>
            </div>
            <div>
              <label class="block text-zinc-500 font-mono text-sm mb-2">File Hash (SHA256)</label>
              <input type="text" name="hash" placeholder="e.g. 44d88612fea8a8f36de82e1278abb02f1a23b456c78d9012e345f67890abcdef" class="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-emerald-500 font-mono outline-none">
            </div>
            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors font-mono mt-4">
              Detonate Payload
            </button>
          </form>
        `) : ''}

        <div id="sandbox-results">
          ${typeof Components !== 'undefined' && Components.card ? Components.card('Analysis Results', `
            <div class="flex items-center justify-center h-48 text-zinc-600 font-mono text-sm">
              Waiting for submission...
            </div>
          `) : ''}
        </div>
      </div>
    `;
  },

  async pollJobStatus(jobId, endpoint, onProgress, maxWait = 300000) {
      const startTime = Date.now();
      const pollInterval = 2000;

      return new Promise((resolve, reject) => {
          const poll = async () => {
              if (Date.now() - startTime > maxWait) {
                  reject(new Error('Job timeout after 5 minutes'));
                  return;
              }

              try {
                  const data = await ApiClient._fetch(`${endpoint}${jobId}/`);
                  onProgress?.(data);

                  if (data.status === 'complete') {
                      resolve(data);
                  } else if (data.status === 'failed') {
                      reject(new Error(data.error || 'Job failed'));
                  } else {
                      this._pollTimeout = setTimeout(poll, pollInterval);
                  }
              } catch (e) {
                  if (e.message.includes('Session expired')) {
                      reject(e);
                  } else {
                      this._pollTimeout = setTimeout(poll, pollInterval * 2);
                  }
              }
          };

          this._pollTimeout = setTimeout(poll, pollInterval);
      });
  },

  _bindEvents() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    const form = document.getElementById('sandbox-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
          environment: formData.get('environment'),
          hash: formData.get('hash')
        };

        if (typeof Validator !== 'undefined') {
          const schema = {
            environment: 'required',
            hash: ['required', 'sha256']
          };
          const { valid, errors } = Validator.validate(data, schema);
          if (!valid) {
            Validator.showErrors('sandbox-form', errors);
            return;
          }
        }

        const resultsContainer = document.getElementById('sandbox-results');
        resultsContainer.innerHTML = typeof Components !== 'undefined' && Components.card ? Components.card('Analysis Results', `
          <div class="flex flex-col items-center justify-center h-48 space-y-4">
            <i data-lucide="loader" class="w-8 h-8 text-emerald-500 animate-spin"></i>
            <span class="text-emerald-500 font-mono" id="sandbox-status-text">Provisioning Sandbox VM...</span>
          </div>
        `) : '';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
          const submitRes = await ApiClient.submitSandbox(data);

          const jobResult = await this.pollJobStatus(
            submitRes.id,
            '/sandbox/',
            (prog) => {
              const txt = document.getElementById('sandbox-status-text');
              if (txt) txt.textContent = `Status: ${prog.status}. Progress: ${prog.progress || 0}%`;
            }
          );

          resultsContainer.innerHTML = typeof Components !== 'undefined' && Components.card ? Components.card('Analysis Results', `
            <div class="text-red-500 font-mono mb-4 text-xl font-bold uppercase">Malicious Behavior Detected</div>
            <div class="space-y-2 font-mono text-sm text-zinc-300">
              <p class="text-zinc-500">Threat Class: <span class="text-white">${jobResult.predicted_class || 'Malware'}</span></p>
              <p class="text-zinc-500">Confidence: <span class="text-white">${(jobResult.confidence * 100).toFixed(1)}%</span></p>
              <hr class="border-zinc-800 my-2" />
              <p>• Injected code into explorer.exe</p>
              <p>• Modified registry run keys</p>
              <p>• Communicated with known C2 server</p>
            </div>
          `) : '';

          if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast('Payload detonation complete!', 'success');
          }
        } catch (err) {
          console.error(err);
          resultsContainer.innerHTML = typeof Components !== 'undefined' && Components.card ? Components.card('Analysis Results', `
            <div class="text-red-500 font-mono text-sm">
              Detonation failed: ${err.message}
            </div>
          `) : '';
          if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast(err.message, 'error');
          }
        }
      });
    }
  },

  destroy() {
    if (this._pollTimeout) clearTimeout(this._pollTimeout);
    if (this._abortController) this._abortController.abort();
  }
};
