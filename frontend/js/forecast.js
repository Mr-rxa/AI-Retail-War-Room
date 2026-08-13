/**
 * forecast.js — forecast.html only.
 */

(() => {

  let lastData = null;

  function setTopbar() {
    if (Utils.qs('#topbarTitle')) Utils.qs('#topbarTitle').textContent = 'Sales & Financial Forecast — AI Retail War Room';
    if (Utils.qs('#topbarCrumbs')) Utils.qs('#topbarCrumbs').textContent = '30-day Prophet sales forecast, revenue confidence boundaries, and financial projections';
    const refreshBtn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');
    if (refreshBtn) refreshBtn.onclick = () => load(true);
    if (exportBtn) exportBtn.onclick = exportBrief;
  }

  function downloadCsv() {
    if (!lastData) return;
    const rows = [['date', 'forecast', 'lower', 'upper']];
    lastData.forecast.forEach(f => rows.push([f.date, f.forecast, f.lower, f.upper]));
    const csv = rows.map(r => r.join(',')).join('\n');
    Utils.downloadFile('sales_forecast_30d.csv', csv, 'text/csv');
  }

  function exportBrief() {
    if (!lastData) return;
    const summary = lastData.summary || {};
    const payload = {
      exported_at: new Date().toISOString(),
      trend: summary.trend,
      change_percent: summary.change_percent,
      average_forecast: summary.average_forecast,
      confidence_width: summary.confidence_width,
      latest_actual: summary.latest_actual,
      highest_forecast: summary.highest_forecast,
      lowest_forecast: summary.lowest_forecast,
      forecast_days: summary.forecast_days,
      forecast_window: {
        start: lastData.forecast?.[0]?.date || null,
        end: lastData.forecast?.[lastData.forecast.length - 1]?.date || null
      },
      forecast_points: lastData.forecast
    };
    Utils.downloadFile(`forecast_brief_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
  }

  async function load(forceRefresh = false) {
    const btn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');

    if (!forceRefresh) {
      const cached = Utils.getCache('forecast');
      if (cached) {
        lastData = cached;
        renderAll(cached);
        if (exportBtn) exportBtn.disabled = false;
        return;
      }
    }

    if (btn) { btn.disabled = true; btn.querySelector('i')?.classList.add('spin'); }
    if (exportBtn) exportBtn.disabled = true;
    Utils.showLoader(Utils.qs('main.content'), 'Computing Prophet 30-Day Sales Forecast...');

    try {
      const data = await API.getForecast();
      lastData = data;
      Utils.setCache('forecast', data);
      if (Utils.qs('#errorBanner')) Utils.qs('#errorBanner').style.display = 'none';
      renderAll(data);
    } catch (err) {
      console.error(err);
      const banner = Utils.qs('#errorBanner');
      if (banner) {
        banner.textContent = `Couldn't load forecast data — ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL}, then retry.`;
        banner.style.display = 'block';
      }
    } finally {
      Utils.hideLoader(Utils.qs('main.content'));
      if (btn) { btn.disabled = false; btn.querySelector('i')?.classList.remove('spin'); }
      if (exportBtn) exportBtn.disabled = !lastData;
    }
  }

  function renderAll(data) {
    renderStats(data.summary);
    Charts.renderForecastChart('forecastFullChart', data.historical, data.forecast, { historyDays: 90 });
    renderTable(data.forecast);
  }

  function renderStats(summary = {}) {
    if (!summary) return;
    const trend = summary.trend || 'Stable';
    const up = trend === 'Increasing';
    if (Utils.qs('#statTrend')) {
      Utils.qs('#statTrend').textContent = trend;
      Utils.qs('#statTrend').className = `fs-value ${up ? 'pos' : 'neg'}`;
    }
    if (Utils.qs('#statChange')) {
      Utils.qs('#statChange').textContent = Utils.formatPercent(summary.change_percent || 0);
      Utils.qs('#statChange').className = `fs-value ${Number(summary.change_percent || 0) >= 0 ? 'pos' : 'neg'}`;
    }
    if (Utils.qs('#statAvg')) Utils.qs('#statAvg').textContent = Utils.formatCurrency(summary.average_forecast || 0, { compact: true });
    if (Utils.qs('#statConfidence')) Utils.qs('#statConfidence').textContent = Utils.formatCurrency(summary.confidence_width || 0, { compact: true });
    if (Utils.qs('#statLatestActual')) Utils.qs('#statLatestActual').textContent = Utils.formatCurrency(summary.latest_actual || 0);
    if (Utils.qs('#statHighest')) Utils.qs('#statHighest').textContent = Utils.formatCurrency(summary.highest_forecast || 0, { compact: true });
    if (Utils.qs('#statLowest')) Utils.qs('#statLowest').textContent = Utils.formatCurrency(summary.lowest_forecast || 0, { compact: true });
    if (Utils.qs('#statDays')) Utils.qs('#statDays').textContent = `${summary.forecast_days || 30} days`;
  }

  function renderTable(forecast = []) {
    const tbody = Utils.qs('#forecastTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    (forecast || []).forEach(f => {
      tbody.appendChild(Utils.el('tr', '', `
        <td>${Utils.timeAgoOrDate(f.date)}</td>
        <td class="num">${Utils.formatCurrency(f.forecast)}</td>
        <td class="num" style="color:var(--text-muted)">${Utils.formatCurrency(f.lower)}</td>
        <td class="num" style="color:var(--text-muted)">${Utils.formatCurrency(f.upper)}</td>
      `));
    });
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
