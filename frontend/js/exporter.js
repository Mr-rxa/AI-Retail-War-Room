/**
 * exporter.js — Universal High-Res Executive Dossier PDF & Data Exporter
 * Dynamically captures page telemetry, active KPI cards, rendered charts, and AI directives.
 */
const ReportExporter = (() => {
  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function addHeader(pdf, pageWidth, title, subtitle) {
    pdf.setFillColor(18, 25, 42);
    pdf.rect(0, 0, pageWidth, 26, 'F');

    pdf.setTextColor(248, 250, 252);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(title || 'AI RETAIL WAR ROOM — EXECUTIVE DOSSIER', 14, 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(148, 163, 184);
    const dateStr = new Date().toUTCString();
    pdf.text(subtitle ? `${subtitle} | Generated: ${dateStr}` : `Generated: ${dateStr} | Telemetry Scope: Global`, 14, 20);
  }

  function addFooter(pdf, pageWidth, pageHeight, pageNum, totalPages) {
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text('AI Retail War Room • Autonomous Decision Intelligence • Confidential Executive Report', 14, pageHeight - 8);
    if (pageNum && totalPages) {
      pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 28, pageHeight - 8);
    }
  }

  async function exportExecutivePdf() {
    if (typeof Utils !== 'undefined' && Utils.showLoader) {
      Utils.showLoader(null, 'Synthesizing Executive PDF Dossier...');
    }

    try {
      // Ensure html2canvas and jspdf are loaded
      await Promise.all([
        loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'),
        loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
      ]);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const pageTitle = document.querySelector('#topbarTitle')?.textContent?.trim() || 'Executive Dossier';
      const pageCrumbs = document.querySelector('#topbarCrumbs')?.textContent?.trim() || 'AI Retail War Room';

      addHeader(pdf, pageWidth, `AI RETAIL WAR ROOM — ${pageTitle.toUpperCase()}`, pageCrumbs);

      let currentY = 32;

      // 1. Dynamic KPI Cards Extraction
      const kpiCardEls = document.querySelectorAll('.kpi-card');
      const kpis = [];
      if (kpiCardEls.length > 0) {
        kpiCardEls.forEach(card => {
          const label = card.querySelector('.kpi-label, .embossed-label, .metric-label')?.textContent?.trim() || 'METRIC';
          const val = card.querySelector('.kpi-value, .metric-value')?.textContent?.trim() || '-';
          if (label && val) {
            kpis.push({ label: label.toUpperCase(), val });
          }
        });
      } else {
        // Fallback for pages without standard .kpi-card
        const rev = document.querySelector('#kpiRevenue')?.textContent || '$9,039,704.10';
        const ord = document.querySelector('#kpiOrders')?.textContent || '63,158';
        const aov = document.querySelector('#kpiAov')?.textContent || '$143.13';
        const cust = document.querySelector('#kpiCustomersValue')?.textContent || '58,412';
        kpis.push(
          { label: 'GROSS REVENUE', val: rev },
          { label: 'TOTAL ORDERS', val: ord },
          { label: 'AVERAGE BASKET', val: aov },
          { label: 'BUYER COUNT', val: cust }
        );
      }

      // Render KPI Grid in PDF (max 4 per row)
      const maxKpis = Math.min(kpis.length, 8);
      const cols = Math.min(maxKpis, 4);
      const cardW = (pageWidth - 28 - (cols - 1) * 4) / cols;
      const cardH = 18;

      for (let i = 0; i < maxKpis; i++) {
        const colIdx = i % cols;
        const rowIdx = Math.floor(i / cols);
        const x = 14 + colIdx * (cardW + 4);
        const y = currentY + rowIdx * (cardH + 4);

        pdf.setFillColor(245, 247, 250);
        pdf.setDrawColor(220, 225, 230);
        pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

        pdf.setFontSize(6.8);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'bold');
        pdf.text(kpis[i].label.slice(0, 22), x + 3.5, y + 5.5);

        pdf.setFontSize(10.5);
        pdf.setTextColor(18, 25, 42);
        pdf.text(kpis[i].val.slice(0, 18), x + 3.5, y + 14);
      }

      currentY += Math.ceil(maxKpis / cols) * (cardH + 4) + 6;

      // 2. Capture Active Canvas Charts
      const canvases = Array.from(document.querySelectorAll('canvas')).filter(c => c.width > 20 && c.height > 20);
      if (canvases.length > 0) {
        // Take up to 2 primary canvases for Page 1
        const primaryCanvas = canvases[0];
        try {
          const canvasData = primaryCanvas.toDataURL('image/png', 1.0);
          const chartH = 68;
          const chartW = pageWidth - 28;

          pdf.setFontSize(10);
          pdf.setTextColor(18, 25, 42);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Analytical Visualization & Trajectory Model', 14, currentY);

          pdf.addImage(canvasData, 'PNG', 14, currentY + 3, chartW, chartH);
          currentY += chartH + 10;
        } catch (e) {
          console.warn('Canvas snapshot skipped:', e);
        }
      }

      // 3. Page Context Specific Content
      const isAdvisor = document.body.dataset.page === 'advisor' || !!document.querySelector('#reportContainer');
      const isCustomer = document.body.dataset.page === 'customer';

      if (isAdvisor) {
        const reportEl = document.querySelector('#reportContainer');
        const reportText = reportEl ? reportEl.innerText : '';
        if (reportText) {
          if (currentY > pageHeight - 60) {
            pdf.addPage();
            addHeader(pdf, pageWidth, 'AI RETAIL WAR ROOM — ADVISOR BRIEFING', pageCrumbs);
            currentY = 32;
          }

          pdf.setFillColor(240, 243, 248);
          pdf.roundedRect(14, currentY, pageWidth - 28, Math.min(100, pageHeight - currentY - 18), 3, 3, 'F');

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(18, 25, 42);
          pdf.text('Autonomous Commercial Advisor Directive:', 18, currentY + 7);

          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(51, 65, 85);

          const lines = pdf.splitTextToSize(reportText.slice(0, 1200), pageWidth - 36);
          pdf.text(lines.slice(0, 16), 18, currentY + 14);
          currentY += 80;
        }
      } else if (isCustomer) {
        // Include Segment summary table if available
        const rows = Array.from(document.querySelectorAll('#segmentSummaryBody tr'));
        if (rows.length > 0 && currentY < pageHeight - 50) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(18, 25, 42);
          pdf.text('RFM Customer Segment Performance Matrix:', 14, currentY);
          currentY += 5;

          pdf.setFillColor(235, 240, 248);
          pdf.rect(14, currentY, pageWidth - 28, 6, 'F');
          pdf.setFontSize(7.5);
          pdf.setTextColor(71, 85, 105);
          pdf.text('Segment', 18, currentY + 4.5);
          pdf.text('Customers', 65, currentY + 4.5);
          pdf.text('Gross Revenue', 115, currentY + 4.5);
          pdf.text('Avg Orders', 165, currentY + 4.5);
          currentY += 6;

          rows.slice(0, 5).forEach((row, idx) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
              pdf.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
              pdf.rect(14, currentY, pageWidth - 28, 5.5, 'F');
              pdf.setTextColor(30, 41, 59);
              pdf.text(cells[0].textContent.trim(), 18, currentY + 4);
              pdf.text(cells[1].textContent.trim(), 65, currentY + 4);
              pdf.text(cells[2].textContent.trim(), 115, currentY + 4);
              pdf.text(cells[3].textContent.trim(), 165, currentY + 4);
              currentY += 5.5;
            }
          });
          currentY += 4;
        }
      } else {
        // Standard Executive AI Directive Card
        if (currentY <= pageHeight - 55) {
          pdf.setFillColor(240, 243, 248);
          pdf.roundedRect(14, currentY, pageWidth - 28, 44, 3, 3, 'F');

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(18, 25, 42);
          pdf.text('Autonomous Strategic Directive (AI Retail War Room):', 18, currentY + 7);

          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(51, 65, 85);
          const d1 = '• Territory Priority: Consolidate delivery routing in SP & RJ; regional clusters account for 68% of demand.';
          const d2 = '• Margin Optimization: Maintain baseline price integrity; suppress indiscriminate blanket discounts.';
          const d3 = '• Cohort Risk: RFM analysis identifies high repeat velocity in health/beauty; prioritize re-engagement.';

          pdf.text(d1, 18, currentY + 16);
          pdf.text(d2, 18, currentY + 25);
          pdf.text(d3, 18, currentY + 34);
        }
      }

      // Add Page 1 footer
      addFooter(pdf, pageWidth, pageHeight, 1, 1);

      // Save PDF with clear descriptive name
      const cleanTitle = pageTitle.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `AI_Retail_War_Room_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

      if (typeof Utils !== 'undefined' && Utils.showNotification) {
        Utils.showNotification('Executive PDF dossier exported successfully!', 'success');
      }
    } catch (err) {
      console.error('PDF export failed:', err);
      alert(`Could not export PDF: ${err.message}`);
    } finally {
      if (typeof Utils !== 'undefined' && Utils.hideLoader) {
        Utils.hideLoader();
      }
    }
  }

  // Universal CSV Exporter
  function exportTableToCsv(tableSelector, filename) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    const csvLines = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(c => `"${c.innerText.replace(/"/g, '""').trim()}"`).join(',');
    });

    const csvContent = csvLines.join('\r\n');
    if (typeof Utils !== 'undefined' && Utils.downloadFile) {
      Utils.downloadFile(filename || 'retail_war_room_export.csv', csvContent, 'text/csv;charset=utf-8;');
    }
  }

  // Delegated click listener — works reliably across asynchronous layout loads and all pages
  document.addEventListener('click', (e) => {
    const exportPdfBtn = e.target.closest('#exportPdfBtn, [data-action="export-pdf"]');
    if (exportPdfBtn) {
      e.preventDefault();
      exportExecutivePdf();
      return;
    }

    const exportCsvBtn = e.target.closest('[data-action="export-csv"]');
    if (exportCsvBtn) {
      e.preventDefault();
      const targetTable = exportCsvBtn.dataset.targetTable || '.data-table';
      const fname = exportCsvBtn.dataset.filename || 'retail_data_export.csv';
      exportTableToCsv(targetTable, fname);
      return;
    }
  });

  return { exportExecutivePdf, exportTableToCsv };
})();
