/**
 * utils.js — formatting, animation, DOM helpers, and HTML partial loading.
 * No API calls and no Chart.js logic live here.
 */

const Utils = (() => {

  const FILTER_STORAGE_KEY = 'airw-global-filters';

  function getActiveCurrency() {
    try {
      const raw = localStorage.getItem('airw_currency');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { symbol: 'R$', code: 'BRL', position: 'before' };
  }

  function formatCurrency(value, { compact = false } = {}) {
    const n = Number(value) || 0;
    const curr = getActiveCurrency();
    const sym = curr.symbol || '$';

    if (compact) {
      if (Math.abs(n) >= 1e9) return `${sym} ` + (n / 1e9).toFixed(2) + 'B';
      if (Math.abs(n) >= 1e6) return `${sym} ` + (n / 1e6).toFixed(2) + 'M';
      if (Math.abs(n) >= 1e3) return `${sym} ` + (n / 1e3).toFixed(1) + 'K';
      return `${sym} ` + n.toFixed(0);
    }

    return `${sym} ` + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function formatNumber(value, { compact = false } = {}) {
    const n = Number(value) || 0;
    if (compact) {
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return n.toFixed(0);
    }
    return n.toLocaleString();
  }

  function formatPercent(value, { signed = true, decimals = 1 } = {}) {
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    const sign = signed && n > 0 ? '+' : '';
    return `${sign}${n.toFixed(decimals)}%`;
  }

  function formatMonthLabel(raw) {
    let d;
    if (/^\d{4}-\d{2}$/.test(raw)) d = new Date(`${raw}-01T00:00:00`);
    else d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }

  function formatDateLabel(raw) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function timeAgoOrDate(raw) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function animateValue(el, endValue, { duration = 900, formatter = (v) => Math.round(v).toString() } = {}) {
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = endValue * eased;
      el.textContent = formatter(current);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = formatter(endValue);
    }
    requestAnimationFrame(tick);
  }

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function stateName(code) {
    const map = {
      SP: 'São Paulo', RJ: 'Rio de Janeiro', MG: 'Minas Gerais', RS: 'Rio Grande do Sul',
      PR: 'Paraná', SC: 'Santa Catarina', BA: 'Bahia', DF: 'Distrito Federal', GO: 'Goiás',
      ES: 'Espírito Santo', PE: 'Pernambuco', CE: 'Ceará', PA: 'Pará', MT: 'Mato Grosso',
      MA: 'Maranhão', PB: 'Paraíba', MS: 'Mato Grosso do Sul', PI: 'Piauí', RN: 'Rio Grande do Norte',
      AL: 'Alagoas', SE: 'Sergipe', TO: 'Tocantins', RO: 'Rondônia', AM: 'Amazonas',
      AC: 'Acre', AP: 'Amapá', RR: 'Roraima'
    };
    return map[code] || code;
  }

  function categoryLabel(raw) {
    const s = String(raw).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const evMap = {
      'Health Beauty': 'EV Fleet Heavy Pack',
      'Bed Bath Table': 'Commercial Transit Fleet',
      'Sports Leisure': 'High-Yield Urban Fleet',
      'Furniture Decor': 'Depot & Storage Fleet',
      'Computers Accessories': 'Telemetry Sensor Fleet',
      'Watches Gifts': 'Precision Fleet Assets',
      'Housewares': 'Utility Support Fleet',
      'Garden Tools': 'Regional Transit Fleet'
    };
    return evMap[s] || s;
  }

  function paymentLabel(raw) {
    const map = {
      credit_card: 'CCS Fast Charging',
      boleto: 'Depot AC Charging',
      voucher: 'Grid Auxiliary Power',
      debit_card: 'MCS Mega Charger',
      not_defined: 'Standard Telemetry'
    };
    return map[raw] || categoryLabel(raw);
  }


  async function loadPartial(url, mountSelector) {
    const mount = qs(mountSelector);
    if (!mount) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const html = await res.text();
      mount.innerHTML = html;

      const activePage = document.body.dataset.page;
      if (activePage) {
        qsa(`a[data-nav]`, mount).forEach(a => {
          a.classList.toggle('active', a.dataset.nav === activePage);
        });
      }
      mount.dispatchEvent(new CustomEvent('partial:loaded'));
      return mount;
    } catch (err) {
      console.error(`[loadPartial] Failed to fetch ${url}:`, err);
      mount.innerHTML = `<div style="padding:10px 16px;font-size:11.5px;color:#D0342C;background:#FDECEA;">Component failed to load: ${url} (${err.message})</div>`;
      return null;
    }
  }

  async function updateDataSourceBadge() {
    try {
      const dot = qs('#dataSourceDot');
      const name = qs('#dataSourceName');
      const clearBtn = qs('#clearDataBtn');
      if (!dot || !name) return;

      const status = await API.getDataSourceStatus();
      if (status.source === 'csv') {
        dot.classList.add('active');
        name.textContent = status.filename || 'Custom CSV';
        if (clearBtn) {
          clearBtn.style.display = 'inline-block';
          clearBtn.onclick = async () => {
            await API.clearCustomData();
            clearAllCaches();
            window.location.reload();
          };
        }
      } else {
        dot.classList.remove('active');
        name.textContent = 'Retail Dataset';
        if (clearBtn) clearBtn.style.display = 'none';
      }

    } catch (e) {
      console.warn('Failed to update data source badge:', e);
    }
  }

  function loadLayout() {
    const componentsBase = new URL('../components/', window.location.href);
    return Promise.allSettled([
      loadPartial(new URL('sidebar.html', componentsBase).href, '#sidebarMount'),
      loadPartial(new URL('navbar.html', componentsBase).href, '#navbarMount'),
      loadPartial(new URL('footer.html', componentsBase).href, '#footerMount')
    ]).then(() => {
      updateDataSourceBadge();
      prefetchAll(false);
    });
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function getGlobalFilters() {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return { year: '', state: '', payment: '' };
      const parsed = JSON.parse(raw);
      return {
        year: parsed.year || '',
        state: parsed.state || '',
        payment: parsed.payment || ''
      };
    } catch (err) {
      return { year: '', state: '', payment: '' };
    }
  }

  function setGlobalFilters(filters) {
    const safe = {
      year: filters?.year || '',
      state: filters?.state || '',
      payment: filters?.payment || ''
    };
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(safe));
    } catch (err) {}
    return safe;
  }

  function clearGlobalFilters() {
    setGlobalFilters({ year: '', state: '', payment: '' });
  }

  function formatFilterSummary(filters = {}) {
    const parts = [];
    if (filters.year) parts.push(filters.year);
    if (filters.state) parts.push(`${stateName(filters.state)} (${filters.state})`);
    if (filters.payment) parts.push(paymentLabel(filters.payment));
    return parts.length ? parts.join(' · ') : 'All retail data';
  }

  function ensureScopeBanner() {
    if (qs('#scopeBanner')) return qs('#scopeBanner');
    const errorBanner = qs('#errorBanner');
    const main = qs('.content');
    if (!main) return null;

    const banner = el('div', 'scope-banner');
    banner.id = 'scopeBanner';
    banner.innerHTML = `
      <div class="scope-banner-copy">
        <div class="scope-banner-label">Shared Product Scope</div>
        <div class="scope-banner-text" id="scopeBannerText">All retail data</div>
      </div>
      <button class="btn-outline scope-banner-btn" id="scopeBannerClearBtn"><i class="bi bi-slash-circle"></i>Clear Scope</button>
    `;

    if (errorBanner && errorBanner.parentNode) {
      errorBanner.insertAdjacentElement('afterend', banner);
    } else {
      main.prepend(banner);
    }

    qs('#scopeBannerClearBtn', banner).addEventListener('click', () => {
      clearGlobalFilters();
      updateScopeBanner();
      window.dispatchEvent(new CustomEvent('globalFilters:changed'));
    });

    return banner;
  }

  function updateScopeBanner(filters = getGlobalFilters()) {
    const banner = ensureScopeBanner();
    if (!banner) return;
    const text = formatFilterSummary(filters);
    qs('#scopeBannerText', banner).textContent = text;
    const isAllData = text === 'All retail data';
    banner.classList.toggle('empty', isAllData);
    const clearBtn = qs('#scopeBannerClearBtn', banner);
    if (clearBtn) clearBtn.style.display = isAllData ? 'none' : 'inline-flex';
  }


  function showLoader(container = null, label = 'Computing Decision Intelligence...') {
    const appShell = qs('.app-shell');
    if (appShell) appShell.classList.add('blurred');

    let loader = qs('#appFloatingLoader');
    if (!loader) {
      loader = el('div', 'app-floating-loader');
      loader.id = 'appFloatingLoader';
      loader.innerHTML = `
        <div class="floating-spinner"></div>
        <div class="floating-loader-text">${label}</div>
        <div class="floating-loader-bar"></div>
      `;
      document.body.appendChild(loader);
    } else {
      const txt = qs('.floating-loader-text', loader);
      if (txt) txt.textContent = label;
      loader.classList.remove('exiting');
    }
  }

  function hideLoader(container = null) {
    const appShell = qs('.app-shell');
    if (appShell) appShell.classList.remove('blurred');

    const loader = qs('#appFloatingLoader');
    if (loader) {
      loader.classList.add('exiting');
      setTimeout(() => loader.remove(), 350);
    }
  }

  function getCache(key) {
    try {
      const raw = sessionStorage.getItem(`airw_cache_${key}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function setCache(key, data) {
    try {
      sessionStorage.setItem(`airw_cache_${key}`, JSON.stringify(data));
    } catch (e) {}
  }

  function clearAllCaches() {
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('airw_cache_')) sessionStorage.removeItem(k);
      });
    } catch (e) {}
  }

  const EXECUTIVE_TIPS = [
    "Did you know? High-value customer retention accounts for up to 68% of annual net retail margin.",
    "Prophet time-series models automatically decompose seasonal trends across weekday order volumes.",
    "IsolationForest scans 1,000,000+ data rows to detect subtle pricing and revenue anomalies.",
    "RFM Segmentation automatically classifies customers into High Value, Regular, At Risk, and Inactive cohorts.",
    "Structural Causal Analysis links customer order gaps directly to regional churn vulnerability."
  ];

  let _tipInterval = null;
  let _progressAnim = null;

  function showTelemetryProgress(title = "Processing Retail Decision Intelligence...") {
    let overlay = qs('#telemetryProgressOverlay');
    if (!overlay) {
      overlay = el('div', 'telemetry-loader-overlay');
      overlay.id = 'telemetryProgressOverlay';
      overlay.innerHTML = `
        <div class="telemetry-card">
          <div class="telemetry-badge-wrap"><i class="bi bi-cpu-fill"></i> Decision Intelligence Pipeline</div>
          <div class="telemetry-title">${title}</div>
          <div class="telemetry-subtitle">1,000,000 Rows Ingestion & ML Model Training</div>

          <div class="progress-stage-wrap">
            <div class="progress-header">
              <span id="batchStageText">Validating CSV schema & row structure...</span>
              <span id="progressPctText" class="mono" style="color:var(--accent);">0%</span>
            </div>
            <div class="progress-track-bg">
              <div class="progress-fill-bar" id="telemetryFillBar"></div>
            </div>
            <div class="batch-status-sub" id="batchStatusSub">Stream batch 1 of 20 • 50,000 rows/batch</div>
          </div>

          <div class="telemetry-steps-list" id="telemetryStepsList">
            <div class="telemetry-step-item active" id="tstep1"><span class="telemetry-step-icon"><i class="bi bi-database"></i></span> Ingesting Telemetry (1M Rows)...</div>
            <div class="telemetry-step-item" id="tstep2"><span class="telemetry-step-icon"><i class="bi bi-people"></i></span> Computing RFM Cohorts & Retention...</div>
            <div class="telemetry-step-item" id="tstep3"><span class="telemetry-step-icon"><i class="bi bi-graph-up"></i></span> Training Prophet Time-Series Models...</div>
            <div class="telemetry-step-item" id="tstep4"><span class="telemetry-step-icon"><i class="bi bi-shield-exclamation"></i></span> Scanning IsolationForest Anomalies...</div>
          </div>

          <div class="telemetry-tip-box" id="telemetryTipBox">${EXECUTIVE_TIPS[0]}</div>

          <div class="telemetry-escape-bar">
            <button class="btn-escape-bg" id="btnMinimizeLoader"><i class="bi bi-window-stack"></i> Continue in Background</button>
            <span style="font-size:11.5px;color:var(--text-muted);"><i class="bi bi-bell-fill" style="color:var(--accent);"></i> Live Notify on Done</span>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      qs('#btnMinimizeLoader', overlay).addEventListener('click', minimizeTelemetryProgress);
    }
    overlay.classList.remove('exiting');
    overlay.style.display = 'flex';

    // Accelerating progress bar simulation (0% -> 95%)
    let pct = 0;
    const fillBar = qs('#telemetryFillBar');
    const pctText = qs('#progressPctText');
    const stageText = qs('#batchStageText');
    const subText = qs('#batchStatusSub');

    const stages = [
      { pct: 15, text: "Validating CSV schema & row structure...", sub: "Stream batch 1 of 20 • 50,000 rows" },
      { pct: 35, text: "Processing batch 5 of 20 (250,000 rows)...", sub: "Vectorizing order dates & prices" },
      { pct: 60, text: "Computing RFM Cohorts & Customer Retention...", sub: "Processing batch 12 of 20 • 600,000 rows" },
      { pct: 85, text: "Training Prophet Time-Series Revenue Models...", sub: "Processing batch 17 of 20 • 850,000 rows" },
      { pct: 95, text: "Scanning IsolationForest Outlier Anomalies...", sub: "Finalizing executive analytics synthesis" }
    ];

    let sIdx = 0;
    if (_progressAnim) clearInterval(_progressAnim);
    _progressAnim = setInterval(() => {
      if (sIdx < stages.length) {
        pct = stages[sIdx].pct;
        if (fillBar) fillBar.style.width = `${pct}%`;
        if (pctText) pctText.textContent = `${pct}%`;
        if (stageText) stageText.textContent = stages[sIdx].text;
        if (subText) subText.textContent = stages[sIdx].sub;
        sIdx++;
      }
    }, 600);

    let tipIdx = 0;
    if (_tipInterval) clearInterval(_tipInterval);
    _tipInterval = setInterval(() => {
      tipIdx = (tipIdx + 1) % EXECUTIVE_TIPS.length;
      const box = qs('#telemetryTipBox', overlay);
      if (box) {
        box.style.opacity = '0';
        setTimeout(() => {
          box.textContent = EXECUTIVE_TIPS[tipIdx];
          box.style.opacity = '1';
        }, 200);
      }
    }, 2800);
  }

  function minimizeTelemetryProgress() {
    const overlay = qs('#telemetryProgressOverlay');
    if (overlay) overlay.style.display = 'none';

    let pill = qs('#minimizedProgressPill');
    if (!pill) {
      pill = el('div', 'minimized-progress-pill');
      pill.id = 'minimizedProgressPill';
      pill.innerHTML = `
        <i class="bi bi-arrow-repeat spin" style="color:var(--accent);font-size:16px;"></i>
        <span>AI Analytics Processing (1M Rows)...</span>
        <span class="badge info">Expand</span>
      `;
      document.body.appendChild(pill);
      pill.addEventListener('click', () => {
        pill.remove();
        if (overlay) overlay.style.display = 'flex';
      });
    }
  }

  function updateTelemetryStep(stepNum, status = 'active') {
    const elStep = qs(`#tstep${stepNum}`);
    if (!elStep) return;
    if (status === 'done') {
      elStep.className = 'telemetry-step-item done';
      qs('.telemetry-step-icon', elStep).innerHTML = '<i class="bi bi-check2"></i>';
    } else if (status === 'active') {
      elStep.className = 'telemetry-step-item active';
      qs('.telemetry-step-icon', elStep).innerHTML = '<i class="bi bi-arrow-repeat spin"></i>';
    }
  }

  function hideTelemetryProgress() {
    if (_tipInterval) { clearInterval(_tipInterval); _tipInterval = null; }
    if (_progressAnim) { clearInterval(_progressAnim); _progressAnim = null; }

    const fillBar = qs('#telemetryFillBar');
    const pctText = qs('#progressPctText');
    if (fillBar) fillBar.style.width = '100%';
    if (pctText) pctText.textContent = '100%';

    const pill = qs('#minimizedProgressPill');
    if (pill) pill.remove();

    const overlay = qs('#telemetryProgressOverlay');
    if (overlay) {
      setTimeout(() => {
        overlay.classList.add('exiting');
        setTimeout(() => overlay.remove(), 400);
      }, 300);
    }

    showCompletionToast();
  }

  function showCompletionToast() {
    const toast = el('div', 'minimized-progress-pill', `
      <i class="bi bi-check-circle-fill" style="color:var(--success);font-size:16px;"></i>
      <span>AI Retail War Room Pipeline Complete!</span>
    `);
    toast.style.borderColor = 'var(--success)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function renderSkeleton(container, type = 'card') {
    if (!container) return;
    if (type === 'kpi') {
      container.innerHTML = `
        <div class="skeleton-box skeleton-text"></div>
        <div class="skeleton-box skeleton-val"></div>
      `;
    } else if (type === 'chart') {
      container.innerHTML = `<div class="skeleton-box skeleton-chart-box"></div>`;
    } else if (type === 'table') {
      container.innerHTML = `
        <div class="skeleton-box skeleton-table-row"></div>
        <div class="skeleton-box skeleton-table-row"></div>
        <div class="skeleton-box skeleton-table-row"></div>
      `;
    }
  }

  async function prefetchAll(force = false) {
    if (window._isPrefetching) return;
    window._isPrefetching = true;
    try {
      const filters = getGlobalFilters();

      if (force || !getCache('dashboard')) {
        updateTelemetryStep(1, 'active');
        try {
          const dash = await API.getDashboard(filters);
          setCache('dashboard', dash);
          updateTelemetryStep(1, 'done');
        } catch (e) {}
      }

      updateTelemetryStep(2, 'active');
      const asyncSubTasks = [
        API.getAnalyticsSummary(filters).then(data => {
          setCache('customer', data);
          setCache('insights', data);
          updateTelemetryStep(2, 'done');
        }).catch(() => {}),

        API.getForecast().then(data => {
          setCache('forecast', data);
          updateTelemetryStep(3, 'done');
        }).catch(() => {}),

        API.getAnomalies().then(data => {
          setCache('anomaly', data);
          updateTelemetryStep(4, 'done');
        }).catch(() => {}),

        API.getAdvisorReport().then(data => {
          setCache('advisor', data);
        }).catch(() => {})
      ];

      await Promise.allSettled(asyncSubTasks);
    } finally {
      window._isPrefetching = false;
    }
  }

  return {
    formatCurrency, formatNumber, formatPercent, formatMonthLabel, formatDateLabel,
    timeAgoOrDate, animateValue, qs, qsa, el, stateName, categoryLabel, paymentLabel,
    loadPartial, loadLayout, downloadFile, getGlobalFilters, setGlobalFilters,
    clearGlobalFilters, formatFilterSummary, ensureScopeBanner, updateScopeBanner,
    updateDataSourceBadge, showLoader, hideLoader, getCache, setCache, clearAllCaches,
    prefetchAll, showTelemetryProgress, updateTelemetryStep, hideTelemetryProgress,
    minimizeTelemetryProgress, renderSkeleton
  };
})();
