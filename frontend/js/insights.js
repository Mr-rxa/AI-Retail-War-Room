/**
 * insights.js — insights.html only.
 */

(() => {

  let lastAnalytics = null;

  function setTopbar() {
    if (Utils.qs('#topbarTitle')) Utils.qs('#topbarTitle').textContent = 'Causal Analysis — AI Retail War Room';
    if (Utils.qs('#topbarCrumbs')) Utils.qs('#topbarCrumbs').textContent = 'Cause-and-effect paths, revenue drivers, and automated strategic recommendations';
    const refreshBtn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');
    if (refreshBtn) refreshBtn.onclick = () => load(true);
    if (exportBtn) exportBtn.onclick = exportInsights;
  }

  async function load(forceRefresh = false) {
    const btn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');

    if (!forceRefresh) {
      const cached = Utils.getCache('insights');
      if (cached) {
        lastAnalytics = cached;
        renderAll(cached);
        if (exportBtn) exportBtn.disabled = false;
        return;
      }
    }

    if (btn) { btn.disabled = true; btn.querySelector('i')?.classList.add('spin'); }
    if (exportBtn) exportBtn.disabled = true;
    Utils.showLoader(Utils.qs('main.content'), 'Evaluating Structural Causal Brief...');

    try {
      const analytics = await API.getAnalyticsSummary();
      lastAnalytics = analytics;
      Utils.setCache('insights', analytics);
      if (Utils.qs('#errorBanner')) Utils.qs('#errorBanner').style.display = 'none';
      renderAll(analytics);
    } catch (err) {
      console.error(err);
      const banner = Utils.qs('#errorBanner');
      if (banner) {
        banner.textContent = `Couldn't load insights data — ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL}, then retry.`;
        banner.style.display = 'block';
      }
    } finally {
      Utils.hideLoader(Utils.qs('main.content'));
      if (btn) { btn.disabled = false; btn.querySelector('i')?.classList.remove('spin'); }
      if (exportBtn) exportBtn.disabled = !lastAnalytics;
    }
  }

  function renderAll(analytics) {
    renderBrief(analytics);
    renderInsightCards(analytics.insights || []);
    renderRecommendations(analytics.recommendations || []);
    Charts.renderGrowthChart('growthChart', analytics.revenue_growth || []);
    renderGrowthList(analytics.revenue_growth || []);
    Charts.renderWeekdayChart('weekdayChart', analytics.weekday_revenue || []);
  }

  function renderBrief(analytics) {
    const health = analytics.business_health || {};
    const retention = analytics.customer_retention || {};
    const forecast = analytics.forecast_summary || {};
    const anomalies = analytics.anomalies || [];
    const repeatCustomers = Number(retention.repeat_customers || 0);
    const totalCustomers = Number(retention.total_customers || 0);
    const repeatRate = totalCustomers ? (repeatCustomers / totalCustomers) * 100 : 0;
    const criticalCount = anomalies.filter((item) => {
      const severity = String(item.severity || '').toLowerCase();
      return severity === 'critical' || severity === 'high';
    }).length;
    const opportunityCount = anomalies.filter((item) => String(item.severity || '').toLowerCase() === 'opportunity').length;

    if (Utils.qs('#briefHealthValue')) Utils.qs('#briefHealthValue').textContent = `${health.score || 0}/100`;
    if (Utils.qs('#briefHealthNote')) Utils.qs('#briefHealthNote').textContent = `Grade ${health.grade || '-'} · ${health.status || 'Awaiting status'}`;
    if (Utils.qs('#briefRetentionValue')) Utils.qs('#briefRetentionValue').textContent = `${repeatRate.toFixed(1)}%`;
    if (Utils.qs('#briefRetentionNote')) Utils.qs('#briefRetentionNote').textContent = `${Utils.formatNumber(repeatCustomers)} repeat customers across ${Utils.formatNumber(totalCustomers)} customers`;
    if (Utils.qs('#briefForecastValue')) Utils.qs('#briefForecastValue').textContent = forecast.trend || 'Stable';
    if (Utils.qs('#briefForecastNote')) Utils.qs('#briefForecastNote').textContent = `${Utils.formatPercent(forecast.change_percent || 0)} projected change`;
    if (Utils.qs('#briefRiskValue')) Utils.qs('#briefRiskValue').textContent = criticalCount ? `${criticalCount} risks` : 'Controlled';
    if (Utils.qs('#briefRiskNote')) Utils.qs('#briefRiskNote').textContent = `${opportunityCount} upside signals surfaced`;
  }

  function renderInsightCards(insights = []) {
    const grid = Utils.qs('#insightGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const iconMap = { success: 'bi-check-circle-fill', info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill' };
    (insights || []).forEach(ins => {
      grid.appendChild(Utils.el('div', `insight-card ${ins.type}`, `
        <div class="ic-top">
          <div class="ic-icon"><i class="bi ${iconMap[ins.type] || 'bi-info-circle-fill'}"></i></div>
          <div class="ic-title">${ins.title}</div>
        </div>
        <div class="ic-msg">${ins.message}</div>
      `));
    });
  }

  function renderRecommendations(recs = []) {
    const list = Utils.qs('#recList');
    if (!list) return;
    list.innerHTML = '';
    (recs || []).forEach(r => {
      list.appendChild(Utils.el('div', 'rec-item', `
        <div class="ri-top"><span class="ri-title">${r.title}</span><span class="badge ${String(r.priority || 'info').toLowerCase()}">${r.priority}</span></div>
        <div class="ri-action">${r.action}</div>
      `));
    });
  }

  function renderGrowthList(revenueGrowth = []) {
    const list = Utils.qs('#growthList');
    if (!list) return;
    list.innerHTML = '';
    (revenueGrowth || []).filter(r => r.growth_percent !== null).slice(-8).reverse().forEach(r => {
      const val = parseFloat(r.growth_percent);
      list.appendChild(Utils.el('div', 'growth-row', `
        <span class="gr-month">${Utils.formatMonthLabel(r.month)}</span>
        <span class="gr-value ${val >= 0 ? 'up' : 'down'}">${Utils.formatPercent(val)}</span>
      `));
    });
  }

  function exportInsights() {
    if (!lastAnalytics) return;
    const payload = {
      exported_at: new Date().toISOString(),
      business_health: lastAnalytics.business_health,
      customer_retention: lastAnalytics.customer_retention,
      forecast_summary: lastAnalytics.forecast_summary,
      anomalies: (lastAnalytics.anomalies || []).slice(0, 10),
      insights: lastAnalytics.insights,
      recommendations: lastAnalytics.recommendations,
      revenue_growth: (lastAnalytics.revenue_growth || []).slice(-12),
      weekday_revenue: lastAnalytics.weekday_revenue
    };
    Utils.downloadFile(`insights_summary_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Utils.loadLayout();
    Utils.ensureScopeBanner();
    Utils.updateScopeBanner();
    setTopbar();
    window.addEventListener('globalFilters:changed', () => {
      Utils.updateScopeBanner();
      load(true);
    });
    load(false);
  });
})();
