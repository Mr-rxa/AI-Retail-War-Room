/**
 * api.js — all network calls to the Flask backend live here.
 * Nothing in this file touches the DOM or Chart.js.
 */

const API = (() => {

  function toQuery(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value);
      }
    });

    const text = query.toString();
    return text ? `?${text}` : '';
  }

  async function request(path) {
    const res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Request to ${path} failed with status ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || `Request to ${path} was not successful`);
    return json.data;
  }

  function getDashboard(filters = {}) { return request(`/dashboard${toQuery(filters)}`); }
  function getAnalyticsSummary() { return request('/analytics/summary'); }
  function getForecast() { return request('/forecast/sales'); }
  function getAdvisorReport({ refresh = false } = {}) {
    return request(refresh ? `/ai/advisor?refresh=${Date.now()}` : '/ai/advisor');
  }
  function getAnomalies() { return request('/anomalies'); }

  return { getDashboard, getAnalyticsSummary, getForecast, getAdvisorReport, getAnomalies };
})();
