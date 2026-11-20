/**
 * customer.js - Customer Intelligence & Predictive Loyalty 360
 */

(() => {

  let lastAnalytics = null;
  let allCustomers = [];
  let currentFilter = 'ALL';
  let searchQuery = '';

  function setTopbar() {
    if (Utils.qs('#topbarTitle')) Utils.qs('#topbarTitle').textContent = 'Customer Intelligence & Loyalty 360 — AI Retail War Room';
    if (Utils.qs('#topbarCrumbs')) Utils.qs('#topbarCrumbs').textContent = 'Predictive churn risk, 8-tier RFM loyalty classification, and multi-month cohort retention';
    const refreshBtn = Utils.qs('#refreshBtn');
    if (refreshBtn) refreshBtn.onclick = () => load(true);
  }

  async function load(forceRefresh = false) {
    const refreshBtn = Utils.qs('#refreshBtn');

    if (!forceRefresh) {
      const cached = Utils.getCache('customer');
      if (cached) {
        lastAnalytics = cached;
        renderAll(cached);
        return;
      }
    }

    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.querySelector('i')?.classList.add('spin');
    }
    Utils.showLoader(Utils.qs('main.content'), 'Computing Predictive Customer RFM & Cohorts...');

    try {
      const filters = Utils.getGlobalFilters();
      const analytics = await API.getAnalyticsSummary(filters);
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
    }
  }

  function renderAll(analytics) {
    const ci = analytics.customer_intelligence || {};
    allCustomers = ci.customer_directory || [];

    renderOverview(ci);
    renderSegmentTable(ci.segments || []);
    renderRecommendations(ci.recommendations || []);
    renderSegmentLegend(ci.segments || []);
    renderCohortMatrix(ci.cohort_matrix || []);
    renderCustomerDirectory();

    Charts.renderRetentionTrendChart('retentionTrendChart', ci.repeat_vs_new_trend || []);
    Charts.renderSegmentMixChart('segmentMixChart', ci.segments || []);
    Charts.renderRiskyRegionsChart('riskRegionsChart', ci.risky_regions || []);
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

  // Render Cohort Retention Heatmap Matrix
  function renderCohortMatrix(cohorts) {
    const tbody = Utils.qs('#cohortMatrixBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!cohorts || !cohorts.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted);">No cohort retention data available.</td></tr>';
      return;
    }

    cohorts.forEach(row => {
      const tr = document.createElement('tr');
      const pMap = {};
      (row.periods || []).forEach(p => { pMap[p.period] = p.rate; });

      let cellsHtml = `
        <td class="cohort-label"><strong>${row.cohort}</strong></td>
        <td style="font-weight:600;">${Number(row.cohort_size).toLocaleString()}</td>
      `;

      for (let i = 0; i <= 6; i++) {
        const key = `M${i}`;
        const val = pMap[key];
        if (val !== undefined) {
          const intensity = Math.min(val / 100.0, 1.0);
          const bg = i === 0 ? 'rgba(56, 189, 248, 0.25)' : `rgba(16, 185, 129, ${Math.max(0.08, intensity * 0.9)})`;
          const textCol = i === 0 ? '#38BDF8' : (intensity > 0.12 ? '#10B981' : 'var(--text-muted)');
          cellsHtml += `<td class="cohort-cell" style="background:${bg};color:${textCol};">${val.toFixed(1)}%</td>`;
        } else {
          cellsHtml += `<td style="color:rgba(255,255,255,0.1);">-</td>`;
        }
      }

      tr.innerHTML = cellsHtml;
      tbody.appendChild(tr);
    });
  }

  // Render Customer 360 Directory Table
  function renderCustomerDirectory() {
    const tbody = Utils.qs('#customerDirectoryBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = allCustomers.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = c.customer_id.toLowerCase().includes(q);
        const matchState = c.state.toLowerCase().includes(q);
        if (!matchId && !matchState) return false;
      }

      if (currentFilter === 'LOYAL') {
        return c.loyalty_tier === 'Champions' || c.loyalty_tier === 'Loyal Customers';
      } else if (currentFilter === 'POTENTIAL') {
        return c.loyalty_tier === 'Potential Loyalists' || c.loyalty_tier === 'Promising';
      } else if (currentFilter === 'CHURN_RISK') {
        return c.churn_probability >= 70;
      }
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No customers match the active filter or search criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.slice(0, 40).map(c => {
      const churnColor = c.churn_probability >= 70 ? '#EF4444' : (c.churn_probability >= 40 ? '#F59E0B' : '#10B981');
      return `
        <tr>
          <td><span style="font-family:monospace;font-weight:600;color:var(--text);">${c.customer_id}</span></td>
          <td><span class="badge muted">${c.state}</span></td>
          <td class="num">${c.orders}</td>
          <td class="num">${Utils.formatCurrency(c.total_spend)}</td>
          <td class="num">${c.days_inactive}d ago</td>
          <td>
            <span class="loyalty-badge-pill" style="background:${c.loyalty_color}22;color:${c.loyalty_color};border:1px solid ${c.loyalty_color}44;">
              <span style="width:6px;height:6px;border-radius:50%;background:${c.loyalty_color};display:inline-block;"></span>
              ${c.loyalty_tier}
            </span>
          </td>
          <td>
            <div class="churn-bar-wrap">
              <div class="churn-bar-fill" style="width:${c.churn_probability}%;background:${churnColor};"></div>
            </div>
            <strong style="color:${churnColor};font-size:11.5px;">${c.churn_probability}%</strong>
          </td>
          <td class="num" style="font-weight:600;color:var(--accent);">${Utils.formatCurrency(c.ltv)}</td>
        </tr>
      `;
    }).join('');

    if (filtered.length > 40) {
      tbody.innerHTML += `<tr><td colspan="8" style="text-align:center;padding:10px;color:var(--text-muted);font-style:italic;">Showing top 40 of ${filtered.length} customers. Export CRM CSV for complete cohort list.</td></tr>`;
    }
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

  function setupEventListeners() {
    // Filter Pills
    Utils.qsa('#tierFilterBar .filter-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        Utils.qsa('#tierFilterBar .filter-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter || 'ALL';
        renderCustomerDirectory();
      });
    });

    // Search Input
    Utils.qs('#customerSearchInput')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderCustomerDirectory();
    });

    // Export Customer CRM CSV
    Utils.qs('#exportCustomerCsvBtn')?.addEventListener('click', () => {
      if (!allCustomers || !allCustomers.length) {
        alert('No customer records available to export.');
        return;
      }
      Utils.downloadCsv(
        `customer_crm_segment_${new Date().toISOString().slice(0, 10)}.csv`,
        allCustomers
      );
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Utils.loadLayout();
    Utils.ensureScopeBanner();
    Utils.updateScopeBanner();
    setTopbar();
    setupEventListeners();
    window.addEventListener('globalFilters:changed', () => {
      Utils.updateScopeBanner();
      load(true);
    });
    load(false);
  });

})();
