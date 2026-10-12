/**
 * chat.js — Front-end controller for Ask Your Data NLP Assistant
 */
document.addEventListener('DOMContentLoaded', async () => {
  await Utils.loadLayout();
  Utils.ensureScopeBanner();

  const messagesArea = document.getElementById('chatMessagesArea');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const clearBtn = document.getElementById('clearChatBtn');
  const quickPrompts = document.querySelectorAll('.prompt-chip');

  let chartCounter = 0;

  // Render a User message bubble
  function appendUserMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.innerHTML = `<div class="bubble-content">${escapeHtml(text)}</div>`;
    messagesArea.appendChild(bubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  // Render an AI response bubble with optional chart & metrics
  function appendAiMessage(answer, chartType, chartData, highlights = [], followups = []) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';

    chartCounter++;
    const chartCanvasId = `chatChart_${chartCounter}`;

    let highlightsHtml = '';
    if (highlights && highlights.length) {
      highlightsHtml = `
        <div class="metric-highlights-grid">
          ${highlights.map(h => `
            <div class="metric-highlight-pill">
              <span>${escapeHtml(h.label)}:</span>
              <strong>${escapeHtml(h.value)}</strong>
            </div>
          `).join('')}
        </div>
      `;
    }

    let chartContainerHtml = '';
    if (chartType && chartData) {
      chartContainerHtml = `
        <div class="chat-inline-chart-wrap">
          <canvas id="${chartCanvasId}"></canvas>
        </div>
      `;
    }

    let followupsHtml = '';
    if (followups && followups.length) {
      followupsHtml = `
        <div style="margin-top:14px;font-size:11.5px;color:var(--text-muted);">
          <i class="bi bi-lightbulb-fill" style="color:var(--accent-amber);"></i> Suggested Follow-ups:
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
            ${followups.map(f => `<button class="prompt-chip followup-chip" style="font-size:11px;padding:4px 10px;" data-prompt="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join('')}
          </div>
        </div>
      `;
    }

    bubble.innerHTML = `
      <div class="chat-avatar" style="width: 32px; height: 32px; font-size: 16px;"><i class="bi bi-robot"></i></div>
      <div class="bubble-content" style="width: 100%;">
        <div>${formatMarkdown(answer)}</div>
        ${highlightsHtml}
        ${chartContainerHtml}
        ${followupsHtml}
      </div>
    `;

    messagesArea.appendChild(bubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    // Render inline Chart.js if present
    if (chartType && chartData) {
      setTimeout(() => {
        const cvs = document.getElementById(chartCanvasId);
        if (cvs && typeof Chart !== 'undefined') {
          new Chart(cvs, {
            type: chartType,
            data: chartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: chartType !== 'bar' && chartType !== 'line',
                  labels: { color: ThemeManager.getTheme() === 'dark' ? '#CBD5E1' : '#5C5248', font: { family: 'Inter', size: 11 } }
                }
              },
              scales: chartType === 'bar' || chartType === 'line' ? {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } }
              } : {}
            }
          });
        }
      }, 50);
    }
  }

  // Submit query
  async function submitQuery(queryText) {
    if (!queryText || !queryText.trim()) return;
    const query = queryText.trim();
    chatInput.value = '';

    appendUserMessage(query);

    // Show temporary typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble ai typing-indicator-bubble';
    typingBubble.innerHTML = `
      <div class="chat-avatar" style="width: 32px; height: 32px; font-size: 16px;"><i class="bi bi-robot"></i></div>
      <div class="bubble-content" style="color:var(--text-muted);font-style:italic;">
        <i class="bi bi-cpu spin"></i> Querying telemetry & computing analytical synthesis...
      </div>
    `;
    messagesArea.appendChild(typingBubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    try {
      const filters = Utils.getGlobalFilters();
      const res = await fetch(`${CONFIG.API_BASE_URL}/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionStorage.getItem('airw_session_id') || ''
        },
        body: JSON.stringify({ query, ...filters })
      });

      const data = await res.json();
      typingBubble.remove();

      if (data.success) {
        appendAiMessage(data.answer, data.chart_type, data.chart_data, data.metric_highlights, data.suggested_followups);
      } else {
        appendAiMessage(data.answer || "Could not analyze query. Please try again.", null, null);
      }
    } catch (err) {
      typingBubble.remove();
      appendAiMessage(`Error analyzing query: ${err.message}`, null, null);
    }
  }

  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    submitQuery(chatInput.value);
  });

  quickPrompts.forEach(chip => {
    chip.addEventListener('click', () => {
      submitQuery(chip.dataset.prompt);
    });
  });

  messagesArea.addEventListener('click', e => {
    const followup = e.target.closest('.followup-chip');
    if (followup) {
      submitQuery(followup.dataset.prompt);
    }
  });

  clearBtn.addEventListener('click', () => {
    messagesArea.innerHTML = `
      <div class="chat-bubble ai">
        <div class="chat-avatar" style="width: 32px; height: 32px; font-size: 16px;"><i class="bi bi-robot"></i></div>
        <div class="bubble-content">
          <strong>Chat history cleared.</strong> Ask any retail or business intelligence question to begin.
        </div>
      </div>
    `;
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }
});
