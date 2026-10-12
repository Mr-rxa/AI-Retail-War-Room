/**
 * scenario.js — What-If Scenario Simulation Controller
 */
document.addEventListener('DOMContentLoaded', async () => {
  await Utils.loadLayout();
  Utils.ensureScopeBanner();

  function setTopbar() {
    if (Utils.qs('#topbarTitle')) Utils.qs('#topbarTitle').textContent = 'What-If Modeler — AI Retail War Room';
    if (Utils.qs('#topbarCrumbs')) Utils.qs('#topbarCrumbs').textContent = 'Interactive commercial levers, pricing elasticity simulations & trajectory forecasting';
  }
  setTopbar();

  const priceRange = document.getElementById('priceRange');
  const marketingRange = document.getElementById('marketingRange');
  const churnRange = document.getElementById('churnRange');
  const storesRange = document.getElementById('storesRange');

  const priceBadge = document.getElementById('priceBadge');
  const marketingBadge = document.getElementById('marketingBadge');
  const churnBadge = document.getElementById('churnBadge');
  const storesBadge = document.getElementById('storesBadge');

  const simRev = document.getElementById('simRev');
  const simRevDelta = document.getElementById('simRevDelta');
  const simOrders = document.getElementById('simOrders');
  const simOrdersDelta = document.getElementById('simOrdersDelta');
  const simAov = document.getElementById('simAov');
  const simAovDelta = document.getElementById('simAovDelta');
  const simMargin = document.getElementById('simMargin');
  const simMarginDelta = document.getElementById('simMarginDelta');
  const riskScoreVal = document.getElementById('riskScoreVal');
  const riskScoreLabel = document.getElementById('riskScoreLabel');
  const resetBtn = document.getElementById('resetSlidersBtn');

  let scenarioChartInstance = null;
  let debounceTimeout = null;

  function computeLocalSimulation(params) {
    const base_rev = 9039662.10;
    const base_orders = 63210;
    const base_aov = 143.01;

    const price_change = params.price_change_pct / 100.0;
    const marketing_boost = params.marketing_boost_pct / 100.0;
    const churn_reduction = params.churn_reduction_pct / 100.0;
    const new_stores = params.store_expansion_count;

    const demand_elasticity = -1.35;
    const volume_change_from_price = price_change * demand_elasticity;
    const volume_change_from_marketing = marketing_boost * 0.65;
    const volume_change_from_retention = churn_reduction * 0.40;
    const volume_change_from_stores = new_stores * 0.035;

    const total_volume_mult = Math.max(0.2, 1.0 + volume_change_from_price + volume_change_from_marketing + volume_change_from_retention + volume_change_from_stores);
    const simulated_aov = base_aov * (1.0 + price_change);
    const simulated_orders = Math.round(base_orders * total_volume_mult);
    const simulated_revenue = Math.round(simulated_orders * simulated_aov * 100) / 100;
    const revenue_delta_abs = Math.round((simulated_revenue - base_rev) * 100) / 100;
    const revenue_delta_pct = Math.round(((simulated_revenue - base_rev) / base_rev) * 10000) / 100;

    const base_margin_pct = 0.18;
    const marketing_cost_deduction = base_rev * marketing_boost * 0.15;
    const simulated_gross_profit = (simulated_revenue * (base_margin_pct + (price_change * 0.8))) - marketing_cost_deduction;
    const simulated_margin_pct = Math.round(Math.max(2.0, (simulated_gross_profit / simulated_revenue) * 100) * 100) / 100;

    let risk_score = 75;
    if (price_change > 0.15) risk_score -= 20;
    if (price_change < -0.20) risk_score -= 25;
    if (simulated_margin_pct > 22) risk_score += 15;
    if (simulated_margin_pct < 10) risk_score -= 30;
    risk_score = Math.max(10, Math.min(98, risk_score));
    const risk_label = risk_score >= 70 ? "Optimal Commercial Strategy" : (risk_score >= 45 ? "Moderate Execution Risk" : "High Commercial Volatility");

    const labels = [];
    const baseline = [];
    const simulated = [];
    const daily_base = base_rev / 365.0;
    for (let i = 1; i <= 30; i++) {
      labels.push(`Day ${i}`);
      const variance = 1.0 + 0.05 * Math.sin(i * 0.7);
      const b = Math.round(daily_base * variance * 100) / 100;
      baseline.push(b);
      simulated.push(Math.round(b * (1.0 + revenue_delta_pct / 100.0) * 100) / 100);
    }

    return {
      metrics: {
        baseline_revenue: base_rev,
        baseline_orders: base_orders,
        simulated_revenue,
        revenue_delta_abs,
        revenue_delta_pct,
        simulated_orders,
        simulated_aov,
        simulated_margin_pct,
        risk_score,
        risk_label
      },
      chart: { labels, baseline, simulated }
    };
  }

  function updateUI(m, chartData) {
    if (!m) return;
    if (simRev) simRev.textContent = Utils.formatCurrency(m.simulated_revenue);
    
    const isPos = m.revenue_delta_pct >= 0;
    if (simRevDelta) {
      simRevDelta.className = `scenario-stat-delta ${isPos ? 'positive' : 'negative'}`;
      simRevDelta.innerHTML = `<i class="bi ${isPos ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow'}"></i> ${isPos ? '+' : ''}${m.revenue_delta_pct}% (${Utils.formatCurrency(m.revenue_delta_abs)})`;
    }

    if (simOrders) simOrders.textContent = Utils.formatNumber(m.simulated_orders);
    const orderDelta = m.simulated_orders - (m.baseline_orders || 63210);
    const isOrderPos = orderDelta >= 0;
    if (simOrdersDelta) {
      simOrdersDelta.className = `scenario-stat-delta ${isOrderPos ? 'positive' : 'negative'}`;
      simOrdersDelta.innerHTML = `<i class="bi bi-bag-check"></i> ${isOrderPos ? '+' : ''}${Utils.formatNumber(orderDelta)} vol`;
    }

    if (simAov) simAov.textContent = Utils.formatCurrency(m.simulated_aov);
    if (simAovDelta) {
      simAovDelta.innerHTML = `<i class="bi bi-cart"></i> Per transaction`;
    }

    if (simMargin) simMargin.textContent = `${m.simulated_margin_pct}%`;
    if (simMarginDelta) {
      const isMarginHealthy = m.simulated_margin_pct >= 15;
      simMarginDelta.className = `scenario-stat-delta ${isMarginHealthy ? 'positive' : 'negative'}`;
      simMarginDelta.innerHTML = `<i class="bi bi-shield-check"></i> ${isMarginHealthy ? 'Healthy margin' : 'Margin compression'}`;
    }

    if (riskScoreVal) riskScoreVal.textContent = `${m.risk_score} / 100`;
    if (riskScoreLabel) riskScoreLabel.textContent = m.risk_label;

    if (chartData) {
      renderScenarioChart(chartData);
    }
  }

  function getParams() {
    return {
      price_change_pct: parseFloat(priceRange.value) || 0,
      marketing_boost_pct: parseFloat(marketingRange.value) || 0,
      churn_reduction_pct: parseFloat(churnRange.value) || 0,
      store_expansion_count: parseInt(storesRange.value) || 0
    };
  }

  function updateBadges(params) {
    if (priceBadge) priceBadge.textContent = `${params.price_change_pct >= 0 ? '+' : ''}${params.price_change_pct.toFixed(1)}%`;
    if (marketingBadge) marketingBadge.textContent = `+${params.marketing_boost_pct}%`;
    if (churnBadge) churnBadge.textContent = `+${params.churn_reduction_pct}%`;
    if (storesBadge) storesBadge.textContent = `${params.store_expansion_count} Hubs`;
  }

  async function triggerSimulation() {
    const params = getParams();
    updateBadges(params);

    // Instant local feedback (zero latency)
    const localResult = computeLocalSimulation(params);
    updateUI(localResult.metrics, localResult.chart);

    // Sync with backend API
    try {
      const filters = Utils.getGlobalFilters();
      const res = await fetch(`${CONFIG.API_BASE_URL}/scenario/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionStorage.getItem('airw_session_id') || ''
        },
        body: JSON.stringify({ ...params, ...filters })
      });

      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.success) return;

      updateUI(data.metrics, data.chart);
    } catch (err) {
      // Gracefully silent: local simulation already active
      console.warn('Backend scenario sync offline, using local simulation:', err);
    }
  }

  function renderScenarioChart(chartData) {
    const cvs = document.getElementById('scenarioChart');
    if (!cvs || typeof Chart === 'undefined') return;

    if (scenarioChartInstance) {
      scenarioChartInstance.destroy();
      scenarioChartInstance = null;
    }

    if (typeof Chart.getChart === 'function') {
      const existing = Chart.getChart(cvs);
      if (existing) existing.destroy();
    }

    const isDark = (typeof ThemeManager !== 'undefined' && ThemeManager.getTheme() === 'dark');
    const textColor = isDark ? '#94A3B8' : '#5C5248';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(140,120,96,0.12)';

    scenarioChartInstance = new Chart(cvs, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Baseline Trajectory ($)',
            data: chartData.baseline,
            borderColor: '#94A3B8',
            borderDash: [5, 5],
            fill: false,
            tension: 0.35,
            pointRadius: 0
          },
          {
            label: 'Simulated Trajectory ($)',
            data: chartData.simulated,
            borderColor: '#F97316',
            backgroundColor: 'rgba(249, 115, 22, 0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { family: 'Inter', size: 11.5, weight: '600' } }
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${Utils.formatCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'JetBrains Mono', size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'JetBrains Mono', size: 10 }, callback: v => Utils.formatCurrency(v) } }
        }
      }
    });
  }

  function debouncedSimulate() {
    // Instant local compute on slider drag
    const params = getParams();
    updateBadges(params);
    const localResult = computeLocalSimulation(params);
    updateUI(localResult.metrics, localResult.chart);

    // Debounce backend sync
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      triggerSimulation();
    }, 200);
  }

  [priceRange, marketingRange, churnRange, storesRange].forEach(input => {
    if (input) input.addEventListener('input', debouncedSimulate);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (priceRange) priceRange.value = 0;
      if (marketingRange) marketingRange.value = 0;
      if (churnRange) churnRange.value = 0;
      if (storesRange) storesRange.value = 0;
      triggerSimulation();
    });
  }

  // Initial immediate baseline simulation
  triggerSimulation();
});
