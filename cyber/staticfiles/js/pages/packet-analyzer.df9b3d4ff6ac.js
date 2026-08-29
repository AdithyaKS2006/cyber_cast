const PacketAnalyzerPage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._template();
    this._bindEvents();
  },

  _template() {
    return `
      <div class="mb-6">
        <h1 class="text-3xl font-bold font-mono text-white mb-2">Packet Analyzer</h1>
        <p class="text-zinc-500 font-mono text-sm">Upload PCAP/PCAPNG for ML-powered anomaly detection.</p>
      </div>

      <div class="max-w-2xl mx-auto mt-12">
        <div class="border-2 border-dashed border-emerald-900/40 rounded-xl p-12 text-center bg-zinc-950 hover:border-emerald-500/50 transition-colors cursor-pointer" id="upload-zone">
          <i class="lucide-upload-cloud w-16 h-16 text-emerald-500 mx-auto mb-4"></i>
          <h3 class="text-lg font-bold text-white font-mono mb-2">Drop PCAP file here</h3>
          <p class="text-zinc-500 font-mono text-sm">Max size: 50MB. Analysis takes ~30 seconds.</p>
        </div>
      </div>
    `;
  },

  _bindEvents() {
    lucide.createIcons();
    const zone = document.getElementById('upload-zone');
    if(zone) {
      zone.addEventListener('click', () => {
        Components.showToast('PCAP upload simulated. Check Analytics for results.');
      });
    }
  }
};
