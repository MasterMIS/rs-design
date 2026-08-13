import jsPDF from 'jspdf';

export type PdfColumn = {
  header: string;
  getValue: (row: any) => string;
  width: number;
};

type ExportDoerTasksPdfOptions = {
  title: string;
  filename: string;
  tasks: any[];
  columns: PdfColumn[];
  getDoerName: (row: any) => string;
};

const PAGE_MARGIN = 10;
const LINE_HEIGHT = 3.6;
const CELL_PAD_X = 1.2;
const CELL_PAD_Y = 1.2;
const FONT_SIZE = 7;
const HEADER_FONT_SIZE = 7;
const TITLE_COLOR: [number, number, number] = [30, 61, 143];
const HEADER_BG: [number, number, number] = [30, 61, 143];
const DOER_BG: [number, number, number] = [241, 245, 249];
const ALT_ROW: [number, number, number] = [248, 250, 252];

function groupByDoer(tasks: any[], getDoerName: (row: any) => string) {
  const groups = new Map<string, any[]>();
  for (const task of tasks) {
    const name = String(getDoerName(task) || '').trim() || 'Unassigned';
    const list = groups.get(name) || [];
    list.push(task);
    groups.set(name, list);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function toLines(pdf: jsPDF, value: string, maxWidth: number) {
  const lines = pdf.splitTextToSize(value || '-', maxWidth);
  return Array.isArray(lines) ? lines : [lines];
}

export function exportDoerTasksPdf({
  title,
  filename,
  tasks,
  columns,
  getDoerName,
}: ExportDoerTasksPdfOptions) {
  if (!tasks || tasks.length === 0) {
    alert('No data available to export');
    return;
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const totalWeight = columns.reduce((sum, col) => sum + col.width, 0);
  const colWidths = columns.map((col) => (col.width / totalWeight) * contentWidth);
  const generatedAt = new Date().toLocaleString('en-GB');
  const footerY = pageHeight - 7;
  let y = 26;
  let pageNum = 1;

  const drawPageChrome = (isFirst: boolean) => {
    pdf.setFillColor(...TITLE_COLOR);
    pdf.rect(0, 0, pageWidth, 16, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(title, PAGE_MARGIN, 10.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(`Generated: ${generatedAt}`, pageWidth - PAGE_MARGIN, 10.5, { align: 'right' });

    if (isFirst) {
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(9);
      pdf.text(
        `${tasks.length} task${tasks.length === 1 ? '' : 's'}  •  Grouped by doer  •  Current filters applied`,
        PAGE_MARGIN,
        22
      );
    }

    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Page ${pageNum}`, pageWidth / 2, footerY, { align: 'center' });
  };

  const startNewPage = () => {
    pdf.addPage();
    pageNum += 1;
    drawPageChrome(false);
    y = 22;
  };

  const drawTableHeader = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(HEADER_FONT_SIZE);
    const headerLines = columns.map((col, i) =>
      toLines(pdf, col.header, colWidths[i] - CELL_PAD_X * 2)
    );
    const headerLineCount = Math.max(...headerLines.map((lines) => lines.length), 1);
    const headerHeight = Math.max(8, headerLineCount * LINE_HEIGHT + CELL_PAD_Y * 2);

    pdf.setFillColor(...HEADER_BG);
    pdf.rect(PAGE_MARGIN, y, contentWidth, headerHeight, 'F');
    pdf.setTextColor(255, 255, 255);
    let x = PAGE_MARGIN;
    headerLines.forEach((lines, i) => {
      pdf.text(lines, x + CELL_PAD_X, y + CELL_PAD_Y + 2.8);
      x += colWidths[i];
    });
    y += headerHeight;
  };

  drawPageChrome(true);

  const grouped = groupByDoer(tasks, getDoerName);

  for (const [doerName, doerTasks] of grouped) {
    if (y + 24 > footerY - 4) startNewPage();

    pdf.setFillColor(...DOER_BG);
    pdf.rect(PAGE_MARGIN, y, contentWidth, 8, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(PAGE_MARGIN, y, contentWidth, 8, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      `Doer: ${doerName}  (${doerTasks.length} task${doerTasks.length === 1 ? '' : 's'})`,
      PAGE_MARGIN + 2,
      y + 5.5
    );
    y += 8;
    drawTableHeader();

    doerTasks.forEach((task, rowIndex) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZE);
      const cellLines = columns.map((col, i) =>
        toLines(pdf, col.getValue(task) || '-', colWidths[i] - CELL_PAD_X * 2)
      );
      const maxLines = Math.max(...cellLines.map((lines) => lines.length), 1);
      const rowHeight = Math.max(7, maxLines * LINE_HEIGHT + CELL_PAD_Y * 2);

      if (y + rowHeight > footerY - 4) {
        startNewPage();
        pdf.setFillColor(...DOER_BG);
        pdf.rect(PAGE_MARGIN, y, contentWidth, 7, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`Doer: ${doerName} (continued)`, PAGE_MARGIN + 2, y + 4.8);
        y += 7;
        drawTableHeader();
      }

      if (rowIndex % 2 === 1) {
        pdf.setFillColor(...ALT_ROW);
        pdf.rect(PAGE_MARGIN, y, contentWidth, rowHeight, 'F');
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.2);
      pdf.line(PAGE_MARGIN, y + rowHeight, PAGE_MARGIN + contentWidth, y + rowHeight);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZE);
      pdf.setTextColor(30, 41, 59);

      let x = PAGE_MARGIN;
      cellLines.forEach((lines, i) => {
        pdf.text(lines, x + CELL_PAD_X, y + CELL_PAD_Y + 3.2);
        x += colWidths[i];
      });

      y += rowHeight;
    });

    y += 4;
  }

  pdf.save(`${filename}.pdf`);
}
