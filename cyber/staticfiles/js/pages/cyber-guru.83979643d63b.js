const CyberGuruPage = {
  async render() {
    document.getElementById('page-content').innerHTML = this._template();
    this._bindEvents();
  },

  _template() {
    return `
      <div class="h-[calc(100vh-100px)] flex gap-4">
        <!-- Sidebar -->
        <div class="w-64 bg-zinc-950 border border-emerald-900/20 rounded-xl p-4 flex flex-col">
          <button id="btn-new-chat" class="w-full bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-500 border border-emerald-500/50 py-2 rounded font-mono text-sm mb-4 transition-colors">
            + New Analysis
          </button>
          <div class="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-2">Recent Sessions</div>
          <div class="flex-1 overflow-y-auto space-y-2" id="chat-sessions-list">
            <div class="text-zinc-600 text-sm font-mono italic">Loading sessions...</div>
          </div>
        </div>

        <!-- Chat Area -->
        <div class="flex-1 bg-zinc-950 border border-emerald-900/20 rounded-xl flex flex-col">
          <div class="p-4 border-b border-emerald-900/20 flex items-center">
            <i class="lucide-bot text-emerald-500 mr-3"></i>
            <div>
              <h2 class="text-lg font-bold text-white font-mono">Cyber Guru AI</h2>
              <p class="text-xs text-zinc-500 font-mono">Gemini Context-Aware Analysis</p>
            </div>
          </div>
          
          <div id="chat-messages" class="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-6">
            <div class="flex gap-4 max-w-3xl">
              <div class="w-8 h-8 rounded bg-emerald-900/30 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <i class="lucide-bot text-emerald-500 w-4 h-4"></i>
              </div>
              <div class="pt-1 text-zinc-300">
                Greetings analyst. I am Cyber Guru. Provide an IoC, PCAP hash, or describe an anomalous behavior, and I will cross-reference it against MITRE ATT&CK and our internal intelligence graph.
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-emerald-900/20">
            <form id="chat-form" class="flex gap-2">
              <input type="text" id="chat-input" placeholder="Analyze this payload behavior..." class="flex-1 bg-black border border-emerald-900/20 rounded-lg p-3 text-emerald-500 font-mono text-sm outline-none focus:border-emerald-500 transition-colors" autocomplete="off" required>
              <button type="submit" class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold font-mono transition-colors">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  _bindEvents() {
    lucide.createIcons();
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const msgs = document.getElementById('chat-messages');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if(!text) return;
      
      input.value = '';
      
      // User message
      msgs.insertAdjacentHTML('beforeend', `
        <div class="flex gap-4 max-w-3xl ml-auto flex-row-reverse">
          <div class="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-600">
            <i class="lucide-user text-zinc-400 w-4 h-4"></i>
          </div>
          <div class="pt-1 text-emerald-400 bg-emerald-900/10 p-3 rounded-lg border border-emerald-900/30">
            ${text}
          </div>
        </div>
      `);
      msgs.scrollTop = msgs.scrollHeight;

      // Loading bubble
      const loadId = 'msg-' + Date.now();
      msgs.insertAdjacentHTML('beforeend', `
        <div id="${loadId}" class="flex gap-4 max-w-3xl">
          <div class="w-8 h-8 rounded bg-emerald-900/30 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <i class="lucide-bot text-emerald-500 w-4 h-4 animate-pulse"></i>
          </div>
          <div class="pt-1 text-zinc-500 animate-pulse">Analyzing...</div>
        </div>
      `);
      msgs.scrollTop = msgs.scrollHeight;
      lucide.createIcons();

      try {
        const res = await ApiClient.post('/guru/query/', { query: text });
        document.getElementById(loadId).innerHTML = `
          <div class="w-8 h-8 rounded bg-emerald-900/30 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <i class="lucide-bot text-emerald-500 w-4 h-4"></i>
          </div>
          <div class="pt-1 text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
            ${res.response.replace(/\n/g, '<br>')}
          </div>
        `;
        lucide.createIcons();
      } catch (err) {
        document.getElementById(loadId).innerHTML = `<div class="text-red-500">Error: ${err.message}</div>`;
      }
      msgs.scrollTop = msgs.scrollHeight;
    });
  }
};
