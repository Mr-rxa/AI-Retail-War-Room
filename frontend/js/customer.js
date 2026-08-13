/**
 * customer.js - customer.html only.
 */

(() => {

  let lastAnalytics = null;

  function setTopbar() {
    if (Utils.qs('#topbarTitle')) Utils.qs('#topbarTitle').textContent = 'Customer Intelligence — AI Retail War Room';
    if (Utils.qs('#topbarCrumbs')) Utils.qs('#topbarCrumbs').textContent = 'Customer cohort distribution, RFM segmentation, regional churn risk, and retention playbooks';
    const refreshBtn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');
    if (refreshBtn) refreshBtn.onclick = () => load(true);
    if (exportBtn) exportBtn.onclick = exportBrief;
  }

  async function load(forceRefresh = false) {
    const refreshBtn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');

    if (!forceRefresh) {
      const cached = Utils.getCache('customer');
      if (cached) {
        lastAnalytics = cached;
        renderAll(cached);
        if (exportBtn) exportBtn.disabled = false;
        return;
      }
    }

    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.querySelector('i')?.classList.add('spin');
    }
    if (exportBtn) exportBtn.disabled = true;
    Utils.showLoader(Utils.qs('main.content'), 'Computing Customer RFM Segments...');

    try {
      const analytics = await API.getAnalyticsSummary();
      lastAnalytics = analytics;
      Utils.setCache('customer', analytics);
      if (Utils.qs('#errorBanner')) Utils.qs('#errorBanner').style.display = 'none';
      renderAll(analytics);
    } catch (err) {
      console.error(err);
      const banner = Utils.qs('#errorBanner');
      if (banner) {
        banner.textContent = `Couldn't load customer intelligence data - ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL}, then retry.`;
        banner.style.display = 'block';
      }
    } finally {
      Utils.hideLoader(Utils.qs('main.content'));
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.querySelector('i')?.classList.remove('spin');
      }
      if (exportBtn) exportBtn.disabled = !lastAnalytics;
    }
  }

  function renderAll(analytics) {
    renderOverview(analytics.customer_intelligence || {});
    renderSegmentTable(analytics.customer_intelligence?.segments || []);
    renderRecommendations(analytics.customer_intelligence?.recommendations || []);
    renderSegmentLegend(analytics.customer_intelligence?.segments || []);
    Charts.renderRetentionTrendChart('retentionTrendChart', analytics.customer_intelligence?.repeat_vs_new_trend || []);
    Charts.renderSegmentMixChart('segmentMixChart', analytics.customer_intelligence?.segments || []);
    Charts.renderRiskyRegionsChart('riskRegionsChart', analytics.customer_intelligence?.risky_regions || []);
  }

  function renderOverview(customer) {
    if (Utils.qs('#customerHealthScore')) {
      Utils.animateValue(Utils.qs('#customerHealthScore'), Number(customer.customer_health_score || 0), {
        formatter: (value) => value.toFixed(0)
      });
    }
    if (Utils.qs('#customerHealthStatus')) Utils.qs('#customerHealthStatus').textContent = customer.customer_health_status || 'Monitoring';
    if (Utils.qs('#repeatRateValue')) Utils.qs('#repeatRateValue').textContent = `${Number(customer.repeat_rate || 0).toFixed(1)}%`;
    if (Utils.qs('#repeatRateNote')) Utils.qs('#repeatRateNote').textContent = `${Number(customer.high_value_share || 0).toFixed(1)}% high-value share`;
    if (Utils.qs('#orderGapValue')) Utils.qs('#orderGapValue').textContent = `${Number(customer.average_days_between_orders || 0).toFixed(1)} days`;
    if (Utils.qs('#orderGapNote')) Utils.qs('#orderGapNote').textContent = 'Average time between customer orders';
    if (Utils.qs('#riskShareValue')) Utils.qs('#riskShareValue').textContent = `${Number(customer.risk_share || 0).toFixed(1)}%`;
    if (Utils.qs('#riskShareNote')) Utils.qs('#riskShareNote').textContent = 'At-risk and inactive customers in current base';
  }

  function renderSegmentTable(segments) {
    const tbody = Utils.qs('#segmentSummaryBody');
    if (!tbody) return;
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
    if (!legend) return;
    legend.innerHTML = '';
    const tones = { 'High Value': '#34D399', 'Regular': '#60A5FA', 'At Risk': '#F59E0B', 'Inactive': '#F87171' };
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
    if (!container) return;
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
    window.addEventListener('globalFilters:changed', () => {
      Utils.updateScopeBanner();
      load(true);
    });
    load(false);
  });

})();
