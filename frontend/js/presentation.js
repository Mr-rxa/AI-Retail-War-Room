/**
 * presentation.js — Interactive Demo Presentation Mode for Evaluators & Teachers
 * Press 'P' or click the topbar 'Present' button to trigger an auto-guided cinematic walkthrough.
 */
const PresentationMode = (() => {
  let isPresenting = false;
  let currentStep = 0;
  let overlayEl = null;

  const PAGE_STEPS = {
    dashboard: [
      {
        title: "1. Executive KPI Command Center",
        target: ".kpi-grid, .kpi-section-wrap, .scenario-stats-grid",
        narration: "Real-time vectorized telemetry processing aggregating Gross Revenue (R$ 9.04M), Total Orders (63,210), Average Basket Size (R$ 143.01), and Active Customers in sub-15ms."
      },
      {
        title: "2. 3D Spatial Revenue Matrix (Three.js WebGL)",
        target: "#globeContainer, .payment-panel, .row-1-1",
        narration: "Interactive WebGL Spatial Globe rendering regional hub density and live commercial transaction vectors across Brazilian state capitals."
      },
      {
        title: "3. Prophet AI Demand Forecasting",
        target: "#revenueChart, .panel",
        narration: "Decomposing seasonal weekly and monthly trend variations with 30-day forward confidence bounds and historical trend projection."
      },
      {
        title: "4. Autonomous Decision Intelligence Modules",
        target: ".category-panel, .payment-panel, .panel",
        narration: "Comprehensive AI capabilities: RFM Cohort Segmentation, IsolationForest Outlier Scanners, What-If Modeler, and NLP 'Ask Your Data' Copilot."
      }
    ],
    scenario: [
      {
        title: "1. Strategic Commercial Levers",
        target: ".controls-panel, .slider-group",
        narration: "Interactive simulation levers: Adjust catalog price elasticity (ε = -1.35), marketing ad spend blitz, customer retention deflection, and regional hub expansion."
      },
      {
        title: "2. Real-Time Simulated Financials",
        target: ".scenario-stats-grid",
        narration: "Dynamic recalculation of Projected Gross Revenue, Order Volume, Simulated AOV, and Net Margin adjusted for advertising cost deductions."
      },
      {
        title: "3. 30-Day Simulated Trajectory",
        target: "#scenarioChart, .panel",
        narration: "Dual-trajectory horizon overlaying baseline sales demand against the simulated commercial scenario with instant sub-millisecond local compute."
      },
      {
        title: "4. AI Execution Risk Evaluation",
        target: ".risk-meter-wrap",
        narration: "Algorithmic risk assessment providing real-time evaluation: Optimal Commercial Strategy, Moderate Execution Risk, or Commercial Volatility."
      }
    ],
    customer: [
      {
        title: "1. Customer Health & Retention Index",
        target: ".kpi-grid, .scenario-stats-grid, .stats-row",
        narration: "High-level customer relationship metrics tracking Customer Health Index (58 Watch), Repeat Buyer Rate (5.4%), and average order cadence."
      },
      {
        title: "2. RFM Cohort Behavioral Segments",
        target: ".chart-panel, .panel, canvas",
        narration: "Multi-dimensional segmentation classifying customer clusters into Champions, Regular Loyalists, and At-Risk accounts with automated churn mitigation."
      }
    ],
    chat: [
      {
        title: "1. Retail Neural Copilot (Ask Data AI)",
        target: ".chat-header, .copilot-head, .chat-panel",
        narration: "Conversational Decision Intelligence grounded in telemetry with zero hallucination guarantee, translating business queries into analytical answers."
      },
      {
        title: "2. Prompt Grounding & Auto-Charts",
        target: ".chat-thread, .chat-container, .panel",
        narration: "Natural language query synthesis automatically generating executive commercial summaries, metric extraction chips, and interactive line charts."
      }
    ]
  };

  function getCurrentSteps() {
    const page = document.body?.dataset?.page || 'dashboard';
    if (PAGE_STEPS[page]) {
      return PAGE_STEPS[page];
    }
    // Generic fallback for any other page
    const panels = Array.from(document.querySelectorAll('.panel, .stat-card, .controls-panel, main > div')).slice(0, 3);
    if (panels.length > 0) {
      return panels.map((el, i) => ({
        title: `Feature Section ${i + 1}`,
        target: el,
        narration: `Interactive overview of ${document.title || 'this module'}: inspect operational metrics, visual charts, and analytical controls.`
      }));
    }
    return PAGE_STEPS.dashboard;
  }

  function enterPresentation() {
    if (isPresenting) return;
    isPresenting = true;
    currentStep = 0;

    document.body.classList.add('presentation-active');

    const steps = getCurrentSteps();
    const isDashboard = (document.body?.dataset?.page || '') === 'dashboard';

    overlayEl = document.createElement('div');
    overlayEl.id = 'presentationOverlay';
    overlayEl.innerHTML = `
      <div class="presentation-hud">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;">
            <i class="bi bi-easel-fill"></i> <span id="presStepTitle">Step 1</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${!isDashboard ? `<a href="/dashboard?present=1" class="btn-outline" style="padding:2px 8px;font-size:11px;color:var(--accent);border-color:var(--accent);text-decoration:none;"><i class="bi bi-grid-1x2-fill"></i> Dashboard Tour</a>` : ''}
            <button id="exitPresBtn" class="btn-outline" style="padding:2px 8px;font-size:11px;color:#94A3B8;border-color:rgba(255,255,255,0.15);">Exit (Esc)</button>
          </div>
        </div>
        <div id="presNarration" style="font-size:13.5px;line-height:1.55;color:#E2E8F0;margin-bottom:14px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:11px;color:#94A3B8;">Step <span id="presStepNum">1</span> of ${steps.length}</div>
          <div style="display:flex;gap:8px;">
            <button id="presPrevBtn" class="btn-outline" style="padding:4px 12px;font-size:12px;"><i class="bi bi-arrow-left"></i> Prev</button>
            <button id="presNextBtn" class="btn-primary" style="padding:4px 14px;font-size:12px;">Next <i class="bi bi-arrow-right"></i></button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlayEl);

    overlayEl.querySelector('#exitPresBtn').addEventListener('click', exitPresentation);
    overlayEl.querySelector('#presPrevBtn').addEventListener('click', prevStep);
    overlayEl.querySelector('#presNextBtn').addEventListener('click', nextStep);

    showStep(0);
  }

  function showStep(idx) {
    const steps = getCurrentSteps();
    if (idx < 0 || idx >= steps.length) return;
    currentStep = idx;
    const step = steps[idx];

    document.querySelectorAll('.presentation-highlight').forEach(el => el.classList.remove('presentation-highlight'));

    let targetEl = null;
    if (typeof step.target === 'string') {
      targetEl = document.querySelector(step.target);
    } else if (step.target instanceof HTMLElement) {
      targetEl = step.target;
    }

    if (targetEl) {
      targetEl.classList.add('presentation-highlight');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const titleEl = document.getElementById('presStepTitle');
    const narrEl = document.getElementById('presNarration');
    const numEl = document.getElementById('presStepNum');
    const nextBtn = document.getElementById('presNextBtn');

    if (titleEl) titleEl.textContent = step.title;
    if (narrEl) narrEl.textContent = step.narration;
    if (numEl) numEl.textContent = idx + 1;

    if (nextBtn) {
      if (idx === steps.length - 1) {
        nextBtn.innerHTML = `Finish <i class="bi bi-check-lg"></i>`;
      } else {
        nextBtn.innerHTML = `Next <i class="bi bi-arrow-right"></i>`;
      }
    }
  }

  function nextStep() {
    const steps = getCurrentSteps();
    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1);
    } else {
      exitPresentation();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  }

  function exitPresentation() {
    isPresenting = false;
    document.body.classList.remove('presentation-active');
    document.querySelectorAll('.presentation-highlight').forEach(el => el.classList.remove('presentation-highlight'));
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    // Clean up query param if present
    const url = new URL(window.location.href);
    if (url.searchParams.has('present')) {
      url.searchParams.delete('present');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  }

  // Keyboard shortcut listener
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'p' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      if (isPresenting) exitPresentation();
      else enterPresentation();
    } else if (e.key === 'Escape' && isPresenting) {
      exitPresentation();
    } else if ((e.key === 'ArrowRight' || e.key === ' ') && isPresenting) {
      nextStep();
    } else if (e.key === 'ArrowLeft' && isPresenting) {
      prevStep();
    }
  });

  // Delegated click listener — works even if navbar is injected asynchronously later
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#presentationModeBtn, [data-action="present"]');
    if (btn) {
      e.preventDefault();
      enterPresentation();
    }
  });

  // URL query parameter auto-start (?present=1 or ?present=true)
  function checkUrlAutoStart() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('present') === '1' || params.get('present') === 'true') {
      setTimeout(() => {
        enterPresentation();
      }, 700);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkUrlAutoStart);
  } else {
    checkUrlAutoStart();
  }

  return { enterPresentation, exitPresentation };
})();
