/**
 * scenario.js — What-If Scenario Simulation Controller
 */
document.addEventListener('DOMContentLoaded', async () => {
  await Utils.loadLayout();
  Utils.ensureScopeBanner();

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
  const simMargin = document.getElementById('simMargin');
  const riskScoreVal = document.getElementById('riskScoreVal');
  const riskScoreLabel = document.getElementById('riskScoreLabel');
  const resetBtn = document.getElementById('resetSlidersBtn');

  let scenarioChartInstance = null;
  let debounceTimeout = null;

  async function triggerSimulation() {
    const params = {
      price_change_pct: parseFloat(priceRange.value),
      marketing_boost_pct: parseFloat(marketingRange.value),
      churn_reduction_pct: parseFloat(churnRange.value),
      store_expansion_count: parseInt(storesRange.value)
    };

    priceBadge.textContent = `${params.price_change_pct >= 0 ? '+' : ''}${params.price_change_pct.toFixed(1)}%`;
    marketingBadge.textContent = `+${params.marketing_boost_pct}%`;
    churnBadge.textContent = `+${params.churn_reduction_pct}%`;
    storesBadge.textContent = `${params.store_expansion_count} Hubs`;

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

      const data = await res.json();
      if (!data.success) return;

      const m = data.metrics;
      simRev.textContent = Utils.formatCurrency(m.simulated_revenue);
      
      const isPos = m.revenue_delta_pct >= 0;
      simRevDelta.className = `scenario-stat-delta ${isPos ? 'positive' : 'negative'}`;
      simRevDelta.innerHTML = `<i class="bi ${isPos ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow'}"></i> ${isPos ? '+' : ''}${m.revenue_delta_pct}% (${Utils.formatCurrency(m.revenue_delta_abs)})`;

      simOrders.textContent = Utils.formatNumber(m.simulated_orders);
      simAov.textContent = Utils.formatCurrency(m.simulated_aov);
      simMargin.textContent = `${m.simulated_margin_pct}%`;

      riskScoreVal.textContent = `${m.risk_score} / 100`;
      riskScoreLabel.textContent = m.risk_label;

      renderScenarioChart(data.chart);
    } catch (err) {
      console.error('Simulation error:', err);
    }
  }

  function renderScenarioChart(chartData) {
    const cvs = document.getElementById('scenarioChart');
    if (!cvs || typeof Chart === 'undefined') return;

    if (scenarioChartInstance) {
      scenarioChartInstance.destroy();
    }

    const isDark = ThemeManager.getTheme() === 'dark';
    const textColor = isDark ? '#94A3B8' : '#5C5248';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(140,120,96,0.1)';

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
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(triggerSimulation, 40);
  }

  [priceRange, marketingRange, churnRange, storesRange].forEach(input => {
    input.addEventListener('input', debouncedSimulate);
  });

  resetBtn.addEventListener('click', () => {
    priceRange.value = 0;
    marketingRange.value = 0;
    churnRange.value = 0;
    storesRange.value = 0;
    triggerSimulation();
  });

  // Initial simulation
  triggerSimulation();
});
