/**
 * advisor.js — advisor.html logic with warm editorial styling & smooth report rendering.
 */

(() => {
  let rawMarkdown = '';

  function setTopbar() {
    if (Utils.qs('#topbarTitle')) Utils.qs('#topbarTitle').textContent = 'AI Advisor Lab — Strategic Scenario Generator';
    if (Utils.qs('#topbarCrumbs')) Utils.qs('#topbarCrumbs').textContent = 'AI Retail War Room / Generative Intelligence';
    const refreshBtn = Utils.qs('#refreshBtn');
    const exportBtn = Utils.qs('#exportBtn');
    if (refreshBtn) refreshBtn.onclick = () => load(true);
    if (exportBtn) exportBtn.onclick = copyReport;
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
    a.download = 'ai_retail_advisor_report.md';
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
      container.innerHTML = `<div class="advisor-empty" style="padding:48px;text-align:center;color:var(--text-muted);"><i class="bi bi-stars" style="font-size:32px;color:var(--accent);display:block;margin-bottom:12px;"></i>Generating executive intelligence report…</div>`;
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
      container.innerHTML = `<div class="advisor-empty" style="padding:48px;text-align:center;color:var(--text-muted);"><i class="bi bi-exclamation-triangle" style="font-size:32px;color:var(--danger);display:block;margin-bottom:12px;"></i>No report available. Try Generate Report again.</div>`;
    } finally {
      setToolbarBusy(false);
    }
  }

  function renderReport(markdown) {
    const container = Utils.qs('#reportContainer');
    if (!markdown) {
      container.innerHTML = `<div class="advisor-empty" style="padding:48px;text-align:center;color:var(--text-muted);"><i class="bi bi-stars" style="font-size:32px;color:var(--accent);display:block;margin-bottom:12px;"></i>No report generated yet. Click Generate Report to get started.</div>`;
      return;
    }
    const html = typeof marked !== 'undefined' ? marked.parse(markdown) : markdown;
    container.innerHTML = `<div class="panel-body pull-quote-wrap">${html}</div>`;
    container.style.opacity = '0';
    container.style.transform = 'translateY(16px)';
    container.style.transition = 'opacity 0.6s var(--ease-smooth), transform 0.6s var(--ease-smooth)';
    requestAnimationFrame(() => {
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    });
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
