/**
 * bi_studio.js — Interactive SQL Data Studio & Text-to-SQL Analytics
 */

(() => {
  let activeQueryResult = null;
  let activeChartInstance = null;
  let activeView = 'table'; // 'table' or 'chart'

  function setTopbar() {
    if (Utils.qs('#topbarTitle')) Utils.qs('#topbarTitle').textContent = 'BI Data Studio — Ad-Hoc SQL & Analytics Engine';
    if (Utils.qs('#topbarCrumbs')) Utils.qs('#topbarCrumbs').textContent = 'AI Retail War Room / In-Memory Decision Intelligence';
    const refreshBtn = Utils.qs('#refreshBtn');
    if (refreshBtn) refreshBtn.onclick = () => {
      loadSchema();
      runActiveQuery();
    };
  }

  // Load Database Schema
  async function loadSchema() {
    const container = Utils.qs('#schemaContainer');
    try {
      const data = await API.getBiSchema();
      if (!data || !data.success) throw new Error(data?.error || 'Failed to fetch database schema.');

      const tables = data.tables || [];
      if (Utils.qs('#biTableCount')) Utils.qs('#biTableCount').textContent = tables.length;
      if (Utils.qs('#biEngineType')) Utils.qs('#biEngineType').textContent = data.is_demo ? 'SQLite Demo Mode' : 'SQLite Session Mode';

      if (!tables.length) {
        container.innerHTML = '<div style="color:var(--text-muted);font-size:11.5px;padding:12px;">No tables found in catalog.</div>';
        return;
      }

      container.innerHTML = tables.map(t => `
        <div class="schema-table-item">
          <div class="schema-table-header" onclick="this.nextElementSibling.classList.toggle('hidden');">
            <span><i class="bi bi-table" style="color:var(--accent);"></i> <strong>${t.name}</strong></span>
            <span class="badge muted" style="font-size:9.5px;">${t.row_count} rows</span>
          </div>
          <div class="schema-col-list">
            ${t.columns.map(c => `
              <div class="schema-col-item">
                <span title="Click to insert into editor" onclick="insertAtCursor('${c.name}')">${c.name}</span>
                <span style="font-size:10px;">${c.type}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');

    } catch (err) {
      console.error(err);
      container.innerHTML = `<div style="color:var(--danger);font-size:11.5px;padding:12px;">Schema error: ${err.message}</div>`;
    }
  }

  // Load Curated BI Templates
  async function loadTemplates() {
    const select = Utils.qs('#sqlTemplateSelect');
    if (!select) return;

    try {
      const res = await API.getBiTemplates();
      if (res && res.success && res.templates) {
        res.templates.forEach((tmpl, idx) => {
          const opt = document.createElement('option');
          opt.value = tmpl.sql;
          opt.textContent = `[${tmpl.category}] ${tmpl.title}`;
          select.appendChild(opt);
        });

        select.addEventListener('change', (e) => {
          if (e.target.value) {
            Utils.qs('#sqlTextarea').value = e.target.value;
            runActiveQuery();
          }
        });
      }
    } catch (err) {
      console.warn('Failed loading templates:', err);
    }
  }

  // Helper to insert column name into SQL editor
  window.insertAtCursor = function(text) {
    const textarea = Utils.qs('#sqlTextarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;

    textarea.value = val.substring(0, start) + text + val.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  };

  // Run Query
  async function runActiveQuery() {
    const sql = Utils.qs('#sqlTextarea').value.trim();
    if (!sql) return;

    const runBtn = Utils.qs('#runSqlBtn');
    const statusBadge = Utils.qs('#queryStatusBadge');
    const execInfo = Utils.qs('#queryExecInfo');

    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="bi bi-cpu spin"></i> Executing...';
    statusBadge.className = 'badge info';
    statusBadge.innerHTML = '<i class="bi bi-hourglass-split"></i> Running';

    try {
      const res = await API.runBiQuery(sql);

      if (!res.success) {
        statusBadge.className = 'badge danger';
        statusBadge.innerHTML = '<i class="bi bi-x-circle-fill"></i> Error';
        execInfo.textContent = `Error in ${res.execution_ms || 0} ms`;
        renderError(res.error || 'Failed executing query');
        return;
      }

      activeQueryResult = res;
      statusBadge.className = 'badge success';
      statusBadge.innerHTML = '<i class="bi bi-check-circle-fill"></i> Success';
      execInfo.textContent = `Execution: ${res.execution_ms} ms • Rows: ${res.row_count} ${res.has_more ? '(truncated to max 1,000)' : ''}`;

      if (Utils.qs('#biQueryLatency')) {
        Utils.qs('#biQueryLatency').textContent = `${res.execution_ms} ms`;
      }

      renderTable(res.columns, res.rows);

      if (res.suggested_chart) {
        renderChart(res.suggested_chart);
      }

    } catch (err) {
      console.error(err);
      statusBadge.className = 'badge danger';
      statusBadge.innerHTML = '<i class="bi bi-x-circle-fill"></i> Network Error';
      renderError(err.message);
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = '<i class="bi bi-play-fill"></i> Run Query (⌘Enter)';
    }
  }

  // Render Table Results
  function renderTable(columns, rows) {
    const thead = Utils.qs('#biTableHead');
    const tbody = Utils.qs('#biTableBody');

    if (!columns || !columns.length) {
      thead.innerHTML = '<tr><th>Result</th></tr>';
      tbody.innerHTML = '<tr><td style="color:var(--text-muted);padding:18px;">Query returned zero columns.</td></tr>';
      return;
    }

    thead.innerHTML = `<tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>`;

    if (!rows || !rows.length) {
      tbody.innerHTML = `<tr><td colspan="${columns.length}" style="color:var(--text-muted);padding:24px;text-align:center;">Query executed successfully with 0 rows returned.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.slice(0, 200).map(row => `
      <tr>
        ${columns.map(c => {
          const val = row[c];
          const isNum = typeof val === 'number';
          return `<td class="${isNum ? 'num' : ''}">${val !== null && val !== undefined ? (isNum ? Number(val).toLocaleString() : val) : '<span style="color:var(--text-muted);font-style:italic;">NULL</span>'}</td>`;
        }).join('')}
      </tr>
    `).join('');

    if (rows.length > 200) {
      tbody.innerHTML += `<tr><td colspan="${columns.length}" style="text-align:center;color:var(--text-muted);padding:10px;font-style:italic;">Showing first 200 of ${rows.length} rows in browser preview. Export CSV for full result set.</td></tr>`;
    }
  }

  // Render Chart Visualization
  function renderChart(chartSpec) {
    const canvas = Utils.qs('#biChartCanvas');
    if (!canvas || typeof Chart === 'undefined') return;

    if (activeChartInstance) {
      activeChartInstance.destroy();
      activeChartInstance = null;
    }

    const type = chartSpec.type || 'bar';
    const labels = chartSpec.labels || [];
    const data = chartSpec.data || [];

    const colors = [
      '#F97316', '#10B981', '#38BDF8', '#F59E0B', '#A855F7',
      '#EC4899', '#64748B', '#14B8A6', '#8B5CF6', '#F43F5E'
    ];

    activeChartInstance = new Chart(canvas, {
      type: type,
      data: {
        labels: labels,
        datasets: [{
          label: `${chartSpec.y_axis} by ${chartSpec.x_axis}`,
          data: data,
          backgroundColor: type === 'doughnut' ? colors.slice(0, labels.length) : (type === 'line' ? 'rgba(56, 189, 248, 0.15)' : '#F97316'),
          borderColor: type === 'line' ? '#38BDF8' : '#EA580C',
          fill: type === 'line',
          tension: 0.35,
          borderWidth: 1.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: type === 'doughnut',
            labels: { color: ThemeManager.getTheme() === 'dark' ? '#CBD5E1' : '#475569' }
          }
        },
        scales: type !== 'doughnut' ? {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } }
        } : {}
      }
    });
  }

  function renderError(message) {
    const tbody = Utils.qs('#biTableBody');
    tbody.innerHTML = `
      <tr>
        <td style="color:var(--danger);padding:24px;font-family:monospace;background:rgba(239, 68, 68, 0.05);">
          <i class="bi bi-exclamation-triangle-fill"></i> ${message}
        </td>
      </tr>
    `;
  }

  // AI Text to SQL
  async function generateTextToSql() {
    const input = Utils.qs('#copilotInput');
    const prompt = (input?.value || '').trim();
    if (!prompt) return;

    const btn = Utils.qs('#copilotGenerateBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-cpu spin"></i> Synthesizing SQL...';

    try {
      const res = await API.textToSql(prompt);
      if (res && res.success && res.sql) {
        Utils.qs('#sqlTextarea').value = res.sql;
        runActiveQuery();
      } else {
        alert(res?.error || 'Could not synthesize SQL. Please try phrasing differently.');
      }
    } catch (err) {
      alert(`Text-to-SQL error: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-cpu-fill"></i> Generate SQL';
    }
  }

  // Setup Event Handlers
  function setupEvents() {
    Utils.qs('#runSqlBtn')?.addEventListener('click', runActiveQuery);
    Utils.qs('#copilotGenerateBtn')?.addEventListener('click', generateTextToSql);
    Utils.qs('#copilotInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') generateTextToSql();
    });

    // Keyboard shortcut ⌘Enter / Ctrl+Enter in textarea
    Utils.qs('#sqlTextarea')?.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runActiveQuery();
      }
    });

    Utils.qs('#formatSqlBtn')?.addEventListener('click', () => {
      const ta = Utils.qs('#sqlTextarea');
      let val = ta.value.trim();
      val = val.replace(/\s+/g, ' ')
               .replace(/\bSELECT\b/gi, '\nSELECT')
               .replace(/\bFROM\b/gi, '\nFROM')
               .replace(/\bWHERE\b/gi, '\nWHERE')
               .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
               .replace(/\bHAVING\b/gi, '\nHAVING')
               .replace(/\bORDER BY\b/gi, '\nORDER BY')
               .replace(/\bLIMIT\b/gi, '\nLIMIT')
               .trim();
      ta.value = val;
    });

    Utils.qs('#clearSqlBtn')?.addEventListener('click', () => {
      Utils.qs('#sqlTextarea').value = '';
      Utils.qs('#sqlTextarea').focus();
    });

    // View Toggle
    Utils.qs('#viewTableBtn')?.addEventListener('click', () => {
      activeView = 'table';
      Utils.qs('#viewTableBtn').classList.add('active');
      Utils.qs('#viewChartBtn').classList.remove('active');
      Utils.qs('#resultsTableWrap').style.display = 'block';
      Utils.qs('#resultsChartWrap').style.display = 'none';
    });

    Utils.qs('#viewChartBtn')?.addEventListener('click', () => {
      activeView = 'chart';
      Utils.qs('#viewChartBtn').classList.add('active');
      Utils.qs('#viewTableBtn').classList.remove('active');
      Utils.qs('#resultsTableWrap').style.display = 'none';
      Utils.qs('#resultsChartWrap').style.display = 'block';
      if (activeQueryResult && activeQueryResult.suggested_chart) {
        renderChart(activeQueryResult.suggested_chart);
      }
    });

    // Export CSV
    Utils.qs('#exportCsvBtn')?.addEventListener('click', () => {
      if (!activeQueryResult || !activeQueryResult.rows || !activeQueryResult.rows.length) {
        alert('No query results available to export.');
        return;
      }
      Utils.downloadCsv(
        `bi_query_result_${new Date().toISOString().slice(0, 10)}.csv`,
        activeQueryResult.rows,
        activeQueryResult.columns
      );
    });

    // Export JSON
    Utils.qs('#exportJsonBtn')?.addEventListener('click', () => {
      if (!activeQueryResult || !activeQueryResult.rows) {
        alert('No query results available to export.');
        return;
      }
      Utils.downloadFile(
        `bi_query_result_${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(activeQueryResult.rows, null, 2),
        'application/json'
      );
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await Utils.loadLayout();
    setTopbar();
    setupEvents();
    loadSchema();
    loadTemplates();
    runActiveQuery(); // Initial sample query run
  });

})();
