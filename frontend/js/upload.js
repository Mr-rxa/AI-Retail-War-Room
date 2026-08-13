/**
 * upload.js — Controller for the multi-step CSV Upload Wizard
 */

document.addEventListener('DOMContentLoaded', () => {
  Utils.loadLayout();

  let currentStep = 1;
  let selectedFile = null;
  let uploadAnalysis = null;
  let selectedCurrency = { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' };
  let confirmedMapping = {};

  const currenciesList = [
    { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' },
    { code: 'EUR', symbol: '€', name: 'Euro', position: 'before' },
    { code: 'GBP', symbol: '£', name: 'British Pound', position: 'before' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', position: 'before' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', position: 'before' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', position: 'before' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', position: 'before' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', position: 'before' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', position: 'before' }
  ];

  // DOM Elements
  const dropZone = Utils.qs('#dropZone');
  const fileInput = Utils.qs('#fileInput');
  const selectedFileInfo = Utils.qs('#selectedFileInfo');
  const selectedFileName = Utils.qs('#selectedFileName');
  const selectedFileSize = Utils.qs('#selectedFileSize');
  const changeFileBtn = Utils.qs('#changeFileBtn');
  const currencyGrid = Utils.qs('#currencyGrid');
  const mappingTableBody = Utils.qs('#mappingTableBody');
  const prevStepBtn = Utils.qs('#prevStepBtn');
  const nextStepBtn = Utils.qs('#nextStepBtn');
  const launchBtn = Utils.qs('#launchBtn');

  // Drag & Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
  });

  changeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    uploadAnalysis = null;
    fileInput.value = '';
    selectedFileInfo.style.display = 'none';
    dropZone.style.display = 'block';
    nextStepBtn.disabled = true;
  });

  function handleFileSelect(file) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('Please select a valid .csv file');
      return;
    }
    const maxBytes = 100 * 1024 * 1024; // 100 MB
    if (file.size > maxBytes) {
      alert(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 100 MB.`);
      return;
    }
    selectedFile = file;
    selectedFileName.textContent = file.name;
    selectedFileSize.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    dropZone.style.display = 'none';
    selectedFileInfo.style.display = 'flex';
    nextStepBtn.disabled = false;
  }


  // Render Currencies
  function renderCurrencies() {
    currencyGrid.innerHTML = '';
    currenciesList.forEach(curr => {
      const card = Utils.el('div', `currency-card ${curr.code === selectedCurrency.code ? 'selected' : ''}`);
      card.innerHTML = `
        <div class="currency-symbol">${curr.symbol}</div>
        <div class="currency-details">
          <div class="code">${curr.code}</div>
          <div class="name">${curr.name}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        selectedCurrency = curr;
        Utils.qsa('.currency-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
      currencyGrid.appendChild(card);
    });
  }

  // Render Mapping Table
  function renderMappingTable() {
    if (!uploadAnalysis) return;
    mappingTableBody.innerHTML = '';
    const detected = uploadAnalysis.detected_mapping;
    const csvCols = uploadAnalysis.columns;
    const fields = uploadAnalysis.field_definitions;

    Object.keys(fields).forEach(fieldKey => {
      const fieldMeta = fields[fieldKey];
      const match = detected[fieldKey] || { csv_column: null, confidence: 0 };
      
      const tr = document.createElement('tr');
      
      // Status badge
      const statusBadge = fieldMeta.required 
        ? '<span class="field-tag required">Required</span>' 
        : '<span class="field-tag optional">Optional</span>';
      
      // Select dropdown
      let optionsHtml = `<option value="">-- Ignore / Missing --</option>`;
      csvCols.forEach(col => {
        const isSelected = match.csv_column === col ? 'selected' : '';
        optionsHtml += `<option value="${col}" ${isSelected}>${col}</option>`;
      });

      // Confidence badge
      let confBadge = `<span class="confidence-badge confidence-none">0%</span>`;
      if (match.confidence >= 80) {
        confBadge = `<span class="confidence-badge confidence-high">${match.confidence}% match</span>`;
      } else if (match.confidence >= 50) {
        confBadge = `<span class="confidence-badge confidence-medium">${match.confidence}% match</span>`;
      }

      tr.innerHTML = `
        <td><strong>${fieldMeta.label}</strong></td>
        <td>${statusBadge}</td>
        <td>
          <select class="mapping-select" data-field="${fieldKey}">
            ${optionsHtml}
          </select>
        </td>
        <td>${confBadge}</td>
      `;

      mappingTableBody.appendChild(tr);
    });
  }

  // Step Navigation
  nextStepBtn.addEventListener('click', async () => {
    if (currentStep === 1) {
      if (!selectedFile) return;
      nextStepBtn.disabled = true;
      nextStepBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Analyzing...`;

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const res = await fetch(`${CONFIG.API_BASE_URL}/upload/analyze`, {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Analysis failed');
        }

        uploadAnalysis = json.data;
        renderCurrencies();
        goToStep(2);
      } catch (err) {
        alert(`Error analyzing CSV: ${err.message}`);
      } finally {
        nextStepBtn.disabled = false;
        nextStepBtn.innerHTML = `Next <i class="bi bi-arrow-right"></i>`;
      }
    } else if (currentStep === 2) {
      renderMappingTable();
      goToStep(3);
    } else if (currentStep === 3) {
      // Validate mapping
      confirmedMapping = {};
      const selects = Utils.qsa('.mapping-select');
      selects.forEach(sel => {
        const field = sel.dataset.field;
        const val = sel.value;
        if (val) confirmedMapping[field] = val;
      });

      // Check required fields
      const requiredFields = ['order_id', 'order_date', 'customer_id', 'payment_value'];
      const missing = requiredFields.filter(f => !confirmedMapping[f]);

      if (missing.length > 0) {
        alert(`Please map all required fields: ${missing.join(', ')}`);
        return;
      }

      // Populate Step 4 Preview & Stats
      populatePreviewAndStats();
      goToStep(4);
    }
  });

  prevStepBtn.addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  function populatePreviewAndStats() {
    if (!uploadAnalysis) return;
    const stats = uploadAnalysis.stats;
    Utils.qs('#statRows').textContent = (stats.rows || 0).toLocaleString();
    Utils.qs('#statDateRange').textContent = stats.date_range || 'N/A';
    Utils.qs('#statRevenue').textContent = stats.sample_revenue 
      ? `${selectedCurrency.symbol} ${stats.sample_revenue.toLocaleString()}` 
      : 'N/A';
    Utils.qs('#statCurrency').textContent = `${selectedCurrency.code} (${selectedCurrency.symbol})`;

    // Preview table
    const preview = uploadAnalysis.preview;
    const previewHeader = Utils.qs('#previewHeader');
    const previewBody = Utils.qs('#previewBody');
    previewHeader.innerHTML = '';
    previewBody.innerHTML = '';

    if (preview.length > 0) {
      const keys = Object.keys(preview[0]);
      keys.forEach(k => {
        const th = document.createElement('th');
        th.textContent = k;
        previewHeader.appendChild(th);
      });

      preview.forEach(row => {
        const tr = document.createElement('tr');
        keys.forEach(k => {
          const td = document.createElement('td');
          td.textContent = row[k] !== undefined ? row[k] : '';
          tr.appendChild(td);
        });
        previewBody.appendChild(tr);
      });
    }
  }

  // Launch / Confirm Upload
  launchBtn.addEventListener('click', async () => {
    launchBtn.disabled = true;
    launchBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Processing & Launching...`;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mapping', JSON.stringify(confirmedMapping));
      formData.append('currency', JSON.stringify(selectedCurrency));

      const session_id = localStorage.getItem('airw_session_id') || `session_${Date.now()}`;
      localStorage.setItem('airw_session_id', session_id);

      const res = await fetch(`${CONFIG.API_BASE_URL}/upload/confirm`, {
        method: 'POST',
        headers: { 'X-Session-ID': session_id },
        body: formData
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Confirmation failed');
      }

      // Store currency globally, clear old caches, and run telemetry progress modal
      Utils.showTelemetryProgress('Processing CSV Telemetry & AI Models...');
      localStorage.setItem('airw_currency', JSON.stringify(selectedCurrency));
      Utils.clearAllCaches();
      await Utils.prefetchAll(true);
      Utils.hideTelemetryProgress();

      // Redirect to Dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      alert(`Error finalizing upload: ${err.message}`);
      launchBtn.disabled = false;
      launchBtn.innerHTML = `<i class="bi bi-rocket-takeoff-fill"></i> Analyze My Data`;
    }
  });

  function goToStep(step) {
    currentStep = step;
    Utils.qsa('.wizard-step').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.toggle('active', s === step);
      el.classList.toggle('completed', s < step);
    });

    Utils.qsa('.step-panel').forEach((el, idx) => {
      el.classList.toggle('active', idx + 1 === step);
    });

    prevStepBtn.style.display = step > 1 ? 'inline-block' : 'none';
    if (step === 4) {
      nextStepBtn.style.display = 'none';
      launchBtn.style.display = 'inline-block';
    } else {
      nextStepBtn.style.display = 'inline-block';
      launchBtn.style.display = 'none';
    }
  }
});
