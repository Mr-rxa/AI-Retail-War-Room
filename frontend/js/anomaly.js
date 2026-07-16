/**
 * anomaly.js — anomaly.html only.
 */

(() => {

  let allAnomalies = [];
  let activeFilter = 'all';

  function setTopbar() {
    Utils.qs('#topbarTitle').textContent = 'Anomalies - Risk Monitor';
    Utils.qs('#topbarCrumbs').textContent = 'Statistically unusual revenue events, business risk and recommended response';
    const actions = Utils.qs('#topbarActions');
    actions.insertAdjacentHTML('beforeend', `<button class="btn-outline" id="refreshBtn"><i class="bi bi-arrow-clockwise"></i>Refresh</button>`);
    Utils.qs('#refreshBtn').addEventListener('click', load);
  }

  function setupFilters() {
    Utils.qsa('.anomaly-filter-bar button').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.anomaly-filter-bar button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        render();
      });
    });
  }

  async function load() {
    const btn = Utils.qs('#refreshBtn');
    if (btn) { btn.disabled = true; btn.querySelector('i').classList.add('spin'); }
    try {
      const data = await API.getAnomalies();
      allAnomalies = data.anomalies || [];
      Utils.qs('#errorBanner').style.display = 'none';
      renderSummary(data.summary || {});
      render();
    } catch (err) {
      console.error(err);
      const banner = Utils.qs('#errorBanner');
      banner.textContent = `Couldn't load anomaly data — ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL}, then retry.`;
      banner.style.display = 'block';
    } finally {
      if (btn) { btn.disabled = false; btn.querySelector('i').classList.remove('spin'); }
    }
  }

  function renderSummary(summary) {
    Utils.qs('#statTotal').textContent = summary.total || 0;
    Utils.qs('#statCritical').textContent = (summary.critical || 0) + (summary.high || 0);
    Utils.qs('#statOpportunity').textContent = summary.opportunity || 0;
  }

  function render() {
    const list = Utils.qs('#anomalyCardList');
    list.innerHTML = '';
    const filtered = activeFilter === 'all'
      ? allAnomalies
      : allAnomalies.filter(a => a.severity.toLowerCase() === activeFilter);

    if (!filtered.length) {
      list.innerHTML = `<div style="text-align:center;padding:50px 20px;color:var(--text-muted);">
        <i class="bi bi-check-circle" style="font-size:28px;display:block;margin-bottom:10px;"></i>
        No anomalies match this filter.</div>`;
      return;
    }

    filtered.forEach(a => {
      const severity = String(a.severity || 'Info').toLowerCase();
      const isRisk = severity === 'critical' || severity === 'high';
      const icon = isRisk ? 'bi-exclamation-triangle-fill' : (severity === 'opportunity' ? 'bi-graph-up-arrow' : 'bi-info-circle-fill');

      list.appendChild(Utils.el('div', `anomaly-card ${severity}`, `
        <div class="ac-icon"><i class="bi ${icon}"></i></div>
        <div style="flex:1;min-width:0;">
          <div class="ac-top">
            <span class="ac-title">${a.anomaly_type}</span>
            <span class="badge ${severity}">${a.severity}</span>
          </div>
          <div class="ac-meta">${Utils.timeAgoOrDate(a.timeline || a.month)} · Metric: ${a.metric} · Value: ${Utils.formatPercent(a.value)}</div>
          <div class="ac-msg" style="margin-top:8px;">${a.message}</div>
          <div class="ac-detail-grid">
            <div class="ac-rec"><i class="bi bi-diagram-3"></i><span><strong>Root cause:</strong> ${a.root_cause || 'Investigate operational drivers for this event.'}</span></div>
            <div class="ac-rec"><i class="bi bi-activity"></i><span><strong>Business impact:</strong> ${a.business_impact || 'Monitor revenue, customer and fulfilment impact.'}</span></div>
            <div class="ac-rec"><i class="bi bi-arrow-return-right"></i><span><strong>Recommendation:</strong> ${a.recommendation}</span></div>
          </div>
          <div class="ac-confidence">Model confidence: ${a.confidence}%</div>
        </div>
      `));
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Utils.loadLayout();
    Utils.ensureScopeBanner();
    Utils.updateScopeBanner();
    setTopbar();
    setupFilters();
    load();
  });
})();
