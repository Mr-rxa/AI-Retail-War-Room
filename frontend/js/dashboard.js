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
    if (Utils.qs('#topbarTitle')) Utils.qs('#topbarTitle').textContent = 'Executive Dashboard — AI Retail War Room';
    if (Utils.qs('#topbarCrumbs')) Utils.qs('#topbarCrumbs').textContent = 'Executive operating view across revenue, demand, customer intelligence and forecasting';
    const refreshBtn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');
    if (refreshBtn) refreshBtn.onclick = loadDashboard;
    if (exportBtn) exportBtn.onclick = exportSummary;
  }

  async function loadDashboard(forceRefresh = false) {
    const hasActiveFilters = Object.values(dashboardFilters).some(Boolean);
    if (!forceRefresh && !hasActiveFilters) {
      const cached = Utils.getCache('dashboard');
      if (cached) {
        const analytics = cached.analytics || {};
        populateFilterControls(cached.filter_options || {});
        renderFilterSummary();
        renderCommandDeck(cached, analytics);
        renderKpis(cached);
        Charts.renderRevenueChart('revenueChart', cached.monthly_sales || []);
        renderTopCategories(cached.top_categories || []);
        renderPaymentBreakdown(cached.payment_types || []);
        renderBusinessHealth(analytics.business_health || {});
        renderDashboardInsights(analytics.insights || []);
        lastExportPayload = buildExportPayload(cached, analytics);
        const lu = Utils.qs('#lastUpdated');
        if (lu) lu.innerHTML = `<span class="dot"></span>Updated (Cached)`;
        return;
      }
    }

    setLoadingState(true);
    Utils.showLoader(null, 'Filtering Retail Telemetry...');

    try {
      const dash = await API.getDashboard(dashboardFilters);
      const analytics = dash.analytics || {};

      if (!hasActiveFilters) {
        Utils.setCache('dashboard', dash);
      }
      populateFilterControls(dash.filter_options || {});
      renderFilterSummary();
      renderCommandDeck(dash, analytics);
      renderKpis(dash);
      Charts.renderRevenueChart('revenueChart', dash.monthly_sales || []);
      renderTopCategories(dash.top_categories || []);
      renderPaymentBreakdown(dash.payment_types || []);
      renderBusinessHealth(analytics.business_health || {});
      renderDashboardInsights(analytics.insights || []);
      lastExportPayload = buildExportPayload(dash, analytics);

      const lu = Utils.qs('#lastUpdated');
      if (lu) {
        lu.innerHTML = `<span class="dot"></span>Updated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      }
    } catch (err) {
      console.error(err);
      showLoadError(err);
    } finally {
      Utils.hideLoader();
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading) {
    const refreshBtn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');

    if (refreshBtn) {
      refreshBtn.disabled = isLoading;
      refreshBtn.querySelector('i')?.classList.toggle('spin', isLoading);
    }

    if (exportBtn) exportBtn.disabled = isLoading || !lastExportPayload;
  }

  function showLoadError(err) {
    const banner = Utils.qs('#errorBanner');
    if (banner) {
      banner.textContent = `Couldn't load dashboard data - ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL}, then retry.`;
      banner.style.display = 'block';
    }
  }

  function setupFilters() {
    const applyBtn = Utils.qs('#applyFiltersBtn');
    const resetBtn = Utils.qs('#resetFiltersBtn');

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        pendingFilters = readFiltersFromDom();
        dashboardFilters = { ...pendingFilters };
        Utils.setGlobalFilters(dashboardFilters);
        Utils.updateScopeBanner(dashboardFilters);
        window.dispatchEvent(new CustomEvent('globalFilters:changed'));
        loadDashboard(true);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        dashboardFilters = { year: '', state: '', payment: '' };
        pendingFilters = { ...dashboardFilters };
        Utils.clearGlobalFilters();
        Utils.updateScopeBanner(dashboardFilters);
        window.dispatchEvent(new CustomEvent('globalFilters:changed'));
        applyFiltersToDom();
        loadDashboard(true);
      });
    }

    ['#yearFilter', '#stateFilter', '#paymentFilter'].forEach((selector) => {
      const el = Utils.qs(selector);
      if (el) {
        el.addEventListener('change', () => {
          pendingFilters = readFiltersFromDom();
          renderFilterSummary({ pending: true });
        });
      }
    });
  }

  function readFiltersFromDom() {
    return {
      year: Utils.qs('#yearFilter')?.value || '',
      state: Utils.qs('#stateFilter')?.value || '',
      payment: Utils.qs('#paymentFilter')?.value || ''
    };
  }

  function applyFiltersToDom() {
    if (Utils.qs('#yearFilter')) Utils.qs('#yearFilter').value = dashboardFilters.year || '';
    if (Utils.qs('#stateFilter')) Utils.qs('#stateFilter').value = dashboardFilters.state || '';
    if (Utils.qs('#paymentFilter')) Utils.qs('#paymentFilter').value = dashboardFilters.payment || '';
    pendingFilters = { ...dashboardFilters };
    renderFilterSummary();
  }

  function populateFilterControls(options) {
    fillSelect(Utils.qs('#yearFilter'), options.years || [], {
      emptyLabel: 'All years',
      value: (row) => String(row.year),
      label: (row) => String(row.year)
    });

    fillSelect(Utils.qs('#stateFilter'), options.states || [], {
      emptyLabel: 'All states',
      value: (row) => row.customer_state,
      label: (row) => {
        const name = Utils.stateName(row.customer_state);
        return name === row.customer_state ? name : `${name} (${row.customer_state})`;
      }
    });

    fillSelect(Utils.qs('#paymentFilter'), options.payments || [], {
      emptyLabel: 'All payments',
      value: (row) => row.payment_type,
      label: (row) => Utils.paymentLabel(row.payment_type)
    });

    applyFiltersToDom();
  }

  function fillSelect(select, rows, { emptyLabel, value, label }) {
    if (!select) return;
    select.innerHTML = `<option value="">${emptyLabel}</option>`;

    rows.forEach((row) => {
      const option = document.createElement('option');
      option.value = value(row);
      option.textContent = label(row);
      select.appendChild(option);
    });
  }

  function renderFilterSummary({ pending = false } = {}) {
    const source = pending ? pendingFilters : dashboardFilters;
    const parts = [];

    if (source.year) parts.push(source.year);
    if (source.state) parts.push(`${Utils.stateName(source.state)} (${source.state})`);
    if (source.payment) parts.push(Utils.paymentLabel(source.payment));

    const text = parts.length ? parts.join(' · ') : 'Entire Connected Fleet';

    const fs = Utils.qs('#filterSummary');
    if (fs) fs.textContent = pending ? `${text} · pending` : text;

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

    if (Utils.qs('#heroRange')) Utils.qs('#heroRange').textContent = describeRange(dash.monthly_sales || []);
    if (Utils.qs('#heroHealthValue')) Utils.qs('#heroHealthValue').textContent = `${health.score || 0}/100`;
    if (Utils.qs('#heroHealthNote')) Utils.qs('#heroHealthNote').textContent = `Grade ${health.grade || '-'} · ${health.status || 'Stable'}`;
    if (Utils.qs('#heroForecastValue')) Utils.qs('#heroForecastValue').textContent = forecast.trend || 'Stable';
    if (Utils.qs('#heroForecastNote')) Utils.qs('#heroForecastNote').textContent = `${Utils.formatPercent(forecast.change_percent || 0)} projected change`;
    if (Utils.qs('#heroRiskValue')) Utils.qs('#heroRiskValue').textContent = criticalCount ? `${criticalCount} risks` : 'Low Risk';
    if (Utils.qs('#heroRiskNote')) Utils.qs('#heroRiskNote').textContent = criticalCount ? `${criticalCount} critical anomalies active` : 'Normal operational range';
    if (Utils.qs('#heroNarrative')) Utils.qs('#heroNarrative').textContent = buildNarrative(dash, analytics);
  }

  function buildNarrative(dash, analytics) {
    const topCategory = dash.top_categories?.[0];
    const topState = dash.state_sales?.[0];
    const forecast = analytics.forecast_summary || {};
    const health = analytics.business_health || {};
    const parts = [];

    if (topCategory) parts.push(`${Utils.categoryLabel(topCategory.category)} leads segment performance`);
    if (topState) parts.push(`${Utils.stateName(topState.customer_state || topState.state)} represents top regional vehicle concentration`);
    if (forecast.trend) parts.push(`${forecast.trend.toLowerCase()} degradation trend projected for next 30 days`);
    if (health.status) parts.push(`overall fleet battery health index is ${String(health.status).toLowerCase()}`);

    if (!parts.length) return 'Executive fleet operations and risk telemetry are active.';
    return parts.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.';
  }


  function describeRange(monthlySales) {
    if (!monthlySales.length) return 'No revenue history in slice';
    const first = Utils.formatMonthLabel(monthlySales[0].month);
    const last = Utils.formatMonthLabel(monthlySales[monthlySales.length - 1].month);
    return `${first} to ${last}`;
  }

  function renderKpis(dash) {
    const banner = Utils.qs('#errorBanner');
    if (banner) banner.style.display = 'none';

    const kpis = dash.kpis || {};
    if (Utils.qs('#kpiRevenue')) {
      Utils.animateValue(Utils.qs('#kpiRevenue'), parseFloat(kpis.revenue || 0), {
        formatter: (value) => Utils.formatCurrency(value, { compact: true })
      });
    }
    if (Utils.qs('#kpiOrders')) {
      Utils.animateValue(Utils.qs('#kpiOrders'), Number(kpis.orders || 0), {
        formatter: (value) => Utils.formatNumber(value)
      });
    }
    if (Utils.qs('#kpiCustomers')) {
      Utils.animateValue(Utils.qs('#kpiCustomers'), Number(kpis.customers || 0), {
        formatter: (value) => `${Utils.formatNumber(value)} active units`
      });
    }
    if (Utils.qs('#kpiCustomersValue')) {
      Utils.animateValue(Utils.qs('#kpiCustomersValue'), Number(kpis.customers || 0), {
        formatter: (value) => Utils.formatNumber(value)
      });
    }
    if (Utils.qs('#kpiAov')) {
      Utils.animateValue(Utils.qs('#kpiAov'), parseFloat(kpis.average_order_value || 0), {
        formatter: (value) => Utils.formatCurrency(value)
      });
    }

  }

  function renderTopCategories(categories) {
    const tbody = Utils.qs('#topCategoriesBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!categories.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted);padding:18px 20px;">No category data for selected filters.</td></tr>';
      return;
    }

    const max = Math.max(...categories.map((row) => parseFloat(row.revenue)));
    categories.slice(0, 6).forEach((row, index) => {
      const pct = max > 0 ? (parseFloat(row.revenue) / max) * 100 : 0;
      tbody.appendChild(Utils.el('tr', '', `
        <td><span class="rank">${index + 1}</span>${Utils.categoryLabel(row.category)}</td>
        <td class="num bar-cell">${Utils.formatCurrency(parseFloat(row.revenue), { compact: true })}
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></td>
        <td class="num">${row.orders ? Utils.formatNumber(row.orders) : '-'}</td>
      `));
    });
  }

  function renderPaymentBreakdown(paymentBreakdown) {
    if (!paymentBreakdown.length) {
      Charts.clearChart('paymentChart');
      if (Utils.qs('#paymentLegend')) Utils.qs('#paymentLegend').innerHTML = '<div class="legend-sub">No payment data for selected filters.</div>';
      return;
    }

    const { colors } = Charts.renderPaymentChart('paymentChart', paymentBreakdown);
    const total = paymentBreakdown.reduce((sum, row) => sum + row.total, 0);
    const list = Utils.qs('#paymentLegend');
    if (!list) return;
    list.innerHTML = '';

    paymentBreakdown.forEach((row, index) => {
      const pct = total > 0 ? ((row.total / total) * 100).toFixed(1) : '0';
      list.appendChild(Utils.el('div', 'legend-row', `
        <span class="legend-dot" style="background:${colors[index]}"></span>
        <span class="legend-name">${Utils.paymentLabel(row.payment_type)}</span>
        <span class="legend-value">${pct}%</span>
      `));
    });
  }

  function renderBusinessHealth(health) {
    if (Utils.qs('#healthRingSvg')) Charts.renderHealthRing('healthRingSvg', health.score || 0);
    if (Utils.qs('#healthScore')) Utils.qs('#healthScore').textContent = health.score || 0;
    if (Utils.qs('#healthGrade')) Utils.qs('#healthGrade').textContent = `Grade ${health.grade || '-'} · ${health.status || 'Stable'}`;

    const breakdown = Utils.qs('#healthBreakdown');
    if (breakdown) {
      breakdown.innerHTML = '';
      (health.breakdown || []).forEach((item) => {
        const pct = item.max ? (item.score / item.max) * 100 : 0;
        breakdown.appendChild(Utils.el('div', 'health-metric', `
          <div class="hm-top"><span>${item.metric}</span><span>${item.score}/${item.max}</span></div>
          <div class="hm-track"><div class="hm-fill" style="width:${pct}%"></div></div>
        `));
      });
    }

    if (Utils.qs('#healthDeliveryDays')) Utils.qs('#healthDeliveryDays').textContent = health.average_delivery_days ? `${health.average_delivery_days.toFixed(1)}d` : '-';
    if (Utils.qs('#healthRepeatRate')) Utils.qs('#healthRepeatRate').textContent = health.repeat_rate !== undefined ? `${health.repeat_rate.toFixed(1)}%` : '-';
    if (Utils.qs('#healthAov')) Utils.qs('#healthAov').textContent = health.average_order_value ? Utils.formatCurrency(health.average_order_value, { compact: true }) : '-';
  }

  function renderDashboardInsights(insights) {
    const list = Utils.qs('#dashboardInsightsList');
    if (!list) return;
    list.innerHTML = '';

    if (!insights || !insights.length) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:12.5px;">No automated insights for current scope.</div>';
      return;
    }

    const iconMap = {
      warning: 'bi-exclamation-triangle-fill',
      success: 'bi-graph-up-arrow',
      info: 'bi-info-circle-fill'
    };

    insights.slice(0, 3).forEach((ins) => {
      const type = ins.type || 'info';
      const icon = iconMap[type] || 'bi-info-circle-fill';
      list.appendChild(Utils.el('div', `insight-item ${type}`, `
        <div class="ii-icon"><i class="bi ${icon}"></i></div>
        <div>
          <div class="ii-title">${ins.title}</div>
          <div class="ii-msg">${ins.message}</div>
        </div>
      `));
    });
  }

  function buildExportPayload(dash, analytics) {
    const health = analytics.business_health || {};
    const forecast = analytics.forecast_summary || {};

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
        average_forecast: forecast.average_forecast
      },
      top_categories: (dash.top_categories || []).slice(0, 5)
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
    window.addEventListener('globalFilters:changed', () => {
      dashboardFilters = Utils.getGlobalFilters();
      pendingFilters = { ...dashboardFilters };
      applyFiltersToDom();
      loadDashboard();
    });
    loadDashboard();
  });

})();
