/**
 * command.js — ⌘K Spotlight Command Palette
 */

const CommandPalette = (() => {
  const ROUTES = [
    { icon: 'bi-grid-1x2-fill', label: 'Executive Dashboard', path: '/dashboard', keys: ['dashboard', 'overview', 'kpi'] },
    { icon: 'bi-speedometer2', label: 'Fleet Analytics', path: '/customer', keys: ['customer', 'fleet', 'rfm', 'cohort'] },
    { icon: 'bi-diagram-3-fill', label: 'Causal Analysis', path: '/insights', keys: ['insights', 'causal', 'analysis'] },
    { icon: 'bi-sliders', label: 'AI Advisor & Simulation', path: '/advisor', keys: ['advisor', 'ai', 'gemini', 'simulation'] },
    { icon: 'bi-shield-exclamation', label: 'Warranty Intelligence', path: '/anomaly', keys: ['anomaly', 'risk', 'outlier', 'alert'] },
    { icon: 'bi-graph-up-arrow', label: 'Sales & Financial Forecast', path: '/forecast', keys: ['forecast', 'sales', 'prophet'] },
    { icon: 'bi-cloud-upload-fill', label: 'Data Import (CSV)', path: '/upload', keys: ['upload', 'csv', 'import', 'data'] },
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
    if (filteredRoutes[selectedIndex]) {
      window.location.href = filteredRoutes[selectedIndex].path;
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
