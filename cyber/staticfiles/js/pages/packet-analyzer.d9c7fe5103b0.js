const PacketAnalyzerPage = {
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
      console.error('PacketAnalyzer render failed:', e);
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
    return `<div class="text-red-500 font-mono p-4">Error loading packet analyzer: ${message}</div>`;
  },

  _template() {
    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Packet Analyzer</h1>
        <p class="text-zinc-500 font-mono text-sm">Upload PCAP/PCAPNG for ML-powered anomaly detection.</p>
      </div>

      <div class="max-w-2xl mx-auto mt-12 space-y-6">
        <div class="border-2 border-dashed border-emerald-900/40 rounded-xl p-12 text-center bg-zinc-950 hover:border-emerald-500/50 transition-colors cursor-pointer relative" id="upload-zone">
          <input type="file" id="pcap-file-input" accept=".pcap,.pcapng" class="absolute inset-0 opacity-0 cursor-pointer" />
          <div id="upload-prompt">
            <i data-lucide="upload-cloud" class="w-16 h-16 text-emerald-500 mx-auto mb-4"></i>
            <h3 class="text-lg font-bold text-white font-mono mb-2">Drag & Drop or Click to Upload</h3>
            <p class="text-zinc-500 font-mono text-sm">Max size: 50MB. File format: .pcap, .pcapng</p>
          </div>
          <div id="upload-progress-container" class="hidden">
            <div class="w-full bg-zinc-900 rounded-full h-2.5 mb-4">
              <div id="upload-progress-bar" class="bg-emerald-500 h-2.5 rounded-full" style="width: 0%"></div>
            </div>
            <p id="upload-progress-text" class="text-white font-mono text-sm">Uploading: 0%</p>
          </div>
        </div>

        <div id="analysis-status-card" class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl hidden">
          <h3 class="text-white font-mono font-bold mb-2">Analysis Status</h3>
          <p class="text-zinc-400 font-mono text-sm mb-4" id="status-message">Queued for processing...</p>
          <div class="animate-pulse flex space-x-4">
            <div class="flex-1 space-y-4 py-1">
              <div class="h-4 bg-zinc-800 rounded w-3/4"></div>
              <div class="space-y-2">
                <div class="h-4 bg-zinc-800 rounded"></div>
                <div class="h-4 bg-zinc-800 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>

        <div id="analysis-results-container" class="hidden"></div>
      </div>
    `;
  },

  _updateUploadProgress(percent) {
    const bar = document.getElementById('upload-progress-bar');
    const text = document.getElementById('upload-progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `Uploading: ${percent}%`;
  },

  async uploadPCAP(file, config = {}) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('depth', config.depth || 'quick');
        Object.entries(config.modules || {}).forEach(([k, v]) => {
            formData.append(k, v.toString());
        });

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                this._updateUploadProgress(percent);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                try {
                    reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
                } catch {
                    reject(new Error(`Upload failed: HTTP ${xhr.status}`));
                }
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/v1/analyze/packet/');
        xhr.withCredentials = true;
        xhr.setRequestHeader('X-CSRFToken', document.querySelector('meta[name="csrf-token"]')?.content || '');
        xhr.send(formData);
    });
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
    const input = document.getElementById('pcap-file-input');
    if (input) {
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const prompt = document.getElementById('upload-prompt');
        const progressContainer = document.getElementById('upload-progress-container');
        const statusCard = document.getElementById('analysis-status-card');
        const statusMessage = document.getElementById('status-message');

        prompt.classList.add('hidden');
        progressContainer.classList.remove('hidden');

        try {
          const uploadRes = await this.uploadPCAP(file);

          progressContainer.classList.add('hidden');
          statusCard.classList.remove('hidden');
          statusMessage.textContent = 'PCAP uploaded. Analyzing anomalies...';

          const jobResult = await this.pollJobStatus(
            uploadRes.id,
            '/analyze/packet/',
            (prog) => {
              statusMessage.textContent = `Status: ${prog.status}. Progress: ${prog.progress || 0}%`;
            }
          );

          statusCard.classList.add('hidden');
          this._renderResults(jobResult);

          if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast('PCAP Analysis Complete!', 'success');
          }
        } catch (err) {
          console.error(err);
          prompt.classList.remove('hidden');
          progressContainer.classList.add('hidden');
          statusCard.classList.add('hidden');
          if (typeof Components !== 'undefined' && Components.showToast) {
            Components.showToast(err.message, 'error');
          }
        }
      });
    }
  },

  _renderResults(data) {
    const resultsContainer = document.getElementById('analysis-results-container');
    if (!resultsContainer) return;

    resultsContainer.classList.remove('hidden');
    resultsContainer.innerHTML = `
      <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <div class="flex justify-between items-center border-b border-zinc-800 pb-3">
          <h3 class="text-white font-mono font-bold text-lg">Analysis Summary</h3>
          <span class="px-2.5 py-1 text-xs font-mono font-black uppercase rounded ${
            data.threat_level === 'high' ? 'bg-red-950 text-red-500 border border-red-900/30' : 'bg-emerald-950 text-emerald-500 border border-emerald-900/30'
          }">${data.threat_level || 'low'} Risk</span>
        </div>
        <div class="grid grid-cols-2 gap-4 text-sm font-mono">
          <div>
            <p class="text-zinc-500">File Name</p>
            <p class="text-zinc-300">${data.filename || 'packet.pcap'}</p>
          </div>
          <div>
            <p class="text-zinc-500">Total Packets</p>
            <p class="text-zinc-300">${data.packet_count || 0}</p>
          </div>
          <div>
            <p class="text-zinc-500">IPs Detected</p>
            <p class="text-zinc-300">${data.ip_count || 0}</p>
          </div>
          <div>
            <p class="text-zinc-500">Anomalies Detected</p>
            <p class="text-zinc-300">${data.anomaly_count || 0}</p>
          </div>
        </div>
      </div>
    `;
  },

  destroy() {
    if (this._pollTimeout) clearTimeout(this._pollTimeout);
    if (this._abortController) this._abortController.abort();
  }
};
