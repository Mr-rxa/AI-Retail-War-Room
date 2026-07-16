/**
 * dashboard.js - dashboard.html only.
 */

(() => {

  let lastExportPayload = null;

  let dashboardFilters = {
    year: '',
    state: '',
    payment: ''
  };

  let pendingFilters = {
    year: '',
    state: '',
    payment: ''
  };

  function setTopbar() {
    if (!Utils.qs('#topbarTitle')) return;
    Utils.qs('#topbarTitle').textContent = 'Dashboard - Executive Overview';
    Utils.qs('#topbarCrumbs').textContent = 'Executive operating view across revenue, demand, risk and business health';
    const actions = Utils.qs('#topbarActions');
    actions.insertAdjacentHTML('beforeend', `
      <button class="btn-outline" id="exportBtn"><i class="bi bi-download"></i>Export Summary</button>
      <span class="pill" id="lastUpdated"><span class="dot"></span>Loading data</span>
      <button class="btn-outline" id="refreshBtn"><i class="bi bi-arrow-clockwise"></i>Refresh</button>
    `);
    Utils.qs('#refreshBtn').addEventListener('click', loadDashboard);
    Utils.qs('#exportBtn').addEventListener('click', exportSummary);
  }

  async function loadDashboard() {
    setLoadingState(true);
    try {
      const [dash, analytics] = await Promise.all([
        API.getDashboard(dashboardFilters),
        API.getAnalyticsSummary()
      ]);

      populateFilterControls(dash.filter_options || {});
      renderFilterSummary();
      renderCommandDeck(dash, analytics);
      renderKpis(dash);
      Charts.renderRevenueChart('revenueChart', dash.monthly_sales || []);
      renderTopCategories(dash.top_categories || []);
      renderTopStates(dash.state_sales || []);
      renderPaymentBreakdown(dash.payment_types || []);
      renderDecisionSnapshot(analytics);
      renderBusinessHealth(analytics.business_health || {});
      renderExecutiveReadout(dash, analytics);
      renderWatchlist(dash, analytics);
      renderDecisionLog(analytics);
      lastExportPayload = buildExportPayload(dash, analytics);

      const lu = Utils.qs('#lastUpdated');
      if (lu) {
        lu.innerHTML = `<span class="dot"></span>Updated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      }
    } catch (err) {
      console.error(err);
      showLoadError(err);
    } finally {
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading) {
    const refreshBtn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');

    if (refreshBtn) {
      refreshBtn.disabled = isLoading;
      refreshBtn.querySelector('i').classList.toggle('spin', isLoading);
    }

    if (exportBtn) exportBtn.disabled = isLoading || !lastExportPayload;
  }

  function showLoadError(err) {
    const banner = Utils.qs('#errorBanner');
    banner.textContent = `Couldn't load dashboard data - ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL}, then retry.`;
    banner.style.display = 'block';
  }

  function setupFilters() {
    const applyBtn = Utils.qs('#applyFiltersBtn');
    const resetBtn = Utils.qs('#resetFiltersBtn');

    applyBtn.addEventListener('click', () => {
      pendingFilters = readFiltersFromDom();
      dashboardFilters = { ...pendingFilters };
      Utils.setGlobalFilters(dashboardFilters);
      Utils.updateScopeBanner(dashboardFilters);
      window.dispatchEvent(new CustomEvent('globalFilters:changed'));
      loadDashboard();
    });

    resetBtn.addEventListener('click', () => {
      dashboardFilters = { year: '', state: '', payment: '' };
      pendingFilters = { ...dashboardFilters };
      Utils.clearGlobalFilters();
      Utils.updateScopeBanner(dashboardFilters);
      window.dispatchEvent(new CustomEvent('globalFilters:changed'));
      applyFiltersToDom();
      loadDashboard();
    });

    ['#yearFilter', '#stateFilter', '#paymentFilter'].forEach((selector) => {
      Utils.qs(selector).addEventListener('change', () => {
        pendingFilters = readFiltersFromDom();
        renderFilterSummary({ pending: true });
      });
    });
  }

  function readFiltersFromDom() {
    return {
      year: Utils.qs('#yearFilter').value,
      state: Utils.qs('#stateFilter').value,
      payment: Utils.qs('#paymentFilter').value
    };
  }

  function applyFiltersToDom() {
    Utils.qs('#yearFilter').value = dashboardFilters.year;
    Utils.qs('#stateFilter').value = dashboardFilters.state;
    Utils.qs('#paymentFilter').value = dashboardFilters.payment;
    pendingFilters = { ...dashboardFilters };
    renderFilterSummary();
  }

  function populateFilterControls(options) {
    fillSelect(Utils.qs('#yearFilter'), options.years || [], {
      emptyLabel: 'All years',
      value: (row) => row.year,
      label: (row) => row.year
    });

    fillSelect(Utils.qs('#stateFilter'), options.states || [], {
      emptyLabel: 'All states',
      value: (row) => row.customer_state,
      label: (row) => `${Utils.stateName(row.customer_state)} (${row.customer_state})`
    });

    fillSelect(Utils.qs('#paymentFilter'), options.payments || [], {
      emptyLabel: 'All payments',
      value: (row) => row.payment_type,
      label: (row) => Utils.paymentLabel(row.payment_type)
    });

    applyFiltersToDom();
  }

  function fillSelect(select, rows, { emptyLabel, value, label }) {
    const current = select.value;
    select.innerHTML = `<option value="">${emptyLabel}</option>`;

    rows.forEach((row) => {
      const option = document.createElement('option');
      option.value = value(row);
      option.textContent = label(row);
      select.appendChild(option);
    });

    select.value = current;
  }

  function renderFilterSummary({ pending = false } = {}) {
    const source = pending ? pendingFilters : dashboardFilters;
    const parts = [];

    if (source.year) parts.push(source.year);
    if (source.state) parts.push(`${Utils.stateName(source.state)} (${source.state})`);
    if (source.payment) parts.push(Utils.paymentLabel(source.payment));

    const text = parts.length ? parts.join(' · ') : 'All retail data';
    Utils.qs('#filterSummary').textContent = pending ? `${text} · pending` : text;

    const heroScope = Utils.qs('#heroScope');
    if (heroScope) heroScope.textContent = text;

    const scope = Utils.qs('#kpiRevenueScope');
    const applied = Object.values(dashboardFilters).some(Boolean);
    if (scope) scope.textContent = applied ? 'Filtered view' : 'All-time';
  }

  function renderCommandDeck(dash, analytics) {
    const health = analytics.business_health || {};
    const forecast = analytics.forecast_summary || {};
    const anomalies = analytics.anomalies || [];
    const criticalCount = anomalies.filter((item) => {
      const severity = String(item.severity || '').toLowerCase();
      return severity === 'critical' || severity === 'high';
    }).length;

    Utils.qs('#heroRange').textContent = describeRange(dash.monthly_sales || []);
    Utils.qs('#heroHealthValue').textContent = `Grade ${health.grade || '-'}`;
    Utils.qs('#heroHealthNote').textContent = `${health.score || 0}/100 business health score`;
    Utils.qs('#heroForecastValue').textContent = forecast.trend || 'Stable';
    Utils.qs('#heroForecastNote').textContent = `${Utils.formatPercent(forecast.change_percent || 0)} projected change over the next 30 days`;
    Utils.qs('#heroRiskValue').textContent = criticalCount ? `${criticalCount} live risks` : 'Controlled';
    Utils.qs('#heroRiskNote').textContent = criticalCount
      ? 'Critical or high-severity anomalies need leadership review'
      : 'No critical spikes flagged by anomaly detection';
    Utils.qs('#heroNarrative').textContent = buildNarrative(dash, analytics);
  }

  function buildNarrative(dash, analytics) {
    const topCategory = dash.top_categories?.[0];
    const topState = dash.state_sales?.[0];
    const forecast = analytics.forecast_summary || {};
    const health = analytics.business_health || {};
    const parts = [];

    if (topCategory) parts.push(`${Utils.categoryLabel(topCategory.category)} is the strongest category`);
    if (topState) parts.push(`${Utils.stateName(topState.customer_state || topState.state)} leads regional revenue`);
    if (forecast.trend) parts.push(`${forecast.trend.toLowerCase()} demand is projected over the next 30 days`);
    if (health.status) parts.push(`overall business health is ${String(health.status).toLowerCase()}`);

    if (!parts.length) return 'Current retail performance is loading.';
    return parts.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.';
  }

  function describeRange(monthlySales) {
    if (!monthlySales.length) return 'No revenue history in the current slice';
    const first = Utils.formatMonthLabel(monthlySales[0].month);
    const last = Utils.formatMonthLabel(monthlySales[monthlySales.length - 1].month);
    return `${first} to ${last}`;
  }

  function renderKpis(dash) {
    Utils.qs('#errorBanner').style.display = 'none';
    const kpis = dash.kpis || {};
    Utils.animateValue(Utils.qs('#kpiRevenue'), parseFloat(kpis.revenue || 0), {
      formatter: (value) => Utils.formatCurrency(value, { compact: true })
    });
    Utils.animateValue(Utils.qs('#kpiOrders'), Number(kpis.orders || 0), {
      formatter: (value) => Utils.formatNumber(value)
    });
    Utils.animateValue(Utils.qs('#kpiCustomers'), Number(kpis.customers || 0), {
      formatter: (value) => `${Utils.formatNumber(value)} customers`
    });
    Utils.animateValue(Utils.qs('#kpiCustomersValue'), Number(kpis.customers || 0), {
      formatter: (value) => Utils.formatNumber(value)
    });
    Utils.animateValue(Utils.qs('#kpiAov'), parseFloat(kpis.average_order_value || 0), {
      formatter: (value) => Utils.formatCurrency(value)
    });
  }

  function renderTopCategories(categories) {
    const tbody = Utils.qs('#topCategoriesBody');
    tbody.innerHTML = '';

    if (!categories.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted);padding:18px 20px;">No category data for the selected filters.</td></tr>';
      return;
    }

    const max = Math.max(...categories.map((row) => parseFloat(row.revenue)));
    categories.slice(0, 8).forEach((row, index) => {
      const pct = (parseFloat(row.revenue) / max) * 100;
      tbody.appendChild(Utils.el('tr', '', `
        <td><span class="rank">${index + 1}</span>${Utils.categoryLabel(row.category)}</td>
        <td class="num bar-cell">${Utils.formatCurrency(parseFloat(row.revenue), { compact: true })}
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></td>
        <td class="num">${row.orders ? Utils.formatNumber(row.orders) : '-'}</td>
      `));
    });
  }

  function renderTopStates(states) {
    const tbody = Utils.qs('#topStatesBody');
    tbody.innerHTML = '';

    if (!states.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted);padding:18px 20px;">No state data for the selected filters.</td></tr>';
      return;
    }

    const max = Math.max(...states.map((row) => parseFloat(row.revenue)));
    states.slice(0, 8).forEach((row, index) => {
      const stateCode = row.customer_state || row.state;
      const pct = (parseFloat(row.revenue) / max) * 100;
      tbody.appendChild(Utils.el('tr', '', `
        <td><span class="rank">${index + 1}</span>${Utils.stateName(stateCode)} <span style="color:var(--text-muted)">(${stateCode})</span></td>
        <td class="num bar-cell">${Utils.formatCurrency(parseFloat(row.revenue), { compact: true })}
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></td>
        <td class="num">${Utils.formatNumber(row.orders)}</td>
      `));
    });
  }

  function renderPaymentBreakdown(paymentBreakdown) {
    if (!paymentBreakdown.length) {
      Charts.clearChart('paymentChart');
      Utils.qs('#paymentLegend').innerHTML = '<div class="legend-sub">No payment data for the selected filters.</div>';
      Utils.qs('#paymentTotalOrders').textContent = '';
      return;
    }

    const { colors } = Charts.renderPaymentChart('paymentChart', paymentBreakdown);
    const total = paymentBreakdown.reduce((sum, row) => sum + row.total, 0);
    const list = Utils.qs('#paymentLegend');
    list.innerHTML = '';

    paymentBreakdown.forEach((row, index) => {
      const pct = ((row.total / total) * 100).toFixed(1);
      list.appendChild(Utils.el('div', 'legend-row', `
        <span class="legend-dot" style="background:${colors[index]}"></span>
        <span class="legend-name">${Utils.paymentLabel(row.payment_type)}</span>
        <span class="legend-value">${pct}%</span>
      `));
    });

    Utils.qs('#paymentTotalOrders').textContent = `${Utils.formatNumber(total)} orders`;
  }

  function renderDecisionSnapshot(analytics) {
    const forecast = analytics.forecast_summary || {};
    const retention = analytics.customer_retention || {};
    const delivery = analytics.delivery_performance || {};
    const anomalies = analytics.anomalies || [];
    const forecastChange = Number(forecast.change_percent || 0);
    const criticalCount = anomalies.filter((item) => {
      const severity = String(item.severity || '').toLowerCase();
      return severity === 'critical' || severity === 'high';
    }).length;
    const opportunityCount = anomalies.filter((item) => String(item.severity || '').toLowerCase() === 'opportunity').length;
    const avgOrders = Number(retention.avg_orders || 0);
    const repeatCustomers = Number(retention.repeat_customers || 0);
    const totalCustomers = Number(retention.total_customers || 0);
    const repeatRate = totalCustomers ? (repeatCustomers / totalCustomers) * 100 : 0;
    const deliveryDays = Number(delivery.avg_delivery_days || 0);

    setSnapshotCard('Forecast', {
      badge: forecastChange >= 5 ? 'Positive' : forecastChange <= -5 ? 'Risk' : 'Watch',
      tone: forecastChange >= 5 ? 'good' : forecastChange <= -5 ? 'danger' : 'neutral',
      value: forecast.trend || 'Stable',
      note: `${Utils.formatPercent(forecastChange)} vs. current run rate`
    });

    setSnapshotCard('Retention', {
      badge: repeatRate >= 12 ? 'Healthy' : repeatRate >= 7 ? 'Watch' : 'Low',
      tone: repeatRate >= 12 ? 'good' : repeatRate >= 7 ? 'neutral' : 'danger',
      value: `${repeatRate.toFixed(1)}%`,
      note: `${Utils.formatNumber(repeatCustomers)} repeat customers, ${avgOrders.toFixed(2)} avg orders per customer`
    });

    setSnapshotCard('Delivery', {
      badge: deliveryDays <= 10 ? 'On track' : deliveryDays <= 14 ? 'Watch' : 'Slow',
      tone: deliveryDays <= 10 ? 'good' : deliveryDays <= 14 ? 'neutral' : 'danger',
      value: deliveryDays ? `${deliveryDays.toFixed(1)} days` : '-',
      note: 'Average delivery lead time across fulfilled orders'
    });

    setSnapshotCard('Risk', {
      badge: criticalCount === 0 ? 'Controlled' : criticalCount <= 2 ? 'Watch' : 'Escalate',
      tone: criticalCount === 0 ? 'good' : criticalCount <= 2 ? 'neutral' : 'danger',
      value: criticalCount ? `${criticalCount} open risks` : 'No critical spikes',
      note: `${opportunityCount} upside signals detected by anomaly engine`
    });
  }

  function setSnapshotCard(name, { badge, tone, value, note }) {
    Utils.qs(`#snapshot${name}Badge`).textContent = badge;
    Utils.qs(`#snapshot${name}Badge`).className = `snapshot-badge ${tone}`;
    Utils.qs(`#snapshot${name}Value`).textContent = value;
    Utils.qs(`#snapshot${name}Note`).textContent = note;
  }

  function renderBusinessHealth(health) {
    Charts.renderHealthRing('healthRingSvg', health.score || 0);
    Utils.qs('#healthScore').textContent = health.score || 0;
    Utils.qs('#healthGrade').textContent = `Grade ${health.grade || '-'} · ${health.status || 'Monitoring'}`;

    const breakdown = Utils.qs('#healthBreakdown');
    breakdown.innerHTML = '';
    (health.breakdown || []).forEach((item) => {
      const pct = item.max ? (item.score / item.max) * 100 : 0;
      breakdown.appendChild(Utils.el('div', 'health-metric', `
        <div class="hm-top"><span>${item.metric}</span><span>${item.score}/${item.max}</span></div>
        <div class="hm-track"><div class="hm-fill" style="width:${pct}%"></div></div>
      `));
    });

    Utils.qs('#healthDeliveryDays').textContent = health.average_delivery_days ? `${health.average_delivery_days.toFixed(1)} days` : '-';
    Utils.qs('#healthRepeatRate').textContent = health.repeat_rate !== undefined ? `${health.repeat_rate.toFixed(2)}%` : '-';
    Utils.qs('#healthAov').textContent = health.average_order_value ? Utils.formatCurrency(health.average_order_value) : '-';
  }

  function renderExecutiveReadout(dash, analytics) {
    const revenueSeries = (dash.monthly_sales || [])
      .map((item) => Number(item.revenue || 0))
      .filter((value) => Number.isFinite(value));
    const forecast = analytics.forecast_summary || {};
    const anomalies = analytics.anomalies || [];
    const currentMonth = revenueSeries[revenueSeries.length - 1] || 0;
    const previousMonth = revenueSeries[revenueSeries.length - 2] || 0;
    const currentQuarter = revenueSeries.slice(-3).reduce((sum, value) => sum + value, 0);
    const previousQuarter = revenueSeries.slice(-6, -3).reduce((sum, value) => sum + value, 0);
    const criticalCount = anomalies.filter((item) => {
      const severity = String(item.severity || '').toLowerCase();
      return severity === 'critical' || severity === 'high';
    }).length;
    const monthDelta = compareValues(currentMonth, previousMonth);
    const quarterDelta = compareValues(currentQuarter, previousQuarter);
    const drivers = buildDriverReadout(dash, analytics);

    Utils.qs('#readoutMomentumValue').textContent = monthDelta.label;
    Utils.qs('#readoutMomentumNote').textContent = `Current month ${Utils.formatCurrency(currentMonth, { compact: true })} versus ${Utils.formatCurrency(previousMonth, { compact: true })} in the previous month.`;

    Utils.qs('#readoutConcentrationValue').textContent = quarterDelta.label;
    Utils.qs('#readoutConcentrationNote').textContent = `Current quarter ${Utils.formatCurrency(currentQuarter, { compact: true })} versus ${Utils.formatCurrency(previousQuarter, { compact: true })} in the previous quarter.`;

    Utils.qs('#readoutOutlookValue').textContent = drivers.headline || (forecast.trend || 'Stable');
    Utils.qs('#readoutOutlookNote').textContent = criticalCount
      ? `${drivers.detail} ${criticalCount} elevated risk signals remain open.`
      : drivers.detail;
  }

  function compareValues(current, previous) {
    if (!previous) {
      return {
        label: Utils.formatCurrency(current, { compact: true }),
        percent: 0
      };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      label: Utils.formatPercent(change),
      percent: change
    };
  }

  function buildDriverReadout(dash, analytics) {
    const aov = Number(dash.kpis?.average_order_value || 0);
    const delivery = Number(analytics.business_health?.average_delivery_days || 0);
    const repeatRate = Number(analytics.business_health?.repeat_rate || 0);
    const forecastChange = Number(analytics.forecast_summary?.change_percent || 0);

    if (forecastChange < -5) {
      return {
        headline: 'Demand softening',
        detail: 'Forward demand is slowing, so order volume is the main short-term pressure on revenue.'
      };
    }
    if (aov < 150) {
      return {
        headline: 'Basket size gap',
        detail: 'Lower average order value is limiting revenue growth even when customer activity is stable.'
      };
    }
    if (delivery > 10) {
      return {
        headline: 'Fulfilment drag',
        detail: 'Longer delivery times can slow retention and reduce forecast confidence.'
      };
    }
    if (repeatRate < 10) {
      return {
        headline: 'Retention gap',
        detail: 'Repeat purchase behaviour remains weak, which reduces the compounding effect of loyal demand.'
      };
    }
    return {
      headline: 'Balanced growth',
      detail: 'Revenue, customer spend and operating performance are moving without one dominant negative driver.'
    };
  }

  function renderWatchlist(dash, analytics) {
    const container = Utils.qs('#watchlistItems');
    const anomalies = analytics.anomalies || [];
    const topCategory = dash.top_categories?.[0];
    const topState = dash.state_sales?.[0];
    const items = [];

    anomalies.slice(0, 2).forEach((anomaly) => {
      items.push({
        title: anomaly.anomaly_type,
        badge: anomaly.severity,
        tone: anomaly.severity.toLowerCase(),
        note: anomaly.recommendation
      });
    });

    if (topCategory) {
      items.push({
        title: `${Utils.categoryLabel(topCategory.category)} demand`,
        badge: 'Monitor',
        tone: 'info',
        note: `Top category contribution is strong; review inventory coverage and promotional support.`
      });
    }

    if (topState) {
      items.push({
        title: `${Utils.stateName(topState.customer_state || topState.state)} execution`,
        badge: 'Review',
        tone: 'medium',
        note: `Top state by revenue should be checked for fulfilment pace and retention quality.`
      });
    }

    container.innerHTML = '';
    items.slice(0, 4).forEach((item) => {
      container.appendChild(Utils.el('div', 'watch-item', `
        <div class="watch-top">
          <div class="watch-title">${item.title}</div>
          <span class="badge ${item.tone}">${item.badge}</span>
        </div>
        <div class="watch-note">${item.note}</div>
      `));
    });
  }

  function renderDecisionLog(analytics) {
    const container = Utils.qs('#decisionLogItems');
    const recs = analytics.recommendations || [];
    const statuses = ['Open', 'In Review', 'Planned'];

    container.innerHTML = '';
    recs.slice(0, 3).forEach((rec, index) => {
      container.appendChild(Utils.el('div', 'decision-item', `
        <div class="decision-top">
          <div class="decision-title">${rec.title}</div>
          <span class="badge ${rec.priority.toLowerCase()}">${statuses[index] || 'Open'}</span>
        </div>
        <div class="decision-note">${rec.action}</div>
        <div class="decision-meta">Priority: ${rec.priority} · Owner: War Room Team</div>
      `));
    });
  }

  function buildExportPayload(dash, analytics) {
    const health = analytics.business_health || {};
    const forecast = analytics.forecast_summary || {};
    const retention = analytics.customer_retention || {};
    const anomalies = analytics.anomalies || [];

    return {
      exported_at: new Date().toISOString(),
      applied_filters: { ...dashboardFilters },
      kpis: dash.kpis,
      business_health: {
        score: health.score,
        grade: health.grade,
        status: health.status,
        average_delivery_days: health.average_delivery_days,
        repeat_rate: health.repeat_rate,
        average_order_value: health.average_order_value
      },
      forecast_summary: {
        trend: forecast.trend,
        change_percent: forecast.change_percent,
        average_forecast: forecast.average_forecast,
        confidence_width: forecast.confidence_width
      },
      customer_retention: retention,
      anomaly_summary: {
        total: anomalies.length,
        critical_or_high: anomalies.filter((item) => {
          const severity = String(item.severity || '').toLowerCase();
          return severity === 'critical' || severity === 'high';
        }).length,
        opportunities: anomalies.filter((item) => String(item.severity || '').toLowerCase() === 'opportunity').length
      },
      top_categories: (dash.top_categories || []).slice(0, 5),
      top_states: (dash.state_sales || []).slice(0, 5)
    };
  }

  function exportSummary() {
    if (!lastExportPayload) return;
    Utils.downloadFile(
      `dashboard_summary_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(lastExportPayload, null, 2),
      'application/json'
    );
  }

  document.addEventListener('DOMContentLoaded', async () => {
    dashboardFilters = Utils.getGlobalFilters();
    pendingFilters = { ...dashboardFilters };
    await Utils.loadLayout();
    Utils.ensureScopeBanner();
    Utils.updateScopeBanner(dashboardFilters);
    setTopbar();
    setupFilters();
    loadDashboard();
  });
})();
