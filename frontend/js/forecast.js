/**
 * forecast.js — forecast.html only.
 */

(() => {

  let lastData = null;

  function setTopbar() {
    Utils.qs('#topbarTitle').textContent = 'Forecast - Predictive Outlook';
    Utils.qs('#topbarCrumbs').textContent = '30-day Prophet projection with confidence interval for forward demand planning';
    const actions = Utils.qs('#topbarActions');
    actions.insertAdjacentHTML('beforeend', `
      <button class="btn-outline" id="exportBriefBtn"><i class="bi bi-file-earmark-text"></i>Export Brief</button>
      <button class="btn-outline" id="downloadBtn"><i class="bi bi-download"></i>Download Forecast</button>
      <button class="btn-outline" id="refreshBtn"><i class="bi bi-arrow-clockwise"></i>Refresh</button>
    `);
    Utils.qs('#refreshBtn').addEventListener('click', load);
    Utils.qs('#downloadBtn').addEventListener('click', downloadCsv);
    Utils.qs('#exportBriefBtn').addEventListener('click', exportBrief);
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

  async function load() {
    const btn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBriefBtn');
    if (btn) { btn.disabled = true; btn.querySelector('i').classList.add('spin'); }
    if (exportBtn) exportBtn.disabled = true;
    try {
      const data = await API.getForecast();
      lastData = data;
      Utils.qs('#errorBanner').style.display = 'none';
      renderStats(data.summary);
      Charts.renderForecastChart('forecastFullChart', data.historical, data.forecast, { historyDays: 90 });
      renderTable(data.forecast);
    } catch (err) {
      console.error(err);
      const banner = Utils.qs('#errorBanner');
      banner.textContent = `Couldn't load forecast data — ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL}, then retry.`;
      banner.style.display = 'block';
    } finally {
      if (btn) { btn.disabled = false; btn.querySelector('i').classList.remove('spin'); }
      if (exportBtn) exportBtn.disabled = !lastData;
    }
  }

  function renderStats(summary) {
    const up = summary.trend === 'Increasing';
    Utils.qs('#statTrend').textContent = summary.trend;
    Utils.qs('#statTrend').className = `fs-value ${up ? 'pos' : 'neg'}`;
    Utils.qs('#statChange').textContent = Utils.formatPercent(summary.change_percent);
    Utils.qs('#statChange').className = `fs-value ${summary.change_percent >= 0 ? 'pos' : 'neg'}`;
    Utils.qs('#statAvg').textContent = Utils.formatCurrency(summary.average_forecast, { compact: true });
    Utils.qs('#statConfidence').textContent = Utils.formatCurrency(summary.confidence_width, { compact: true });
    Utils.qs('#statLatestActual').textContent = Utils.formatCurrency(summary.latest_actual);
    Utils.qs('#statHighest').textContent = Utils.formatCurrency(summary.highest_forecast, { compact: true });
    Utils.qs('#statLowest').textContent = Utils.formatCurrency(summary.lowest_forecast, { compact: true });
    Utils.qs('#statDays').textContent = `${summary.forecast_days} days`;
  }

  function renderTable(forecast) {
    const tbody = Utils.qs('#forecastTableBody');
    tbody.innerHTML = '';
    forecast.forEach(f => {
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
    load();
  });
})();
