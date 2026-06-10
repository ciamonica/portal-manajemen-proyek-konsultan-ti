import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const sourcePath = path.join(projectRoot, 'docs', 'percakapan-codex-pembuatan-website.md');
const outputDir = path.join(projectRoot, 'docs', 'pdf');
const outputPath = path.join(outputDir, 'Percakapan Pembuatan Website dengan Codex.pdf');
const screenshotDir = path.join(projectRoot, 'docs', 'screenshots');
const screenshots = [
  {
    title: 'Tampilan 1 - Rancangan awal proyek',
    file: 'codex-vscode-01-rancangan-awal.jpg',
    caption: 'Percakapan awal saat menentukan stack, role pengguna, dan modul utama portal.'
  },
  {
    title: 'Tampilan 2 - Implementasi dashboard frontend',
    file: 'codex-vscode-02-dashboard-frontend.jpg',
    caption: 'Percakapan saat membangun Dashboard.jsx, Chart.js, filter, KPI, dan export PDF.'
  },
  {
    title: 'Tampilan 3 - Backend dan keamanan',
    file: 'codex-vscode-03-backend-keamanan.jpg',
    caption: 'Percakapan tentang Express API, JWT, RBAC, bcrypt, Zod, dan security baseline.'
  },
  {
    title: 'Tampilan 4 - Dokumentasi dan laporan',
    file: 'codex-vscode-04-dokumentasi-laporan.jpg',
    caption: 'Percakapan tentang export laporan dan panduan menjalankan website.'
  }
];

const markdown = fs.readFileSync(sourcePath, 'utf8');

function cleanInline(value) {
  return value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

function extractMeta(content) {
  const lines = content.split(/\r?\n/);
  const title = cleanInline(lines.find((line) => line.startsWith('# '))?.replace(/^#\s+/, '') || 'Dokumentasi Percakapan');
  const project = cleanInline(lines.find((line) => line.startsWith('**Judul proyek:**'))?.replace('**Judul proyek:**', '') || '');
  const note = cleanInline(lines.find((line) => line.startsWith('**Keterangan:**'))?.replace('**Keterangan:**', '') || '');
  return { title, project, note };
}

function extractConversation(content) {
  const conversationPart = content.split('## Percakapan')[1]?.split('## Ringkasan Fitur yang Dibahas')[0] || '';
  const lines = conversationPart.split(/\r?\n/);
  const entries = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') continue;

    const speakerMatch = trimmed.match(/^\*\*(Saya|Codex):\*\*$/);
    if (speakerMatch) {
      if (current) entries.push(current);
      current = { speaker: speakerMatch[1], text: [] };
      continue;
    }

    if (current) {
      current.text.push(cleanInline(trimmed));
    }
  }

  if (current) entries.push(current);
  return entries.map((entry) => ({
    speaker: entry.speaker,
    text: entry.text.join(' ').replace(/\s+/g, ' ')
  }));
}

function extractSummary(content) {
  const summaryPart = content.split('## Ringkasan Fitur yang Dibahas')[1] || '';
  return summaryPart
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => cleanInline(line.replace(/^- /, '')));
}

const meta = extractMeta(markdown);
const entries = extractConversation(markdown);
const summary = extractSummary(markdown);

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const page = {
  width: doc.internal.pageSize.getWidth(),
  height: doc.internal.pageSize.getHeight()
};
const margin = 16;
const contentWidth = page.width - margin * 2;
let y = margin;

function setColor(hex) {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  doc.setTextColor(r, g, b);
}

function fillColor(hex) {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  doc.setFillColor(r, g, b);
}

function strokeColor(hex) {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  doc.setDrawColor(r, g, b);
}

function drawHeader() {
  fillColor('#123c69');
  doc.rect(0, 0, page.width, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Portal Manajemen Proyek TI - Percakapan dengan Codex', margin, 6.6);
}

function addPage() {
  doc.addPage();
  drawHeader();
  y = margin + 2;
}

function ensureSpace(height) {
  if (y + height > page.height - margin) {
    addPage();
  }
}

function addWrappedText(text, x, maxWidth, options = {}) {
  const size = options.size || 10;
  const lineHeight = options.lineHeight || 5;
  const style = options.style || 'normal';
  const color = options.color || '#26384a';

  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  setColor(color);

  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    ensureSpace(lineHeight + 2);
    doc.text(line, x, y);
    y += lineHeight;
  }
}

function addSectionTitle(title) {
  ensureSpace(16);
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor('#123c69');
  doc.text(title, margin, y);
  y += 7;
  fillColor('#2f8f83');
  doc.rect(margin, y, 28, 1.3, 'F');
  y += 7;
}

function addDocumentIntro() {
  drawHeader();
  y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setColor('#123c69');
  const titleLines = doc.splitTextToSize(meta.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setColor('#3c4f63');
  doc.text(meta.project, margin, y);
  y += 7;

  fillColor('#2f8f83');
  doc.rect(margin, y, contentWidth, 1, 'F');
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor('#123c69');
  doc.text('Ruang Lingkup', margin, y);
  y += 6;
  addWrappedText(meta.note, margin, contentWidth, { size: 10, lineHeight: 5.2, color: '#3c4f63' });
  y += 3;
}

function addBubble(entry, index) {
  const isUser = entry.speaker === 'Saya';
  const labelColor = isUser ? '#123c69' : '#1d5f59';
  const label = `${String(index + 1).padStart(2, '0')}. ${entry.speaker}:`;
  const labelWidth = 28;
  const textX = margin + labelWidth;
  const textWidth = contentWidth - labelWidth;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(entry.text, textWidth);
  const lineHeight = 5.1;
  let offset = 0;

  while (offset < lines.length) {
    const available = Math.max(1, Math.floor((page.height - margin - y - 17) / lineHeight));
    const chunk = lines.slice(offset, offset + available);
    const height = chunk.length * lineHeight + 7;

    ensureSpace(height);
    if (offset === 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(labelColor);
      doc.text(label, margin, y);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor('#26384a');
    let textY = y;
    for (const line of chunk) {
      doc.text(line, textX, textY);
      textY += lineHeight;
    }

    y += height;
    offset += chunk.length;
  }

  y += 2;
}

function addSummary(items) {
  addSectionTitle('Ringkasan Fitur');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const item of items) {
    const lines = doc.splitTextToSize(item, contentWidth - 8);
    const height = lines.length * 5.2 + 4;
    ensureSpace(height);
    fillColor('#2f8f83');
    doc.circle(margin + 2, y - 1.5, 1.2, 'F');
    setColor('#26384a');
    doc.text(lines, margin + 8, y);
    y += height;
  }
}

function addScreenshotAppendix(items) {
  const existingItems = items
    .map((item) => ({ ...item, path: path.join(screenshotDir, item.file) }))
    .filter((item) => fs.existsSync(item.path));

  if (!existingItems.length) return;

  addPage();
  addSectionTitle('Lampiran Tampilan IDE');
  addWrappedText(
    'Bagian ini menampilkan beberapa tampilan percakapan di IDE Visual Studio Code dengan Codex sebagai dokumentasi proses pengembangan website.',
    margin,
    contentWidth,
    { size: 10, lineHeight: 5.2, color: '#3c4f63' }
  );
  y += 3;

  for (const item of existingItems) {
    const imageWidth = Math.min(contentWidth, 150);
    const imageHeight = imageWidth * (1000 / 1600);
    const imageX = margin + (contentWidth - imageWidth) / 2;
    const titleLines = doc.splitTextToSize(item.title, contentWidth);
    const captionLines = doc.splitTextToSize(item.caption, contentWidth);
    const blockHeight = titleLines.length * 5.5 + captionLines.length * 4.8 + 4 + imageHeight + 8;

    ensureSpace(blockHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor('#123c69');
    doc.text(titleLines, margin, y);
    y += titleLines.length * 5.5;
    addWrappedText(item.caption, margin, contentWidth, { size: 9.5, lineHeight: 5, color: '#52677c' });
    y += 2;

    const imageData = `data:image/jpeg;base64,${fs.readFileSync(item.path).toString('base64')}`;
    strokeColor('#d5dde7');
    doc.rect(imageX - 1, y - 1, imageWidth + 2, imageHeight + 2, 'S');
    doc.addImage(imageData, 'JPEG', imageX, y, imageWidth, imageHeight);
    y += imageHeight + 7;
  }
}

function addFooters() {
  const total = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor('#6f7f90');
    doc.text(`Halaman ${pageNumber} dari ${total}`, page.width - margin, page.height - 8, { align: 'right' });
  }
}

addDocumentIntro();
addSectionTitle('Percakapan');
entries.forEach(addBubble);
addSummary(summary);
addScreenshotAppendix(screenshots);
addFooters();

fs.mkdirSync(outputDir, { recursive: true });
const pdf = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outputPath, pdf);

console.log(outputPath);
