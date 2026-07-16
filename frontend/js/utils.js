/**
 * utils.js — formatting, animation, DOM helpers, and HTML partial loading.
 * No API calls and no Chart.js logic live here.
 */

const Utils = (() => {

  const FILTER_STORAGE_KEY = 'airw-global-filters';

  function formatCurrency(value, { compact = false } = {}) {
    const n = Number(value) || 0;
    if (compact) {
      if (Math.abs(n) >= 1e9) return 'R$ ' + (n / 1e9).toFixed(2) + 'B';
      if (Math.abs(n) >= 1e6) return 'R$ ' + (n / 1e6).toFixed(2) + 'M';
      if (Math.abs(n) >= 1e3) return 'R$ ' + (n / 1e3).toFixed(1) + 'K';
      return 'R$ ' + n.toFixed(0);
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(n);
  }

  function formatNumber(value, { compact = false } = {}) {
    const n = Number(value) || 0;
    if (compact) {
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return n.toFixed(0);
    }
    return n.toLocaleString('pt-BR');
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
    return String(raw).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function paymentLabel(raw) {
    const map = { credit_card: 'Credit Card', boleto: 'Boleto', voucher: 'Voucher', debit_card: 'Debit Card', not_defined: 'Not Defined' };
    return map[raw] || categoryLabel(raw);
  }

  /**
   * Fetches an HTML partial (navbar/sidebar/footer) and injects it into a mount point.
   * After injection, marks the sidebar link matching data-page on <body> as active,
   * fires 'partial:loaded' on the mount so page scripts can hook in after render.
   */
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

  function loadLayout() {
    const componentsBase = new URL('../components/', window.location.href);
    return Promise.allSettled([
      loadPartial(new URL('sidebar.html', componentsBase).href, '#sidebarMount'),
      loadPartial(new URL('navbar.html', componentsBase).href, '#navbarMount'),
      loadPartial(new URL('footer.html', componentsBase).href, '#footerMount')
    ]);
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
    } catch (err) {
      // Ignore storage failures in constrained browsers.
    }
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
    banner.classList.toggle('empty', text === 'All retail data');
  }

  return {
    formatCurrency, formatNumber, formatPercent, formatMonthLabel, formatDateLabel,
    timeAgoOrDate, animateValue, qs, qsa, el, stateName, categoryLabel, paymentLabel,
    loadPartial, loadLayout, downloadFile, getGlobalFilters, setGlobalFilters,
    clearGlobalFilters, formatFilterSummary, ensureScopeBanner, updateScopeBanner
  };
})();
