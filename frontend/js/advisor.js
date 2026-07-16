/**
 * advisor.js — advisor.html only.
 */

(() => {

  let rawMarkdown = '';

  function setTopbar() {
    Utils.qs('#topbarTitle').textContent = 'AI Advisor - Management Actions';
    Utils.qs('#topbarCrumbs').textContent = 'Executive report generated from live business data and recommended next actions';
  }

  function setupToolbar() {
    Utils.qs('#generateBtn').addEventListener('click', () => load(true));
    Utils.qs('#regenerateBtn').addEventListener('click', () => load(true));
    Utils.qs('#copyBtn').addEventListener('click', copyReport);
    Utils.qs('#downloadBtn').addEventListener('click', downloadReport);
  }

  function copyReport() {
    if (!rawMarkdown) return;
    navigator.clipboard.writeText(rawMarkdown);
    const btn = Utils.qs('#copyBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check2"></i>Copied';
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  }

  function downloadReport() {
    if (!rawMarkdown) return;
    const blob = new Blob([rawMarkdown], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ai_advisor_report.md';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function setToolbarBusy(isBusy) {
    Utils.qsa('.advisor-toolbar button').forEach(b => b.disabled = isBusy);
    const genIcon = Utils.qs('#generateBtn i');
    if (genIcon) genIcon.classList.toggle('spin', isBusy);
  }

  async function load(isRegenerate = false) {
    setToolbarBusy(true);
    const container = Utils.qs('#reportContainer');
    if (isRegenerate) {
      container.innerHTML = `<div class="advisor-empty"><i class="bi bi-stars"></i>Generating executive report…</div>`;
    }
    try {
      const data = await API.getAdvisorReport({ refresh: isRegenerate });
      Utils.qs('#errorBanner').style.display = 'none';
      rawMarkdown = typeof data === 'string' ? data : (data.report || data.markdown || '');
      renderReport(rawMarkdown);
      Utils.qs('#copyBtn').disabled = false;
      Utils.qs('#downloadBtn').disabled = false;
    } catch (err) {
      console.error(err);
      const banner = Utils.qs('#errorBanner');
      banner.textContent = `Couldn't load the AI Advisor report — ${err.message}. Confirm the API is running at ${CONFIG.API_BASE_URL} and the Gemini key is configured.`;
      banner.style.display = 'block';
      container.innerHTML = `<div class="advisor-empty"><i class="bi bi-exclamation-triangle"></i>No report available. Try Generate Report again.</div>`;
    } finally {
      setToolbarBusy(false);
    }
  }

  function renderReport(markdown) {
    const container = Utils.qs('#reportContainer');
    if (!markdown) {
      container.innerHTML = `<div class="advisor-empty"><i class="bi bi-stars"></i>No report generated yet. Click Generate Report to get started.</div>`;
      return;
    }
    container.innerHTML = marked.parse(markdown);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Utils.loadLayout();
    Utils.ensureScopeBanner();
    Utils.updateScopeBanner();
    setTopbar();
    setupToolbar();
    load();
  });
})();
