/**
 * presentation.js — Interactive Demo Presentation Mode for Evaluators & Teachers
 * Press 'P' to trigger an auto-guided cinematic executive walkthrough.
 */
const PresentationMode = (() => {
  let isPresenting = false;
  let currentStep = 0;
  let overlayEl = null;

  const PRESENTATION_STEPS = [
    {
      title: "1. Executive KPI Command Center",
      target: ".kpi-section-wrap, .kpi-grid, .scenario-stats-grid",
      narration: "Real-time vectorized telemetry processing aggregating Gross Revenue, Total Orders, Average Order Value, and Customer Volume in sub-15ms."
    },
    {
      title: "2. 3D Spatial Revenue Matrix (Three.js WebGL)",
      target: "#globeContainer, .payment-panel, .row-1-1",
      narration: "Interactive WebGL Spatial Globe rendering regional hub density and live commercial transaction vectors."
    },
    {
      title: "3. Prophet AI Demand Forecasting",
      target: "#revenueChart, .panel",
      narration: "Decomposing seasonal weekly and monthly trend variations with 30-day forward confidence bounds."
    },
    {
      title: "4. Autonomous Decision Intelligence Modules",
      target: ".max-section-head, .stagger-grid",
      narration: "Comprehensive AI tools: RFM Cohort Segmentation, IsolationForest Anomaly Scanners, What-If Modeler, and NLP 'Ask Your Data' Copilot."
    }
  ];

  function enterPresentation() {
    if (isPresenting) return;
    isPresenting = true;
    currentStep = 0;

    overlayEl = document.createElement('div');
    overlayEl.id = 'presentationOverlay';
    overlayEl.innerHTML = `
      <div class="presentation-hud" style="
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100000;
        background: rgba(18, 25, 42, 0.95);
        backdrop-filter: blur(28px);
        border: 1.5px solid var(--accent);
        border-radius: var(--radius-xl);
        padding: 20px 28px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.6), var(--glow-accent);
        max-width: 680px;
        width: 90%;
        color: #F8FAFC;
        animation: floatLoaderIn 0.35s var(--ease-spring);
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;">
            <i class="bi bi-easel-fill"></i> <span id="presStepTitle">Step 1</span>
          </div>
          <button id="exitPresBtn" class="btn-outline" style="padding:2px 8px;font-size:11px;color:#94A3B8;border-color:rgba(255,255,255,0.15);">Exit (Esc)</button>
        </div>
        <div id="presNarration" style="font-size:13.5px;line-height:1.5;color:#E2E8F0;margin-bottom:14px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:11px;color:#94A3B8;">Step <span id="presStepNum">1</span> of ${PRESENTATION_STEPS.length}</div>
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
    if (idx < 0 || idx >= PRESENTATION_STEPS.length) return;
    currentStep = idx;
    const step = PRESENTATION_STEPS[idx];

    document.querySelectorAll('.presentation-highlight').forEach(el => el.classList.remove('presentation-highlight'));

    const targetEl = document.querySelector(step.target);
    if (targetEl) {
      targetEl.classList.add('presentation-highlight');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const titleEl = document.getElementById('presStepTitle');
    const narrEl = document.getElementById('presNarration');
    const numEl = document.getElementById('presStepNum');

    if (titleEl) titleEl.textContent = step.title;
    if (narrEl) narrEl.textContent = step.narration;
    if (numEl) numEl.textContent = idx + 1;
  }

  function nextStep() {
    if (currentStep < PRESENTATION_STEPS.length - 1) {
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
    document.querySelectorAll('.presentation-highlight').forEach(el => el.classList.remove('presentation-highlight'));
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
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

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('presentationModeBtn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        enterPresentation();
      });
    }
  });

  return { enterPresentation, exitPresentation };
})();
