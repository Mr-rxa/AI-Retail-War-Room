/**
 * command.js — ⌘K Spotlight Command Palette
 */

const CommandPalette = (() => {
  const ROUTES = [
    { icon: 'bi-grid-1x2-fill', label: 'Executive Dashboard (3D Bento)', path: '/dashboard', keys: ['dashboard', 'overview', 'kpi', 'bento', 'globe', '3d'] },
    { icon: 'bi-chat-square-dots-fill', label: 'Ask Data AI (Talk to Your Data)', path: '/chat', keys: ['chat', 'nlp', 'ask', 'ai', 'copilot', 'rag', 'query'] },
    { icon: 'bi-sliders2', label: 'What-If Modeler (Simulation Lab)', path: '/scenario', keys: ['scenario', 'whatif', 'simulate', 'price', 'elasticity', 'margin'] },
    { icon: 'bi-speedometer2', label: 'Customer Intelligence (RFM)', path: '/customer', keys: ['customer', 'rfm', 'cohort', 'dna', 'buyers'] },
    { icon: 'bi-diagram-3-fill', label: 'Causal Driver Analysis', path: '/insights', keys: ['insights', 'causal', 'analysis', 'drivers'] },
    { icon: 'bi-cpu-fill', label: 'AI Strategic Advisor Lab', path: '/advisor', keys: ['advisor', 'ai', 'gemini', 'strategy'] },
    { icon: 'bi-shield-exclamation', label: 'IsolationForest Anomaly Scanner', path: '/anomaly', keys: ['anomaly', 'risk', 'outlier', 'alert', 'fraud'] },
    { icon: 'bi-graph-up-arrow', label: 'Sales & Financial Forecast (Prophet)', path: '/forecast', keys: ['forecast', 'sales', 'prophet', 'predict'] },
    { icon: 'bi-cloud-upload-fill', label: 'Data Import (100MB CSV)', path: '/upload', keys: ['upload', 'csv', 'import', 'data'] },
    { icon: 'bi-moon-stars-fill', label: 'Toggle Dark / Light Theme (⌘T)', action: () => ThemeManager.toggle(), keys: ['dark', 'light', 'theme', 'mode'] },
    { icon: 'bi-easel-fill', label: 'Launch Presentation Mode (P)', action: () => PresentationMode.enterPresentation(), keys: ['present', 'demo', 'pitch', 'slide', 'presentation'] },
    { icon: 'bi-file-earmark-pdf-fill', label: 'Export Executive Dossier PDF', action: () => ReportExporter.exportExecutivePdf(), keys: ['pdf', 'export', 'download', 'report'] }
  ];

  let overlay = null;
  let selectedIndex = 0;
  let filteredRoutes = [...ROUTES];

  function buildDOM() {
    overlay = document.createElement('div');
    overlay.className = 'cmd-overlay';
    overlay.innerHTML = `
      <div class="cmd-box">
        <div class="cmd-header">
          <i class="bi bi-search"></i>
          <input type="text" class="cmd-input" placeholder="Type a command or page name..." id="cmdInput" autocomplete="off">
          <kbd class="cmd-shortcut">ESC</kbd>
        </div>
        <ul class="cmd-list" id="cmdList"></ul>
        <div class="cmd-footer">
          <span>Navigate <kbd class="cmd-shortcut">↑</kbd> <kbd class="cmd-shortcut">↓</kbd></span>
          <span>Select <kbd class="cmd-shortcut">↵</kbd></span>
          <span>Close <kbd class="cmd-shortcut">ESC</kbd></span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#cmdInput');
    input.addEventListener('input', (e) => filter(e.target.value));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && isOpen()) {
        close();
      } else if (isOpen()) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          executeSelected();
        }
      }
    });
  }

  function isOpen() {
    return overlay && overlay.classList.contains('open');
  }

  function toggle() {
    isOpen() ? close() : open();
  }

  function open() {
    if (!overlay) buildDOM();
    filteredRoutes = [...ROUTES];
    selectedIndex = 0;
    renderList();
    overlay.classList.add('open');
    setTimeout(() => overlay.querySelector('#cmdInput').focus(), 50);
  }

  function close() {
    if (overlay) overlay.classList.remove('open');
  }

  function filter(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      filteredRoutes = [...ROUTES];
    } else {
      filteredRoutes = ROUTES.filter(r =>
        r.label.toLowerCase().includes(q) ||
        r.keys.some(k => k.includes(q))
      );
    }
    selectedIndex = 0;
    renderList();
  }

  function renderList() {
    const list = overlay.querySelector('#cmdList');
    if (!filteredRoutes.length) {
      list.innerHTML = `<li style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">No commands matching search</li>`;
      return;
    }
    list.innerHTML = filteredRoutes.map((r, i) => `
      <li>
        <a href="${r.path}" class="cmd-item ${i === selectedIndex ? 'active' : ''}">
          <div class="cmd-item-left">
            <i class="bi ${r.icon}"></i>
            <span class="cmd-item-title">${r.label}</span>
          </div>
          <kbd class="cmd-shortcut">↵</kbd>
        </a>
      </li>
    `).join('');
  }

  function moveSelection(delta) {
    if (!filteredRoutes.length) return;
    selectedIndex = (selectedIndex + delta + filteredRoutes.length) % filteredRoutes.length;
    renderList();
  }

  function executeSelected() {
    const item = filteredRoutes[selectedIndex];
    if (!item) return;
    if (typeof item.action === 'function') {
      close();
      item.action();
    } else if (item.path) {
      window.location.href = item.path;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Attach listener to any topbar hint buttons
    document.addEventListener('click', e => {
      if (e.target.closest('#topbarCmdBtn')) open();
    });
  });

  return { open, close, toggle };
})();
