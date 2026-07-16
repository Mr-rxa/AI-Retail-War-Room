/**
 * insights.js — insights.html only.
 */

(() => {

  let lastAnalytics = null;

  function setTopbar() {
    Utils.qs('#topbarTitle').textContent = 'Insights - Analyst Brief';
    Utils.qs('#topbarCrumbs').textContent = 'Growth opportunities, business drivers and strategic actions';
    const actions = Utils.qs('#topbarActions');
    actions.insertAdjacentHTML('beforeend', `
      <button class="btn-outline" id="exportBtn"><i class="bi bi-download"></i>Export Insights</button>
      <button class="btn-outline" id="refreshBtn"><i class="bi bi-arrow-clockwise"></i>Refresh</button>
    `);
    Utils.qs('#refreshBtn').addEventListener('click', load);
    Utils.qs('#exportBtn').addEventListener('click', exportInsights);
  }

  async function load() {
    const btn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');
    if (btn) { btn.disabled = true; btn.querySelector('i').classList.add('spin'); }
    if (exportBtn) exportBtn.disabled = true;
    try {
      const analytics = await API.getAnalyticsSummary();
      lastAnalytics = analytics;
      Utils.qs('#errorBanner').style.display = 'none';
      renderBrief(analytics);
      renderInsightCards(analytics.insights);
      renderRecommendations(analytics.recommendations);
      Charts.renderGrowthChart('growthChart', analytics.revenue_growth);
      renderGrowthList(analytics.revenue_growth);
      Charts.renderWeekdayChart('weekdayChart', analytics.weekday_revenue);
    } catch (err) {
      console.error(err);
      const banner = Utils.qs('#errorBanner');
      banner.textContent = `Couldn't load insights data — ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL}, then retry.`;
      banner.style.display = 'block';
    } finally {
      if (btn) { btn.disabled = false; btn.querySelector('i').classList.remove('spin'); }
      if (exportBtn) exportBtn.disabled = !lastAnalytics;
    }
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

    Utils.qs('#briefHealthValue').textContent = `${health.score || 0}/100`;
    Utils.qs('#briefHealthNote').textContent = `Grade ${health.grade || '-'} · ${health.status || 'Awaiting status'}`;

    Utils.qs('#briefRetentionValue').textContent = `${repeatRate.toFixed(1)}%`;
    Utils.qs('#briefRetentionNote').textContent = `${Utils.formatNumber(repeatCustomers)} repeat customers across ${Utils.formatNumber(totalCustomers)} customers`;

    Utils.qs('#briefForecastValue').textContent = forecast.trend || 'Stable';
    Utils.qs('#briefForecastNote').textContent = `${Utils.formatPercent(forecast.change_percent || 0)} projected change with ${Utils.formatCurrency(forecast.confidence_width || 0, { compact: true })} confidence width`;

    Utils.qs('#briefRiskValue').textContent = criticalCount ? `${criticalCount} risks` : 'Controlled';
    Utils.qs('#briefRiskNote').textContent = `${opportunityCount} upside signals surfaced by anomaly detection`;
  }

  function renderInsightCards(insights) {
    const grid = Utils.qs('#insightGrid');
    grid.innerHTML = '';
    const iconMap = { success: 'bi-check-circle-fill', info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill' };
    insights.forEach(ins => {
      grid.appendChild(Utils.el('div', `insight-card ${ins.type}`, `
        <div class="ic-top">
          <div class="ic-icon"><i class="bi ${iconMap[ins.type] || 'bi-info-circle-fill'}"></i></div>
          <div class="ic-title">${ins.title}</div>
        </div>
        <div class="ic-msg">${ins.message}</div>
      `));
    });
  }

  function renderRecommendations(recs) {
    const list = Utils.qs('#recList');
    list.innerHTML = '';
    recs.forEach(r => {
      list.appendChild(Utils.el('div', 'rec-item', `
        <div class="ri-top"><span class="ri-title">${r.title}</span><span class="badge ${r.priority.toLowerCase()}">${r.priority}</span></div>
        <div class="ri-action">${r.action}</div>
      `));
    });
  }

  function renderGrowthList(revenueGrowth) {
    const list = Utils.qs('#growthList');
    list.innerHTML = '';
    revenueGrowth.filter(r => r.growth_percent !== null).slice(-8).reverse().forEach(r => {
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
    load();
  });
})();
