/**
 * charts.js — every Chart.js instance is built here.
 * Exposes render functions that take raw API data and a canvas id.
 */

const Charts = (() => {

  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = '#8EA0BB';
  Chart.defaults.font.size = 11.5;
  if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
  }

  const ACCENT = '#2DD4BF';
  const ACCENT_SOFT = 'rgba(45,212,191,0.18)';
  const ACCENT_2 = '#3B82F6';
  const SUCCESS = '#34D399';
  const DANGER = '#F87171';
  const GRID = 'rgba(148,163,184,0.14)';
  const LABEL_BG = 'rgba(10,21,38,0.94)';
  const LABEL_BORDER = 'rgba(148,163,184,0.18)';

  const registry = {};

  function destroy(id) {
    const registeredChart = registry[id];

    if (registeredChart) {
      registeredChart.destroy();
      delete registry[id];
    }

    if (typeof Chart.getChart !== 'function') return;

    const canvas = document.getElementById(id);
    const existingChart = canvas ? Chart.getChart(canvas) : Chart.getChart(id);

    if (existingChart && existingChart !== registeredChart) {
      existingChart.destroy();
    }
  }

  function clearChart(canvasId) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function baseGridOptions() {
    return {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, border: { display: false } },
      y: { grid: { color: GRID, drawTicks: false }, border: { display: false }, ticks: { callback: (v) => Utils.formatNumber(v, { compact: true }) } }
    };
  }

  function labelBox() {
    return {
      clamp: true,
      clip: false,
      backgroundColor: LABEL_BG,
      borderColor: LABEL_BORDER,
      borderRadius: 5,
      borderWidth: 1,
      color: '#D8E5F5',
      font: { size: 10, weight: '700' },
      padding: { top: 3, right: 5, bottom: 3, left: 5 }
    };
  }

  function validDatasetPoints(dataset) {
    return dataset.data
      .map((value, index) => ({ index, value: toNumber(value) }))
      .filter(point => Number.isFinite(point.value));
  }

  function toNumber(value) {
    if (value === null || value === undefined) return NaN;
    if (typeof value === 'object') return Number(value.y ?? value.value ?? value.x);
    return Number(value);
  }

  function labelValue(value, context) {
    const raw = value !== undefined
      ? value
      : context.dataset.data[context.dataIndex];

    return toNumber(raw);
  }

  function isBestFitLinePoint(context) {
    const points = validDatasetPoints(context.dataset);
    if (!points.length) return false;

    const index = context.dataIndex;
    const pointIndexes = points.map(point => point.index);
    const values = points.map(point => point.value);
    const first = pointIndexes[0];
    const last = pointIndexes[pointIndexes.length - 1];
    const max = points[values.indexOf(Math.max(...values))].index;
    const min = points[values.indexOf(Math.min(...values))].index;
    const step = Math.max(1, Math.ceil(points.length / 7));

    return index === first || index === last || index === max || index === min || index % step === 0;
  }

  function lineDataLabels(formatter) {
    return {
      ...labelBox(),
      display: (context) => isBestFitLinePoint(context) ? 'auto' : false,
      formatter: (value, context) => formatter(labelValue(value, context), context),
      align: (context) => labelValue(undefined, context) >= 0 ? 'top' : 'bottom',
      anchor: 'end',
      offset: 6
    };
  }

  function barDataLabels(formatter) {
    return {
      ...labelBox(),
      display: 'auto',
      formatter: (value, context) => formatter(labelValue(value, context), context),
      align: (context) => labelValue(undefined, context) >= 0 ? 'top' : 'bottom',
      anchor: (context) => labelValue(undefined, context) >= 0 ? 'end' : 'start',
      offset: 4
    };
  }

  function donutDataLabels() {
    return {
      display: (context) => {
        const values = context.dataset.data.map(Number);
        const total = values.reduce((sum, value) => sum + value, 0);
        const pct = total ? (labelValue(undefined, context) / total) * 100 : 0;
        return pct >= 4 ? 'auto' : false;
      },
      formatter: (value, context) => {
        const values = context.dataset.data.map(Number);
        const total = values.reduce((sum, item) => sum + item, 0);
        const pct = total ? (Number(value) / total) * 100 : 0;
        return `${pct.toFixed(0)}%`;
      },
      color: '#fff',
      font: { size: 10.5, weight: '800' },
      textStrokeColor: 'rgba(15,20,32,0.28)',
      textStrokeWidth: 2,
      anchor: 'center',
      align: 'center',
      clamp: true,
      clip: false
    };
  }

  function renderRevenueChart(canvasId, monthlySales) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = monthlySales.map(m => Utils.formatMonthLabel(m.month));
    const values = monthlySales.map(m => parseFloat(m.revenue));
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(45,212,191,0.28)');
    gradient.addColorStop(1, 'rgba(45,212,191,0.0)');

    registry[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{
        label: 'Revenue', data: values, borderColor: ACCENT, backgroundColor: gradient, fill: true,
        tension: 0.35, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: ACCENT,
        pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, borderWidth: 2.25
      }]},
      options: {
        layout: { padding: { top: 22, right: 18, bottom: 0, left: 8 } },
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          datalabels: lineDataLabels(value => Utils.formatCurrency(value, { compact: true })),
          tooltip: {
            backgroundColor: '#08111F', titleFont: { weight: '600', size: 11.5 }, bodyFont: { size: 12 },
            padding: 10, cornerRadius: 8, displayColors: false,
            callbacks: { label: (c) => Utils.formatCurrency(c.parsed.y) }
          }
        },
        scales: baseGridOptions()
      }
    });
  }

  function renderForecastChart(canvasId, historical, forecast, { historyDays = 45 } = {}) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const histTail = historical.slice(-historyDays);
    const histLabels = histTail.map(h => Utils.formatDateLabel(h.date));
    const histValues = histTail.map(h => h.sales);
    const fcLabels = forecast.map(f => Utils.formatDateLabel(f.date));
    const fcValues = forecast.map(f => f.forecast);
    const fcUpper = forecast.map(f => f.upper);
    const fcLower = forecast.map(f => f.lower);

    const labels = [...histLabels, ...fcLabels];
    const historicalSeries = [...histValues, ...Array(fcLabels.length).fill(null)];
    const forecastSeries = [...Array(histLabels.length - 1).fill(null), histValues[histValues.length - 1], ...fcValues];
    const upperSeries = [...Array(histLabels.length).fill(null), ...fcUpper];
    const lowerSeries = [...Array(histLabels.length).fill(null), ...fcLower];

    registry[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Upper bound', data: upperSeries, borderColor: 'transparent', backgroundColor: 'rgba(59,130,246,0.12)', pointRadius: 0, fill: '+1', tension: 0.3 },
          { label: 'Lower bound', data: lowerSeries, borderColor: 'transparent', backgroundColor: 'transparent', pointRadius: 0, fill: false, tension: 0.3 },
          { label: 'Forecast', data: forecastSeries, borderColor: ACCENT_2, borderDash: [5, 4], pointRadius: 0, tension: 0.3, borderWidth: 2 },
          { label: 'Historical', data: historicalSeries, borderColor: ACCENT, pointRadius: 0, tension: 0.3, borderWidth: 2.25 }
        ]
      },
      options: {
        layout: { padding: { top: 22, right: 18, bottom: 0, left: 8 } },
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          datalabels: {
            ...lineDataLabels((value) => Utils.formatCurrency(value, { compact: true })),
            color: (context) => context.dataset.label === 'Forecast' ? ACCENT_2 : ACCENT,
            display: (context) => {
              if (context.dataset.label !== 'Historical' && context.dataset.label !== 'Forecast') return false;
              return isBestFitLinePoint(context) ? 'auto' : false;
            }
          },
          tooltip: {
            backgroundColor: '#08111F', padding: 10, cornerRadius: 8,
            filter: (item) => item.dataset.label === 'Historical' || item.dataset.label === 'Forecast',
            callbacks: { label: (c) => `${c.dataset.label}: ${Utils.formatCurrency(c.parsed.y)}` }
          }
        },
        scales: baseGridOptions()
      }
    });
  }

  function renderPaymentChart(canvasId, paymentBreakdown) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const colors = [ACCENT, ACCENT_2, SUCCESS, '#B7791F', '#9AA1B1'];
    const labels = paymentBreakdown.map(p => Utils.paymentLabel(p.payment_type));
    const values = paymentBreakdown.map(p => p.total);

    registry[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#0E1B2E', hoverOffset: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '72%',
        plugins: {
          legend: { display: false },
          datalabels: donutDataLabels(),
          tooltip: {
            backgroundColor: '#08111F', padding: 10, cornerRadius: 8,
            callbacks: { label: (c) => `${c.label}: ${Utils.formatNumber(c.parsed)} orders` }
          }
        }
      }
    });
    return { labels, values, colors };
  }

  function renderHourlyChart(canvasId, salesByHour) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = salesByHour.map(h => `${h.hour}:00`);
    const values = salesByHour.map(h => h.orders);
    const max = Math.max(...values);

    registry[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: values.map(v => v === max ? ACCENT : ACCENT_SOFT), borderRadius: 4, maxBarThickness: 14 }] },
      options: {
        layout: { padding: { top: 20, right: 8, bottom: 0, left: 8 } },
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: barDataLabels(value => Utils.formatNumber(value, { compact: true })),
          tooltip: { backgroundColor: '#08111F', padding: 10, cornerRadius: 8, callbacks: { label: (c) => `${Utils.formatNumber(c.parsed.y)} orders` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 12 }, border: { display: false } },
          y: { grid: { color: GRID }, border: { display: false }, ticks: { callback: v => Utils.formatNumber(v, { compact: true }) } }
        }
      }
    });
  }

  function renderWeekdayChart(canvasId, weekdayRevenue) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sorted = [...weekdayRevenue].sort((a, b) => order.indexOf(a.weekday) - order.indexOf(b.weekday));
    const labels = sorted.map(w => w.weekday.slice(0, 3));
    const values = sorted.map(w => parseFloat(w.revenue));

    registry[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: ACCENT_SOFT, hoverBackgroundColor: ACCENT, borderRadius: 6, maxBarThickness: 34 }] },
      options: {
        layout: { padding: { top: 20, right: 8, bottom: 0, left: 8 } },
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: barDataLabels(value => Utils.formatCurrency(value, { compact: true })),
          tooltip: { backgroundColor: '#08111F', padding: 10, cornerRadius: 8, callbacks: { label: (c) => Utils.formatCurrency(c.parsed.y, { compact: true }) } }
        },
        scales: baseGridOptions()
      }
    });
  }

  function renderGrowthChart(canvasId, revenueGrowth) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const rows = revenueGrowth.filter(r => r.growth_percent !== null);
    const labels = rows.map(r => Utils.formatMonthLabel(r.month));
    const values = rows.map(r => parseFloat(r.growth_percent));

    registry[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: values.map(v => v >= 0 ? SUCCESS : DANGER), borderRadius: 5, maxBarThickness: 20 }] },
      options: {
        layout: { padding: { top: 22, right: 8, bottom: 0, left: 8 } },
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: barDataLabels(value => Utils.formatPercent(value, { decimals: 0 })),
          tooltip: { backgroundColor: '#08111F', padding: 10, cornerRadius: 8, callbacks: { label: (c) => Utils.formatPercent(c.parsed.y) } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, maxTicksLimit: 10 }, border: { display: false } },
          y: { grid: { color: GRID }, border: { display: false }, ticks: { callback: v => v + '%' } }
        }
      }
    });
  }

  function renderHealthRing(svgId, score) {
    const svg = document.getElementById(svgId);
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.max(0, Math.min(100, score)) / 100;
    const offset = circumference * (1 - pct);
    const color = score >= 75 ? SUCCESS : score >= 50 ? '#B7791F' : DANGER;
    const ring = svg.querySelector('.ring-progress');
    ring.style.stroke = color;
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    ring.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      ring.style.transition = 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)';
      ring.style.strokeDashoffset = offset;
    });
  }

  function renderRetentionTrendChart(canvasId, trend) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = trend.map((row) => Utils.formatMonthLabel(row.month));
    const repeatValues = trend.map((row) => Number(row.repeat_customers || 0));
    const newValues = trend.map((row) => Number(row.new_customers || 0));

    registry[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Repeat',
            data: repeatValues,
            borderColor: SUCCESS,
            backgroundColor: 'rgba(52,211,153,0.14)',
            fill: false,
            pointRadius: 0,
            tension: 0.32,
            borderWidth: 2.2
          },
          {
            label: 'New',
            data: newValues,
            borderColor: ACCENT_2,
            backgroundColor: 'rgba(59,130,246,0.14)',
            fill: false,
            pointRadius: 0,
            tension: 0.32,
            borderWidth: 2.2
          }
        ]
      },
      options: {
        layout: { padding: { top: 22, right: 18, bottom: 0, left: 8 } },
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          datalabels: {
            ...lineDataLabels((value) => Utils.formatNumber(value, { compact: true })),
            display: (context) => {
              if (context.dataset.label !== 'Repeat') return false;
              return isBestFitLinePoint(context) ? 'auto' : false;
            }
          },
          tooltip: {
            backgroundColor: '#08111F', padding: 10, cornerRadius: 8,
            callbacks: { label: (c) => `${c.dataset.label}: ${Utils.formatNumber(c.parsed.y)}` }
          }
        },
        scales: baseGridOptions()
      }
    });
  }

  function renderSegmentMixChart(canvasId, segments) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = segments.map((row) => row.segment);
    const values = segments.map((row) => Number(row.customers || 0));
    const colors = ['#34D399', '#60A5FA', '#F59E0B', '#F87171'];

    registry[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, values.length),
          borderWidth: 2,
          borderColor: '#0E1B2E',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { display: false },
          datalabels: donutDataLabels(),
          tooltip: {
            backgroundColor: '#08111F', padding: 10, cornerRadius: 8,
            callbacks: { label: (c) => `${c.label}: ${Utils.formatNumber(c.parsed)} customers` }
          }
        }
      }
    });
    return { colors };
  }

  function renderRiskyRegionsChart(canvasId, riskyRegions) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = riskyRegions.map((row) => row.customer_state);
    const values = riskyRegions.map((row) => Number(row.risk_rate || 0));

    registry[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: values.map((value) => value >= 25 ? DANGER : '#F59E0B'),
          borderRadius: 6,
          maxBarThickness: 28
        }]
      },
      options: {
        layout: { padding: { top: 22, right: 8, bottom: 0, left: 8 } },
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: barDataLabels((value) => Utils.formatPercent(value, { decimals: 0 })),
          tooltip: {
            backgroundColor: '#08111F', padding: 10, cornerRadius: 8,
            callbacks: { label: (c) => `${Utils.formatPercent(c.parsed.y)} risk rate` }
          }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { grid: { color: GRID }, border: { display: false }, ticks: { callback: (value) => `${value}%` } }
        }
      }
    });
  }

  return {
    renderRevenueChart, renderForecastChart, renderPaymentChart, renderHourlyChart,
    renderWeekdayChart, renderGrowthChart, renderHealthRing, clearChart,
    renderRetentionTrendChart, renderSegmentMixChart, renderRiskyRegionsChart
  };
})();
