const SandboxPage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._template();
    this._bindEvents();
  },

  _template() {
    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Malware Sandbox</h1>
        <p class="text-zinc-500 font-mono text-sm">Isolated execution and behavioral analysis.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${Components.card('Submit Payload', `
          <form id="sandbox-form" class="space-y-4">
            <div>
              <label class="block text-zinc-500 font-mono text-sm mb-2">Environment</label>
              <select class="w-full bg-black border border-emerald-900/20 rounded p-3 text-emerald-500 font-mono outline-none">
                <option>Windows 10 x64</option>
                <option>Ubuntu 22.04 LTS</option>
                <option>Android 13</option>
              </select>
            </div>
            <div>
              <label class="block text-zinc-500 font-mono text-sm mb-2">File Hash (SHA256)</label>
              <input type="text" placeholder="e.g. 44d88612fea8a8f36de82e1278abb02f" class="w-full bg-black border border-emerald-900/20 rounded p-3 text-emerald-500 font-mono outline-none">
            </div>
            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors font-mono mt-4">
              Detonate Payload
            </button>
          </form>
        `)}
        
        <div id="sandbox-results">
          ${Components.card('Analysis Results', `
            <div class="flex items-center justify-center h-48 text-zinc-600 font-mono text-sm">
              Waiting for submission...
            </div>
          `)}
        </div>
      </div>
    `;
  },

  _bindEvents() {
    lucide.createIcons();
    document.getElementById('sandbox-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      document.getElementById('sandbox-results').innerHTML = Components.card('Analysis Results', `
        <div class="flex flex-col items-center justify-center h-48 space-y-4">
          <i class="lucide-loader w-8 h-8 text-emerald-500 animate-spin"></i>
          <span class="text-emerald-500 font-mono">Provisioning VM...</span>
        </div>
      `);
      lucide.createIcons();
      setTimeout(() => {
        document.getElementById('sandbox-results').innerHTML = Components.card('Analysis Results', `
          <div class="text-red-500 font-mono mb-4 text-xl font-bold">Malicious Behavior Detected</div>
          <div class="space-y-2 font-mono text-sm text-zinc-300">
            <p>• Injected code into explorer.exe</p>
            <p>• Modified registry run keys</p>
            <p>• Communicated with known C2 server</p>
          </div>
        `);
      }, 2000);
    });
  }
};
