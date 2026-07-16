/**
 * customer.js - customer.html only.
 */

(() => {

  let lastAnalytics = null;

  function setTopbar() {
    Utils.qs('#topbarTitle').textContent = 'Customer Intelligence - Retention Center';
    Utils.qs('#topbarCrumbs').textContent = 'Customer health, loyalty watch and churn-risk signals';
    const actions = Utils.qs('#topbarActions');
    actions.insertAdjacentHTML('beforeend', `
      <button class="btn-outline" id="exportBtn"><i class="bi bi-download"></i>Export Customer Brief</button>
      <button class="btn-outline" id="refreshBtn"><i class="bi bi-arrow-clockwise"></i>Refresh</button>
    `);
    Utils.qs('#refreshBtn').addEventListener('click', load);
    Utils.qs('#exportBtn').addEventListener('click', exportBrief);
  }

  async function load() {
    const refreshBtn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.querySelector('i').classList.add('spin');
    }
    if (exportBtn) exportBtn.disabled = true;

    try {
      const analytics = await API.getAnalyticsSummary();
      lastAnalytics = analytics;
      Utils.qs('#errorBanner').style.display = 'none';
      renderOverview(analytics.customer_intelligence || {});
      renderSegmentTable(analytics.customer_intelligence?.segments || []);
      renderRecommendations(analytics.customer_intelligence?.recommendations || []);
      renderSegmentLegend(analytics.customer_intelligence?.segments || []);
      Charts.renderRetentionTrendChart('retentionTrendChart', analytics.customer_intelligence?.repeat_vs_new_trend || []);
      Charts.renderSegmentMixChart('segmentMixChart', analytics.customer_intelligence?.segments || []);
      Charts.renderRiskyRegionsChart('riskRegionsChart', analytics.customer_intelligence?.risky_regions || []);
    } catch (err) {
      console.error(err);
      const banner = Utils.qs('#errorBanner');
      banner.textContent = `Couldn't load customer intelligence data - ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL}, then retry.`;
      banner.style.display = 'block';
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.querySelector('i').classList.remove('spin');
      }
      if (exportBtn) exportBtn.disabled = !lastAnalytics;
    }
  }

  function renderOverview(customer) {
    Utils.animateValue(Utils.qs('#customerHealthScore'), Number(customer.customer_health_score || 0), {
      formatter: (value) => value.toFixed(0)
    });
    Utils.qs('#customerHealthStatus').textContent = customer.customer_health_status || 'Monitoring';

    Utils.qs('#repeatRateValue').textContent = `${Number(customer.repeat_rate || 0).toFixed(1)}%`;
    Utils.qs('#repeatRateNote').textContent = `${Number(customer.high_value_share || 0).toFixed(1)}% of customers are in the high-value segment`;

    Utils.qs('#orderGapValue').textContent = `${Number(customer.average_days_between_orders || 0).toFixed(1)} days`;
    Utils.qs('#orderGapNote').textContent = 'Average time between customer orders';

    Utils.qs('#riskShareValue').textContent = `${Number(customer.risk_share || 0).toFixed(1)}%`;
    Utils.qs('#riskShareNote').textContent = 'At-risk and inactive customers in the current customer base';
  }

  function renderSegmentTable(segments) {
    const tbody = Utils.qs('#segmentSummaryBody');
    tbody.innerHTML = '';
    if (!segments.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-muted);padding:18px 20px;">No customer segment data available.</td></tr>';
      return;
    }

    segments.forEach((segment) => {
      tbody.appendChild(Utils.el('tr', '', `
        <td>${segment.segment}</td>
        <td class="num">${Utils.formatNumber(segment.customers)}</td>
        <td class="num">${Utils.formatCurrency(segment.revenue, { compact: true })}</td>
        <td class="num">${Number(segment.average_orders || 0).toFixed(2)}</td>
      `));
    });
  }

  function renderSegmentLegend(segments) {
    const legend = Utils.qs('#segmentLegend');
    legend.innerHTML = '';
    const tones = {
      'High Value': '#34D399',
      'Regular': '#60A5FA',
      'At Risk': '#F59E0B',
      'Inactive': '#F87171'
    };

    segments.forEach((segment) => {
      legend.appendChild(Utils.el('div', 'legend-row', `
        <span class="legend-dot" style="background:${tones[segment.segment] || '#8EA0BB'}"></span>
        <span class="legend-name">${segment.segment}</span>
        <span class="legend-value">${Utils.formatNumber(segment.customers)}</span>
      `));
    });
  }

  function renderRecommendations(recommendations) {
    const container = Utils.qs('#customerRecommendations');
    container.innerHTML = '';
    recommendations.forEach((item) => {
      container.appendChild(Utils.el('div', 'customer-rec-card', `
        <div class="customer-rec-head">
          <div class="customer-rec-title">${item.title}</div>
          <span class="badge info">${item.focus}</span>
        </div>
        <div class="customer-rec-body">${item.action}</div>
      `));
    });
  }

  function exportBrief() {
    if (!lastAnalytics) return;
    Utils.downloadFile(
      `customer_intelligence_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(lastAnalytics.customer_intelligence || {}, null, 2),
      'application/json'
    );
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Utils.loadLayout();
    Utils.ensureScopeBanner();
    Utils.updateScopeBanner();
    setTopbar();
    load();
  });
})();
