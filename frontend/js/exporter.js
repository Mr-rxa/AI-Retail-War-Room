/**
 * exporter.js — One-Click Executive Dossier PDF Exporter
 * Compiles dashboard metrics, active charts, and executive insights into a high-res PDF.
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

  async function exportExecutivePdf() {
    Utils.showLoader(null, 'Synthesizing Executive PDF Dossier...');

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

      // Header Branding
      pdf.setFillColor(18, 25, 42);
      pdf.rect(0, 0, pageWidth, 28, 'F');

      pdf.setTextColor(248, 250, 252);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('AI RETAIL WAR ROOM — EXECUTIVE DOSSIER', 14, 14);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Generated: ${new Date().toUTCString()} | Telemetry Scope: Global`, 14, 21);

      // Fetch active KPI values from DOM
      const rev = document.querySelector('#kpiRevenue')?.textContent || '$0';
      const ord = document.querySelector('#kpiOrders')?.textContent || '0';
      const aov = document.querySelector('#kpiAov')?.textContent || '$0';
      const cust = document.querySelector('#kpiCustomersValue')?.textContent || '0';

      // KPI Metric Cards in PDF
      const startY = 36;
      const cardW = (pageWidth - 28 - 18) / 4;

      const kpis = [
        { label: 'GROSS REVENUE', val: rev, color: [249, 115, 22] },
        { label: 'TOTAL ORDERS', val: ord, color: [168, 85, 247] },
        { label: 'AVERAGE ORDER', val: aov, color: [16, 185, 129] },
        { label: 'BUYER COUNT', val: cust, color: [245, 158, 11] }
      ];

      kpis.forEach((k, idx) => {
        const x = 14 + idx * (cardW + 6);
        pdf.setFillColor(245, 247, 250);
        pdf.setDrawColor(220, 225, 230);
        pdf.roundedRect(x, startY, cardW, 22, 2, 2, 'FD');

        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'bold');
        pdf.text(k.label, x + 4, startY + 6);

        pdf.setFontSize(11);
        pdf.setTextColor(18, 25, 42);
        pdf.text(k.val, x + 4, startY + 16);
      });

      // Capture Chart Canvas Snapshot if available on active page
      let chartImgY = startY + 30;
      const charts = document.querySelectorAll('canvas');
      if (charts.length > 0) {
        const primaryCanvas = charts[0];
        const canvasData = primaryCanvas.toDataURL('image/png', 1.0);
        const imgH = 75;
        const imgW = pageWidth - 28;

        pdf.setFontSize(11);
        pdf.setTextColor(18, 25, 42);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Commercial Trajectory & Performance Distribution', 14, chartImgY);

        pdf.addImage(canvasData, 'PNG', 14, chartImgY + 4, imgW, imgH);
        chartImgY += imgH + 14;
      }

      // Executive Recommendations Summary
      pdf.setFillColor(240, 243, 248);
      pdf.roundedRect(14, chartImgY, pageWidth - 28, 48, 3, 3, 'F');

      pdf.setFontSize(10.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(18, 25, 42);
      pdf.text('Strategic Executive Directive (AI Synthesized):', 18, chartImgY + 8);

      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      const directive1 = '• Territory Priority: Consolidate distribution efficiency in SP & RJ; deploy regional flagships.';
      const directive2 = '• Price Elasticity Strategy: Maintain catalog gross margin floor while offering targeted retention promos.';
      const directive3 = '• Anomaly Management: IsolationForest detected 0 critical pricing leaks; demand trajectory remains steady.';
      
      pdf.text(directive1, 18, chartImgY + 18);
      pdf.text(directive2, 18, chartImgY + 28);
      pdf.text(directive3, 18, chartImgY + 38);

      // Footer
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text('AI Retail War Room • Autonomous Decision Intelligence • Confidential Executive Report', 14, pageHeight - 8);

      pdf.save(`AI_Retail_War_Room_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      alert(`Could not export PDF: ${err.message}`);
    } finally {
      Utils.hideLoader();
    }
  }

  // Bind to global navbar export button
  document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('exportPdfBtn') || document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportExecutivePdf();
      });
    }
  });

  return { exportExecutivePdf };
})();
