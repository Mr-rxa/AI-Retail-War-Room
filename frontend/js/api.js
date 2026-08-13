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
    const headers = { 'Accept': 'application/json' };
    const sessionId = localStorage.getItem('airw_session_id');
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }

    const res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
      method: 'GET',
      headers
    });
    if (!res.ok) throw new Error(`Request to ${path} failed with status ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || `Request to ${path} was not successful`);
    return json.data;
  }

  function getDashboard(filters = {}) { return request(`/dashboard${toQuery(filters)}`); }
  function getAnalyticsSummary(filters = {}) { return request(`/analytics/summary${toQuery(filters)}`); }
  function getForecast() { return request('/forecast/sales'); }
  function getAdvisorReport({ refresh = false } = {}) {
    return request(refresh ? `/ai/advisor?refresh=${Date.now()}` : '/ai/advisor');
  }
  function getAnomalies() { return request('/anomalies'); }
  function getDataSourceStatus() { return request('/upload/status'); }
  async function clearCustomData() {
    const sessionId = localStorage.getItem('airw_session_id');
    const headers = { 'Accept': 'application/json' };
    if (sessionId) headers['X-Session-ID'] = sessionId;
    
    const res = await fetch(`${CONFIG.API_BASE_URL}/upload/clear`, {
      method: 'POST',
      headers
    });
    if (!res.ok) throw new Error(`Clear request failed with status ${res.status}`);
    localStorage.removeItem('airw_currency');
    const json = await res.json();
    return json.data;
  }


  return { 
    getDashboard, getAnalyticsSummary, getForecast, getAdvisorReport, 
    getAnomalies, getDataSourceStatus, clearCustomData 
  };
})();
