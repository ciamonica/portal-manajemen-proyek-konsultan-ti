/**
 * ========================================================
 * KATEGORI      : Halaman Aplikasi (Frontend)
 * DESKRIPSI     : Halaman Dashboard utama untuk menampilkan ringkasan data, statistik, dan manajemen entitas (CRUD).
 * FUNGSI UTAMA  : Menampilkan visualisasi data (Chart.js), mengelola state aplikasi, dan memanggil API untuk berbagai entitas.
 * ========================================================
 */

// Mengimpor React hooks yang digunakan dalam komponen
import { useEffect, useMemo, useRef, useState } from 'react';
// Mengimpor API client untuk komunikasi dengan backend
import { apiClient } from '../api/api.js';
// Mengimpor hook otentikasi untuk mendapatkan data user yang login
import { useAuth } from '../context/AuthContext.jsx';
// Mengimpor Chart.js untuk visualisasi data (grafik donut, bar, line)
import { Chart, registerables } from 'chart.js';
// Mengimpor jsPDF untuk menghasilkan file PDF
import { jsPDF } from 'jspdf';
// Mengimpor plugin autoTable untuk membuat tabel di dalam PDF
import autoTable from 'jspdf-autotable';

// Mendaftarkan semua modul Chart.js (controller, element, scale, plugin) agar bisa digunakan
Chart.register(...registerables);
// Mengatur font default untuk semua chart
Chart.defaults.font.family = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
// Mengatur warna teks default chart
Chart.defaults.color = '#52677c';
// Mengatur warna garis border default chart
Chart.defaults.borderColor = 'rgba(82, 103, 124, 0.16)';
// Mengatur rasio piksel perangkat untuk rendering chart yang tajam
Chart.defaults.devicePixelRatio = () => chartPixelRatio();

/* --------------------------------------------------------
 * KONSTANTA LABEL TAMPILAN
 * Pemetaan nilai status/role dari database ke label bahasa Indonesia untuk ditampilkan di UI.
 * -------------------------------------------------------- */

// Label status tugas (task) dalam bahasa Indonesia
const TASK_STATUS_LABELS = {
  todo: 'Belum Dikerjakan',
  in_progress: 'Berjalan',
  done: 'Selesai'
};

// Label status proyek dalam bahasa Indonesia
const PROJECT_STATUS_LABELS = {
  planning: 'Perencanaan',
  in_progress: 'Berjalan',
  completed: 'Selesai',
  on_hold: 'Ditunda',
  on_track: 'Sesuai Jadwal',
  at_risk: 'Berisiko',
  delayed: 'Tertunda'
};

// Label status milestone
const MILESTONE_STATUS_LABELS = {
  pending: 'Menunggu',
  achieved: 'Tercapai'
};

// Label tipe tautan proyek (link type)
const LINK_TYPE_LABELS = {
  api_docs: 'API Docs',
  brd: 'BRD',
  repository: 'Repositori',
  staging: 'Staging',
  other: 'Lainnya'
};

// Label tingkat risiko (probabilitas dan dampak)
const RISK_LEVEL_LABELS = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi'
};

// Label status penanganan risiko
const RISK_STATUS_LABELS = {
  open: 'Terbuka',
  mitigating: 'Dimitigasi',
  resolved: 'Selesai'
};

// Label peran pengguna (role)
const ROLE_LABELS = {
  pm: 'Project Manager',
  dev: 'Developer',
  client: 'Client'
};

/**
 * FUNGSI BANTUAN: labelFrom
 * Mengambil label tampilan dari objek pemetaan (map) berdasarkan nilai (value).
 * Jika tidak ditemukan, kembalikan nilai asli atau tanda '-'.
 */
function labelFrom(map, value) {
  return map[value] || value || '-';
}

/**
 * FUNGSI BANTUAN: categoryFromHash
 * Memetakan hash URL (misal: #dokumen-section) ke nama kategori dashboard.
 * Digunakan untuk menentukan kategori mana yang harus di-expand saat navigasi.
 */
function categoryFromHash(hash) {
  return {
    '#quick-links-section': 'links',
    '#optional-features-section': 'links',
    '#dokumen-section': 'links',
    '#aktivitas-section': 'work',
    '#kinerja-section': 'monitoring',
    '#risiko-section': 'risk',
    '#tasks-section': 'work',
    '#milestones-section': 'work',
    '#teams-section': 'work',
    '#monitoring-section': 'monitoring',
    '#filters-section': 'monitoring',
    '#charts-section': 'monitoring',
    '#table-section': 'monitoring',
    '#risk-register-section': 'risk'
  }[hash];
}

/**
 * FUNGSI BANTUAN: toDateInput
 * Mengonversi nilai tanggal (string/Date) ke format 'YYYY-MM-DD' untuk input HTML date.
 */
function toDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/**
 * FUNGSI BANTUAN: formatDate
 * Memformat tanggal menjadi format tampilan Indonesia (misal: 14 Mei 2026).
 */
function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * FUNGSI BANTUAN: getWeekKey
 * Menghitung kunci minggu (tanggal Senin) dari suatu tanggal untuk pengelompokan mingguan.
 */
function getWeekKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() - day + 1);
  return normalized.toISOString().slice(0, 10);
}

/**
 * FUNGSI BANTUAN: formatOneDecimal
 * Memformat angka menjadi satu desimal (misal: 7.5).
 */
function formatOneDecimal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.0';
  return number.toFixed(1);
}

/**
 * FUNGSI BANTUAN: clampPercent
 * Membatasi nilai persentase antara 0 dan 100 (dibulatkan).
 */
function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

/**
 * FUNGSI BANTUAN: chartPixelRatio
 * Menentukan rasio piksel optimal untuk rendering chart (minimal 2, maksimal 3).
 */
function chartPixelRatio() {
  if (typeof window === 'undefined') return 2;
  return Math.min(3, Math.max(2, window.devicePixelRatio || 1));
}

/**
 * FUNGSI BANTUAN: escapeSvgText
 * Meng-escape karakter khusus HTML/XML agar aman digunakan dalam SVG.
 */
function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * FUNGSI BANTUAN: compactSvgText
 * Memotong teks yang terlalu panjang untuk ditampilkan di SVG (maksimal 28 karakter).
 */
function compactSvgText(value, maxLength = 28) {
  const text = String(value || 'Project Web');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

/**
 * FUNGSI: generatedProjectImage
 * Menghasilkan gambar SVG placeholder untuk proyek yang tidak memiliki cover image.
 * SVG berisi inisial nama proyek, palet warna berdasarkan status, dan layout dashboard mini.
 */
function generatedProjectImage(project) {
  const name = project?.name || 'Project';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PR';
  const palette = {
    planning: ['#12263a', '#2f8f83', '#d9f2ef'],
    in_progress: ['#123c69', '#2f6f9f', '#dbeafe'],
    completed: ['#134e4a', '#2f8f83', '#d7f8df'],
    on_hold: ['#5f3b13', '#b7791f', '#ffedd5'],
    on_track: ['#12263a', '#2f8f83', '#d9f2ef'],
    at_risk: ['#5f3b13', '#d89b2b', '#fff3c4'],
    delayed: ['#5f1616', '#b42318', '#fee2e2']
  }[project?.status || 'planning'] || ['#12263a', '#2f6f9f', '#e2e8f0'];
  const statusLabel = escapeSvgText(labelFrom(PROJECT_STATUS_LABELS, project?.status));
  const safeInitials = escapeSvgText(initials);
  const projectTitle = escapeSvgText(compactSvgText(name));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="panel" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#f4f7fa"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="#f8fafc"/>
      <rect width="1600" height="62" fill="#e8eef4"/>
      <circle cx="34" cy="31" r="9" fill="#ef4444"/>
      <circle cx="66" cy="31" r="9" fill="#f59e0b"/>
      <circle cx="98" cy="31" r="9" fill="#22c55e"/>
      <rect x="144" y="17" width="640" height="28" fill="#ffffff"/>
      <text x="168" y="37" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700" fill="#64748b">project-portal.local/${safeInitials.toLowerCase()}</text>
      <rect x="0" y="62" width="260" height="838" fill="#13263f"/>
      <rect x="34" y="108" width="58" height="58" fill="${palette[1]}"/>
      <text x="51" y="147" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="850" fill="#ffffff">${safeInitials}</text>
      <rect x="34" y="212" width="150" height="16" fill="rgba(255,255,255,0.65)"/>
      <rect x="34" y="268" width="178" height="42" fill="rgba(255,255,255,0.15)"/>
      <rect x="34" y="346" width="124" height="14" fill="rgba(255,255,255,0.3)"/>
      <rect x="34" y="402" width="142" height="14" fill="rgba(255,255,255,0.3)"/>
      <rect x="34" y="458" width="104" height="14" fill="rgba(255,255,255,0.3)"/>
      <rect x="260" y="62" width="1340" height="838" fill="#eef3f7"/>
      <rect x="308" y="112" width="1244" height="148" fill="url(#panel)"/>
      <text x="356" y="176" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="850" fill="#13263f">${projectTitle}</text>
      <rect x="358" y="208" width="420" height="18" fill="#dbe3ec"/>
      <rect x="1328" y="148" width="150" height="44" fill="${palette[2]}"/>
      <rect x="1358" y="166" width="90" height="8" fill="${palette[1]}"/>
      <rect x="308" y="306" width="280" height="126" fill="#ffffff"/>
      <rect x="356" y="354" width="104" height="16" fill="#cbd5e1"/>
      <rect x="356" y="388" width="142" height="27" fill="${palette[1]}"/>
      <rect x="628" y="306" width="280" height="126" fill="#ffffff"/>
      <rect x="676" y="354" width="104" height="16" fill="#cbd5e1"/>
      <rect x="676" y="388" width="142" height="27" fill="#2f6f9f"/>
      <rect x="948" y="306" width="280" height="126" fill="#ffffff"/>
      <rect x="996" y="354" width="104" height="16" fill="#cbd5e1"/>
      <rect x="996" y="388" width="142" height="27" fill="#d89b2b"/>
      <rect x="1268" y="306" width="284" height="126" fill="#ffffff"/>
      <rect x="1316" y="354" width="112" height="16" fill="#cbd5e1"/>
      <rect x="1316" y="388" width="160" height="27" fill="#94a3b8"/>
      <rect x="308" y="478" width="716" height="314" fill="#ffffff"/>
      <rect x="362" y="556" width="574" height="2" fill="#e2e8f0"/>
      <rect x="362" y="624" width="574" height="2" fill="#e2e8f0"/>
      <rect x="362" y="692" width="574" height="2" fill="#e2e8f0"/>
      <path d="M376 702C442 638 504 664 578 592C660 514 724 624 806 556C852 518 900 516 962 478" fill="none" stroke="${palette[1]}" stroke-width="13" stroke-linecap="round"/>
      <circle cx="962" cy="478" r="11" fill="#ffffff" stroke="${palette[1]}" stroke-width="7"/>
      <rect x="1064" y="478" width="488" height="314" fill="#ffffff"/>
      <rect x="1118" y="548" width="360" height="18" fill="#cbd5e1"/>
      <rect x="1118" y="604" width="360" height="14" fill="#eef2f7"/>
      <rect x="1118" y="656" width="310" height="14" fill="#eef2f7"/>
      <rect x="1118" y="708" width="338" height="14" fill="#eef2f7"/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * FUNGSI: projectImage
 * Mengembalikan URL gambar proyek (cover_image_url) atau gambar SVG yang di-generate.
 */
function projectImage(project) {
  return project?.cover_image_url || generatedProjectImage(project);
}

/**
 * FUNGSI: handleProjectImageError
 * Handler ketika gambar proyek gagal dimuat (broken image).
 * Mengganti src dengan gambar SVG yang di-generate sebagai fallback.
 */
function handleProjectImageError(event, project) {
  const image = event.currentTarget;
  if (image.dataset.fallbackImage === 'true') return;
  image.dataset.fallbackImage = 'true';
  image.src = generatedProjectImage(project);
}

/**
 * FUNGSI: teamMemberNames
 * Mengembalikan string nama-nama anggota tim yang dipisahkan koma.
 */
function teamMemberNames(team) {
  if (!team?.members?.length) return 'Belum ada anggota';
  return team.members.map((member) => member.username).join(', ');
}

/**
 * FUNGSI: milestonePercent
 * Menghitung persentase pencapaian milestone berdasarkan rata-rata progres tugas terkait.
 * Jika milestone sudah 'achieved', langsung kembalikan 100%.
 */
function milestonePercent(milestone, tasks) {
  if (milestone.status === 'achieved') return 100;
  const relatedTasks = tasks.filter((task) => Number(task.project_id) === Number(milestone.project_id));
  if (!relatedTasks.length) return 0;
  const total = relatedTasks.reduce((sum, task) => sum + clampPercent(task.progress || (task.status === 'done' ? 100 : 0)), 0);
  return Math.round(total / relatedTasks.length);
}

/**
 * FUNGSI: buildBurnDownData
 * Membangun data untuk Burn-down Chart.
 * Menghitung garis ideal (linear) dan garis aktual (berdasarkan tugas yang selesai).
 */
function buildBurnDownData(tasks) {
  const sortedTasks = [...tasks].sort((a, b) => {
    const left = new Date(a.due_date || a.created_at || 0).getTime();
    const right = new Date(b.due_date || b.created_at || 0).getTime();
    return left - right;
  });

  if (!sortedTasks.length) {
    return { labels: [], ideal: [], actual: [] };
  }

  const totalTasks = sortedTasks.length;
  let completedTasks = 0;
  return {
    labels: sortedTasks.map((task) => task.due_date ? formatDate(task.due_date) : task.name),
    ideal: sortedTasks.map((_, index) => {
      if (sortedTasks.length === 1) return totalTasks;
      return Math.round(totalTasks - (totalTasks * index / (sortedTasks.length - 1)));
    }),
    actual: sortedTasks.map((task) => {
      if (task.status === 'done' || clampPercent(task.progress) >= 100) {
        completedTasks += 1;
      }
      return Math.max(0, totalTasks - completedTasks);
    })
  };
}

/**
 * FUNGSI: startOfLocalDay
 * Mengembalikan objek Date pada awal hari (00:00:00) di zona waktu lokal.
 * Digunakan untuk perbandingan tanggal yang konsisten.
 */
function startOfLocalDay(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * FUNGSI: buildDelayRiskItems
 * Mengidentifikasi tugas-tugas yang berisiko terlambat berdasarkan tenggat dan progres.
 * Mengembalikan array item risiko delay yang diurutkan berdasarkan tingkat keparahan.
 */
function buildDelayRiskItems(tasks) {
  const today = startOfLocalDay();
  return tasks
    .map((task) => {
      const dueInput = toDateInput(task.due_date);
      if (!dueInput || task.status === 'done') return null;

      const dueDate = startOfLocalDay(dueInput);
      const daysLeft = Math.ceil((dueDate - today) / 86400000);
      const progress = clampPercent(task.progress || 0);

      if (daysLeft < 0) {
        return {
          ...task,
          daysLeft,
          severity: 'high',
          label: `Terlambat ${Math.abs(daysLeft)} hari`
        };
      }

      if (daysLeft <= 7) {
        return {
          ...task,
          daysLeft,
          severity: 'medium',
          label: daysLeft === 0 ? 'Jatuh tempo hari ini' : `Jatuh tempo ${daysLeft} hari lagi`
        };
      }

      if (daysLeft <= 14 && progress < 50) {
        return {
          ...task,
          daysLeft,
          severity: 'medium',
          label: `Progres rendah, ${daysLeft} hari lagi`
        };
      }

      return null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1 };
      return severityOrder[a.severity] - severityOrder[b.severity] || a.daysLeft - b.daysLeft;
    });
}

/**
 * FUNGSI: dashboardStats
 * Menghitung statistik ringkasan dashboard: jumlah tugas per status dan jumlah proyek per status.
 */
function dashboardStats(tasks = [], projects = []) {
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  const projectStatus = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {});

  return { statusCounts, projectStatus };
}

// Header kolom untuk ekspor data tugas (CSV, Excel, PDF)
const TASK_EXPORT_HEADERS = ['Tugas', 'Proyek', 'Status', 'Peran', 'Penanggung Jawab', 'Tenggat'];

/**
 * FUNGSI: escapeHtml
 * Meng-escape karakter HTML khusus untuk mencegah XSS saat membuat konten HTML dinamis.
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * FUNGSI: downloadBlob
 * Membuat file unduhan (download) dari konten string dengan tipe MIME tertentu.
 * Membuat elemen <a> sementara untuk memicu unduhan browser.
 */
function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * KOMPONEN UTAMA: Dashboard
 * Komponen halaman utama yang menampilkan seluruh data proyek, tugas, milestone, tim,
 * risiko, time logs, dan fitur manajemen data (CRUD) dalam satu tampilan dashboard.
 */
export default function Dashboard() {
  // Mengambil data pengguna yang sedang login dari AuthContext
  const { user } = useAuth();

  /* --------------------------------------------------------
   * STATE MANAGEMENT
   * Menyimpan seluruh data entitas yang diambil dari API backend.
   * -------------------------------------------------------- */
  const [tasks, setTasks] = useState([]); // Daftar tugas
  const [projects, setProjects] = useState([]); // Daftar proyek
  const [milestones, setMilestones] = useState([]); // Daftar milestone
  const [teams, setTeams] = useState([]); // Daftar tim
  const [users, setUsers] = useState([]); // Daftar pengguna
  const [projectLinks, setProjectLinks] = useState([]); // Daftar tautan proyek
  const [risks, setRisks] = useState([]); // Daftar risiko
  const [timeLogs, setTimeLogs] = useState([]); // Daftar log waktu
  const [taskDependencies, setTaskDependencies] = useState([]); // Daftar dependensi tugas
  const [projectFiles, setProjectFiles] = useState([]); // Daftar file proyek
  const [taskComments, setTaskComments] = useState([]); // Daftar komentar tugas
  const [filters, setFilters] = useState({ status: '', role: '', fromDate: '', toDate: '' }); // Filter tampilan tugas
  const [loading, setLoading] = useState(false); // Indikator loading data

  /* --------------------------------------------------------
   * STATE FORM (INPUT DATA)
   * Menyimpan nilai form untuk operasi Create dan Update setiap entitas.
   * -------------------------------------------------------- */
  const [projectForm, setProjectForm] = useState({ name: '', description: '', start_date: '', end_date: '', status: 'planning', client_id: '', pm_id: '', cover_image_url: '' });
  const [taskForm, setTaskForm] = useState({ project_id: '', name: '', description: '', assigned_to: '', status: 'todo', progress: 0, due_date: '' });
  const [milestoneForm, setMilestoneForm] = useState({ project_id: '', name: '', description: '', due_date: '', status: 'pending' });
  const [teamForm, setTeamForm] = useState({ project_id: '', name: '', member_ids: [] });
  const [linkForm, setLinkForm] = useState({ project_id: '', title: '', url: '', type: 'other', sort_order: 0 });
  const [riskForm, setRiskForm] = useState({ project_id: '', title: '', description: '', probability: 'medium', impact: 'medium', mitigation: '', status: 'open', owner_id: '', due_date: '' });
  const [timeLogForm, setTimeLogForm] = useState({ task_id: '', user_id: '', hours: '', log_date: '' });
  const [dependencyForm, setDependencyForm] = useState({ task_id: '', depends_on_task_id: '' });
  const [fileForm, setFileForm] = useState({ project_id: '', title: '', file_url: '', file_type: 'dokumen' });
  const [commentForm, setCommentForm] = useState({ task_id: '', comment: '' });

  // Tab form aktif yang sedang ditampilkan (proyek, tugas, milestone, dll)
  const [activeDataForm, setActiveDataForm] = useState(user.role === 'pm' ? 'project' : user.role === 'dev' ? 'timeLog' : 'comment');

  // State untuk mengontrol kategori dashboard yang di-collapse/expand
  const [collapsedCategories, setCollapsedCategories] = useState({
    links: true,
    work: true,
    monitoring: true,
    risk: true
  });

  /* --------------------------------------------------------
   * STATE EDITING
   * Menyimpan referensi objek yang sedang diedit (null jika mode tambah baru).
   * -------------------------------------------------------- */
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [editingDependency, setEditingDependency] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [editingTimeLog, setEditingTimeLog] = useState(null);
  const [editingComment, setEditingComment] = useState(null);

  // Referensi ke instance Chart.js untuk penghancuran (destroy) saat re-render
  const statusChartRef = useRef(null); // Chart donut status tugas
  const projectChartRef = useRef(null); // Chart bar status proyek
  const burnDownChartRef = useRef(null); // Chart line burn-down

  /**
   * FUNGSI: refreshData
   * Memuat ulang semua data dari API backend secara paralel (Promise.all).
   * Dipanggil saat komponen pertama kali dimuat dan setelah operasi CRUD berhasil.
   */
  async function refreshData() {
    setLoading(true);
    try {
      const load = async (path, fallback = []) => {
        try {
          const response = await apiClient.get(path);
          return response.data;
        } catch (error) {
          console.error(error);
          return fallback;
        }
      };

      const usersRequest = user.role === 'pm' ? load('/users') : Promise.resolve([user]);
      const [
        projectsData,
        tasksData,
        milestonesData,
        teamsData,
        usersData,
        linksData,
        risksData,
        timeLogsData,
        dependenciesData,
        filesData,
        commentsData
      ] = await Promise.all([
        load('/projects'),
        load('/tasks'),
        load('/milestones'),
        load('/teams'),
        usersRequest,
        load('/project-links'),
        load('/risks'),
        load('/time-logs'),
        load('/task-dependencies'),
        load('/project-files'),
        load('/task-comments')
      ]);

      setProjects(projectsData);
      setTasks(tasksData);
      setMilestones(milestonesData);
      setTeams(teamsData);
      setUsers(usersData);
      setProjectLinks(linksData);
      setRisks(risksData);
      setTimeLogs(timeLogsData);
      setTaskDependencies(dependenciesData);
      setProjectFiles(filesData);
      setTaskComments(commentsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Efek: Memuat data saat komponen pertama kali di-render
  useEffect(() => {
    refreshData();
  }, []);

  /**
   * MEMO: filteredTasks
   * Memfilter daftar tugas berdasarkan kriteria filter yang dipilih pengguna
   * (status, role penanggung jawab, rentang tanggal).
   */
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const dueDate = toDateInput(task.due_date);
    const assignedRole = task.assigned_role || users.find((entry) => Number(entry.id) === Number(task.assigned_to))?.role || '';
    if (filters.status && task.status !== filters.status) return false;
    if (filters.role && assignedRole !== filters.role) return false;
    if (filters.fromDate && (!dueDate || dueDate < filters.fromDate)) return false;
    if (filters.toDate && (!dueDate || dueDate > filters.toDate)) return false;
    return true;
  }), [tasks, users, filters]);

  // Menghitung statistik dashboard dari tugas yang terfilter dan semua proyek
  const { statusCounts, projectStatus } = dashboardStats(filteredTasks, projects);

  // Menghitung total jumlah proyek
  const totalProjects = projects.length;

  /**
   * MEMO: milestoneProgress
   * Menghitung persentase pencapaian setiap milestone dan mengurutkannya
   * berdasarkan status dan persentase (yang belum tercapai ditampilkan lebih dulu).
   */
  const milestoneProgress = useMemo(() => milestones
    .map((milestone) => ({
      ...milestone,
      phase: milestone.name,
      project: milestone.project_name,
      percent: milestonePercent(milestone, tasks)
    }))
    .sort((a, b) => {
      const statusOrder = { pending: 0, achieved: 1 };
      const statusDiff = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
      if (statusDiff) return statusDiff;
      if (a.percent !== b.percent) return a.percent - b.percent;
      return new Date(a.due_date || 0) - new Date(b.due_date || 0);
    })
    .slice(0, 6), [milestones, tasks]);

  /**
   * MEMO: ganttItems
   * Menyiapkan data tugas untuk tampilan Gantt/Kanban Board.
   * Mengurutkan berdasarkan status dan progres, dibatasi 6 item teratas.
   */
  const ganttItems = useMemo(() => [...filteredTasks]
    .map((task) => ({
      ...task,
      percent: clampPercent(task.progress || (task.status === 'done' ? 100 : 0))
    }))
    .sort((a, b) => {
      const statusOrder = { todo: 0, in_progress: 1, done: 2 };
      const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (statusDiff) return statusDiff;
      if (a.percent !== b.percent) return a.percent - b.percent;
      return new Date(a.due_date || a.created_at || 0) - new Date(b.due_date || b.created_at || 0);
    })
    .slice(0, 6), [filteredTasks]);

  // Memo: Data burn-down chart dari tugas yang terfilter
  const burnDownData = useMemo(() => buildBurnDownData(filteredTasks), [filteredTasks]);
  // Memo: Daftar tugas yang berisiko terlambat (delay)
  const automaticDelayRisks = useMemo(() => buildDelayRiskItems(tasks), [tasks]);

  /**
   * MEMO: resourceUtilization
   * Menghitung utilisasi sumber daya (jam kerja per minggu) dari data time logs.
   * Mengelompokkan berdasarkan user dan menghitung rata-rata jam per minggu.
   */
  const resourceUtilization = useMemo(() => {
    const totals = new Map();
    timeLogs.forEach((log) => {
      const key = log.user_id || log.username;
      const current = totals.get(key) || { name: log.username || 'User', hours: 0, weeks: new Set() };
      current.hours += Number(log.hours || 0);
      const weekKey = getWeekKey(log.log_date || log.created_at);
      if (weekKey) current.weeks.add(weekKey);
      totals.set(key, current);
    });
    return Array.from(totals.values())
      .map((member) => {
        const weekCount = Math.max(member.weeks.size, 1);
        const weeklyHours = member.hours / weekCount;
        return {
          name: member.name,
          hours: formatOneDecimal(weeklyHours),
          utilization: `${clampPercent((weeklyHours / 40) * 100)}%`
        };
      })
      .sort((a, b) => Number(b.hours) - Number(a.hours));
  }, [timeLogs]);

  /**
   * MEMO: timeTrackingEntries
   * Mengambil 8 entri time log terbaru untuk ditampilkan di panel Time Tracking.
   */
  const timeTrackingEntries = useMemo(() => timeLogs.slice(0, 8).map((log) => ({
    ...log,
    id: log.id,
    task: log.task_name || `Tugas #${log.task_id}`,
    hours: Number(log.hours || 0),
    date: formatDate(log.log_date),
    username: log.username
  })), [timeLogs]);

  /**
   * KONFIGURASI TAB FORM
   * Menentukan tab mana yang terlihat berdasarkan role pengguna.
   * PM bisa akses semua form, Dev bisa log waktu dan komentar, Client hanya komentar.
   */
  const dataFormTabs = [
    { key: 'project', label: 'Proyek', visible: user.role === 'pm' },
    { key: 'task', label: 'Tugas', visible: user.role === 'pm' },
    { key: 'milestone', label: 'Milestone', visible: user.role === 'pm' },
    { key: 'team', label: 'Tim', visible: user.role === 'pm' },
    { key: 'link', label: 'Link', visible: user.role === 'pm' },
    { key: 'risk', label: 'Risiko', visible: user.role === 'pm' },
    { key: 'dependency', label: 'Dependensi', visible: user.role === 'pm' },
    { key: 'file', label: 'File', visible: user.role === 'pm' },
    { key: 'timeLog', label: 'Log Waktu', visible: user.role !== 'client' },
    { key: 'comment', label: 'Komentar', visible: true }
  ].filter((tab) => tab.visible);

  // Pemetaan tab aktif ke nama daftar data yang ditampilkan
  const activeDataList = {
    project: 'projects',
    task: 'tasks',
    milestone: 'milestones',
    team: 'teams',
    link: 'links',
    risk: 'risks',
    dependency: 'dependencies',
    file: 'files',
    timeLog: 'timeLogs',
    comment: 'comments'
  }[activeDataForm] || 'comments';

  /**
   * FUNGSI: categoryCollapsed
   * Mengecek apakah suatu kategori dashboard sedang dalam keadaan collapsed (tersembunyi).
   */
  const categoryCollapsed = (category) => Boolean(collapsedCategories[category]);

  /**
   * FUNGSI: toggleCategory
   * Mengubah status collapsed/expanded suatu kategori dashboard.
   */
  const toggleCategory = (category) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  /**
   * FUNGSI: handleCategoryKeyDown
   * Handler keyboard (Enter/Space) untuk toggle kategori (aksesibilitas).
   */
  const handleCategoryKeyDown = (event, category) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleCategory(category);
  };

  /**
   * FUNGSI: renderCategoryHeading
   * Merender heading kategori dashboard yang bisa di-klik untuk expand/collapse.
   * Mendukung aksesibilitas dengan aria-expanded dan aria-controls.
   */
  const renderCategoryHeading = (category, sectionId, title, description, className, controlledIds) => {
    const collapsed = categoryCollapsed(category);
    return (
      <section
        id={sectionId}
        className={`dashboard-category-heading ${className} ${collapsed ? 'is-collapsed' : 'is-expanded'}`}
        role="button"
        tabIndex={0}
        aria-label={collapsed ? `Tampilkan isi ${title}` : `Sembunyikan isi ${title}`}
        aria-expanded={!collapsed}
        aria-controls={controlledIds}
        title={collapsed ? `Tampilkan isi ${title}` : `Sembunyikan isi ${title}`}
        onClick={() => toggleCategory(category)}
        onKeyDown={(event) => handleCategoryKeyDown(event, category)}
      >
        <h2>{title}</h2>
        <p>{description}</p>
      </section>
    );
  };

  useEffect(() => {
    if (!dataFormTabs.some((tab) => tab.key === activeDataForm)) {
      setActiveDataForm(dataFormTabs[0]?.key || 'comment');
    }
  }, [activeDataForm, dataFormTabs]);

  useEffect(() => {
    if (!categoryCollapsed('monitoring')) {
      window.setTimeout(() => {
        statusChartRef.current?.resize();
        projectChartRef.current?.resize();
        burnDownChartRef.current?.resize();
      }, 0);
    }
  }, [collapsedCategories.monitoring]);

  useEffect(() => {
    const expandCategoryForHash = () => {
      const targetCategory = categoryFromHash(window.location.hash);
      if (!targetCategory) return;
      setCollapsedCategories((prev) => {
        if (!prev[targetCategory]) return prev;
        return { ...prev, [targetCategory]: false };
      });
      window.setTimeout(() => {
        document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    };

    expandCategoryForHash();
    window.addEventListener('hashchange', expandCategoryForHash);
    return () => window.removeEventListener('hashchange', expandCategoryForHash);
  }, []);

  useEffect(() => {
    const toggleCategoryFromNavbar = (event) => {
      const hash = event.detail?.hash || window.location.hash;
      const targetCategory = categoryFromHash(hash);
      if (!targetCategory) return;
      setCollapsedCategories((prev) => ({
        ...prev,
        [targetCategory]: !prev[targetCategory]
      }));
      window.setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 140);
    };

    window.addEventListener('dashboard-category-nav', toggleCategoryFromNavbar);
    return () => window.removeEventListener('dashboard-category-nav', toggleCategoryFromNavbar);
  }, []);

  /**
   * FUNGSI: focusDataManagement
   * Menggulir halaman ke bagian form manajemen data saat pengguna klik tombol Tambah/Edit.
   */
  const focusDataManagement = () => {
    setTimeout(() => {
      document.querySelector('.data-management-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: PROYEK
   * Fungsi-fungsi untuk menyimpan, mengedit, dan menghapus data proyek.
   * -------------------------------------------------------- */
  const handleProjectSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...projectForm,
        client_id: projectForm.client_id ? Number(projectForm.client_id) : undefined,
        pm_id: projectForm.pm_id ? Number(projectForm.pm_id) : undefined
      };
      if (editingProject) {
        await apiClient.put(`/projects/${editingProject.id}`, payload);
      } else {
        await apiClient.post('/projects', payload);
      }
      setProjectForm({ name: '', description: '', start_date: '', end_date: '', status: 'planning', client_id: '', pm_id: '', cover_image_url: '' });
      setEditingProject(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleProjectEdit = (project) => {
    setActiveDataForm('project');
    setEditingProject(project);
    setProjectForm({
      name: project.name || '',
      description: project.description || '',
      start_date: toDateInput(project.start_date),
      end_date: toDateInput(project.end_date),
      status: project.status || 'planning',
      client_id: project.client_id || '',
      pm_id: project.pm_id || '',
      cover_image_url: project.cover_image_url || ''
    });
    focusDataManagement();
  };

  const handleProjectCreateOpen = () => {
    setActiveDataForm('project');
    setEditingProject(null);
    setProjectForm({ name: '', description: '', start_date: '', end_date: '', status: 'planning', client_id: '', pm_id: '', cover_image_url: '' });
    focusDataManagement();
  };

  const handleProjectDelete = async (projectId) => {
    if (!window.confirm('Hapus proyek ini?')) return;
    try {
      await apiClient.delete(`/projects/${projectId}`);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: TUGAS (TASK)
   * Fungsi-fungsi untuk menyimpan, mengedit, dan menghapus data tugas.
   * -------------------------------------------------------- */
  const handleTaskSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...taskForm,
        project_id: Number(taskForm.project_id),
        assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : undefined,
        progress: Number(taskForm.progress)
      };
      if (editingTask) {
        await apiClient.put(`/tasks/${editingTask.id}`, payload);
      } else {
        await apiClient.post('/tasks', payload);
      }
      setTaskForm({ project_id: '', name: '', description: '', assigned_to: '', status: 'todo', progress: 0, due_date: '' });
      setEditingTask(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleTaskEdit = (task) => {
    setActiveDataForm('task');
    setEditingTask(task);
    setTaskForm({
      project_id: task.project_id || '',
      name: task.name || '',
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      status: task.status || 'todo',
      progress: task.progress || 0,
      due_date: toDateInput(task.due_date)
    });
    focusDataManagement();
  };

  const handleTaskCreateOpen = () => {
    setActiveDataForm('task');
    setEditingTask(null);
    setTaskForm({ project_id: '', name: '', description: '', assigned_to: '', status: 'todo', progress: 0, due_date: '' });
    focusDataManagement();
  };

  const handleTaskDelete = async (taskId) => {
    if (!window.confirm('Hapus tugas ini?')) return;
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: MILESTONE
   * Fungsi-fungsi untuk menyimpan, mengedit, dan menghapus data milestone.
   * -------------------------------------------------------- */
  const handleMilestoneSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...milestoneForm,
        project_id: Number(milestoneForm.project_id)
      };
      if (editingMilestone) {
        await apiClient.put(`/milestones/${editingMilestone.id}`, payload);
      } else {
        await apiClient.post('/milestones', payload);
      }
      setMilestoneForm({ project_id: '', name: '', description: '', due_date: '', status: 'pending' });
      setEditingMilestone(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleMilestoneEdit = (milestone) => {
    setActiveDataForm('milestone');
    setEditingMilestone(milestone);
    setMilestoneForm({
      project_id: milestone.project_id || '',
      name: milestone.name || '',
      description: milestone.description || '',
      due_date: toDateInput(milestone.due_date),
      status: milestone.status || 'pending'
    });
    focusDataManagement();
  };

  const handleMilestoneCreateOpen = () => {
    setActiveDataForm('milestone');
    setEditingMilestone(null);
    setMilestoneForm({ project_id: '', name: '', description: '', due_date: '', status: 'pending' });
    focusDataManagement();
  };

  const handleMilestoneDelete = async (milestoneId) => {
    if (!window.confirm('Hapus milestone ini?')) return;
    try {
      await apiClient.delete(`/milestones/${milestoneId}`);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: TIM
   * Fungsi-fungsi untuk menyimpan, mengedit, dan menghapus data tim.
   * -------------------------------------------------------- */
  const handleTeamSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...teamForm,
        project_id: Number(teamForm.project_id),
        member_ids: teamForm.member_ids.map(Number)
      };
      if (editingTeam) {
        await apiClient.put(`/teams/${editingTeam.id}`, payload);
      } else {
        await apiClient.post('/teams', payload);
      }
      setTeamForm({ project_id: '', name: '', member_ids: [] });
      setEditingTeam(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleTeamEdit = (team) => {
    setActiveDataForm('team');
    setEditingTeam(team);
    setTeamForm({
      project_id: team.project_id ? String(team.project_id) : '',
      name: team.name || '',
      member_ids: team.members ? team.members.map((member) => String(member.id)) : []
    });
    focusDataManagement();
  };

  const handleTeamCreateOpen = () => {
    setActiveDataForm('team');
    setEditingTeam(null);
    setTeamForm({ project_id: '', name: '', member_ids: [] });
    focusDataManagement();
  };

  const handleTeamDelete = async (teamId) => {
    if (!window.confirm('Hapus tim ini?')) return;
    try {
      await apiClient.delete(`/teams/${teamId}`);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: TAUTAN PROYEK (PROJECT LINKS)
   * Fungsi-fungsi untuk menyimpan dan mengedit tautan eksternal proyek.
   * -------------------------------------------------------- */
  const handleLinkSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...linkForm,
        project_id: linkForm.project_id ? Number(linkForm.project_id) : null,
        sort_order: Number(linkForm.sort_order || 0)
      };
      if (editingLink) {
        await apiClient.put(`/project-links/${editingLink.id}`, payload);
      } else {
        await apiClient.post('/project-links', payload);
      }
      setLinkForm({ project_id: '', title: '', url: '', type: 'other', sort_order: 0 });
      setEditingLink(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleLinkEdit = (link) => {
    setActiveDataForm('link');
    setEditingLink(link);
    setLinkForm({
      project_id: link.project_id || '',
      title: link.title || '',
      url: link.url || '',
      type: link.type || 'other',
      sort_order: link.sort_order || 0
    });
    focusDataManagement();
  };

  const handleLinkCreateOpen = () => {
    setActiveDataForm('link');
    setEditingLink(null);
    setLinkForm({ project_id: '', title: '', url: '', type: 'other', sort_order: 0 });
    focusDataManagement();
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: RISIKO
   * Fungsi-fungsi untuk menyimpan dan mengedit data risiko proyek.
   * -------------------------------------------------------- */
  const handleRiskSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...riskForm,
        project_id: Number(riskForm.project_id),
        owner_id: riskForm.owner_id ? Number(riskForm.owner_id) : null,
        due_date: riskForm.due_date || null
      };
      if (editingRisk) {
        await apiClient.put(`/risks/${editingRisk.id}`, payload);
      } else {
        await apiClient.post('/risks', payload);
      }
      setRiskForm({ project_id: '', title: '', description: '', probability: 'medium', impact: 'medium', mitigation: '', status: 'open', owner_id: '', due_date: '' });
      setEditingRisk(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRiskEdit = (risk) => {
    setActiveDataForm('risk');
    setEditingRisk(risk);
    setRiskForm({
      project_id: risk.project_id || '',
      title: risk.title || '',
      description: risk.description || '',
      probability: risk.probability || 'medium',
      impact: risk.impact || 'medium',
      mitigation: risk.mitigation || '',
      status: risk.status || 'open',
      owner_id: risk.owner_id || '',
      due_date: toDateInput(risk.due_date)
    });
    focusDataManagement();
  };

  const handleRiskCreateOpen = () => {
    setActiveDataForm('risk');
    setEditingRisk(null);
    setRiskForm({ project_id: '', title: '', description: '', probability: 'medium', impact: 'medium', mitigation: '', status: 'open', owner_id: '', due_date: '' });
    focusDataManagement();
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: LOG WAKTU (TIME LOG)
   * Fungsi-fungsi untuk menyimpan dan mengedit catatan jam kerja.
   * -------------------------------------------------------- */
  const handleTimeLogSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...timeLogForm,
        task_id: Number(timeLogForm.task_id),
        user_id: timeLogForm.user_id ? Number(timeLogForm.user_id) : undefined,
        hours: Number(timeLogForm.hours),
        log_date: timeLogForm.log_date || undefined
      };
      if (editingTimeLog) {
        await apiClient.put(`/time-logs/${editingTimeLog.id}`, payload);
      } else {
        await apiClient.post('/time-logs', payload);
      }
      setTimeLogForm({ task_id: '', user_id: '', hours: '', log_date: '' });
      setEditingTimeLog(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleTimeLogEdit = (log) => {
    setActiveDataForm('timeLog');
    setEditingTimeLog(log);
    setTimeLogForm({
      task_id: log.task_id || '',
      user_id: log.user_id || '',
      hours: log.hours || '',
      log_date: toDateInput(log.log_date)
    });
    focusDataManagement();
  };

  const handleTimeLogCreateOpen = () => {
    setActiveDataForm('timeLog');
    setEditingTimeLog(null);
    setTimeLogForm({ task_id: '', user_id: '', hours: '', log_date: '' });
    focusDataManagement();
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: DEPENDENSI TUGAS
   * Fungsi-fungsi untuk menyimpan dan mengedit relasi dependensi antar tugas.
   * -------------------------------------------------------- */
  const handleDependencySave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        task_id: Number(dependencyForm.task_id),
        depends_on_task_id: Number(dependencyForm.depends_on_task_id)
      };
      if (editingDependency) {
        await apiClient.put(`/task-dependencies/${editingDependency.id}`, payload);
      } else {
        await apiClient.post('/task-dependencies', payload);
      }
      setDependencyForm({ task_id: '', depends_on_task_id: '' });
      setEditingDependency(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDependencyEdit = (dependency) => {
    setActiveDataForm('dependency');
    setEditingDependency(dependency);
    setDependencyForm({
      task_id: dependency.task_id || '',
      depends_on_task_id: dependency.depends_on_task_id || ''
    });
    focusDataManagement();
  };

  const handleDependencyCreateOpen = () => {
    setActiveDataForm('dependency');
    setEditingDependency(null);
    setDependencyForm({ task_id: '', depends_on_task_id: '' });
    focusDataManagement();
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: FILE PROYEK
   * Fungsi-fungsi untuk menyimpan dan mengedit referensi file proyek.
   * -------------------------------------------------------- */
  const handleFileSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...fileForm,
        project_id: Number(fileForm.project_id)
      };
      if (editingFile) {
        await apiClient.put(`/project-files/${editingFile.id}`, payload);
      } else {
        await apiClient.post('/project-files', payload);
      }
      setFileForm({ project_id: '', title: '', file_url: '', file_type: 'dokumen' });
      setEditingFile(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileEdit = (file) => {
    setActiveDataForm('file');
    setEditingFile(file);
    setFileForm({
      project_id: file.project_id || '',
      title: file.title || '',
      file_url: file.file_url || '',
      file_type: file.file_type || 'dokumen'
    });
    focusDataManagement();
  };

  const handleFileCreateOpen = () => {
    setActiveDataForm('file');
    setEditingFile(null);
    setFileForm({ project_id: '', title: '', file_url: '', file_type: 'dokumen' });
    focusDataManagement();
  };

  /* --------------------------------------------------------
   * HANDLER CRUD: KOMENTAR TUGAS
   * Fungsi-fungsi untuk menyimpan dan mengedit komentar pada tugas.
   * -------------------------------------------------------- */
  const handleCommentSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        task_id: Number(commentForm.task_id),
        comment: commentForm.comment
      };
      if (editingComment) {
        await apiClient.put(`/task-comments/${editingComment.id}`, payload);
      } else {
        await apiClient.post('/task-comments', payload);
      }
      setCommentForm({ task_id: '', comment: '' });
      setEditingComment(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCommentEdit = (comment) => {
    setActiveDataForm('comment');
    setEditingComment(comment);
    setCommentForm({
      task_id: comment.task_id || '',
      comment: comment.comment || ''
    });
    focusDataManagement();
  };

  const handleCommentCreateOpen = () => {
    setActiveDataForm('comment');
    setEditingComment(null);
    setCommentForm({ task_id: '', comment: '' });
    focusDataManagement();
  };

  /**
   * FUNGSI: deleteRecord
   * Fungsi generik untuk menghapus record dari API dengan konfirmasi dialog.
   */
  const deleteRecord = async (path, id, message) => {
    if (!window.confirm(message)) return;
    try {
      await apiClient.delete(`${path}/${id}`);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  /* --------------------------------------------------------
   * FUNGSI EKSPOR DATA
   * Menyediakan fitur unduh data tugas dalam format CSV, Excel (HTML), dan PDF.
   * -------------------------------------------------------- */
  const getTaskExportRows = () => filteredTasks.map((task) => [
      task.name,
      task.project_name || '-',
      labelFrom(TASK_STATUS_LABELS, task.status),
      labelFrom(ROLE_LABELS, task.assigned_role || users.find((entry) => Number(entry.id) === Number(task.assigned_to))?.role),
      task.assigned_username || 'Belum ditugaskan',
      formatDate(task.due_date)
  ]);

  const getExportFilename = (extension) => `tugas_terfilter_${new Date().toISOString().slice(0, 10)}.${extension}`;

  const getFilterSummary = () => [
    ['Status', filters.status ? labelFrom(TASK_STATUS_LABELS, filters.status) : 'Semua Status'],
    ['Peran', filters.role ? labelFrom(ROLE_LABELS, filters.role) : 'Semua Peran'],
    ['Dari', filters.fromDate || '-'],
    ['Sampai', filters.toDate || '-']
  ];

  /**
   * FUNGSI: exportTasksCsv
   * Mengekspor data tugas yang terfilter ke format CSV dan memicu unduhan.
   */
  const exportTasksCsv = () => {
    const rows = getTaskExportRows();
    const csvContent = [TASK_EXPORT_HEADERS, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    downloadBlob(`\ufeff${csvContent}`, getExportFilename('csv'), 'text/csv;charset=utf-8;');
  };

  /**
   * FUNGSI: exportTasksExcel
   * Mengekspor data tugas yang terfilter ke format Excel (HTML table) dan memicu unduhan.
   */
  const exportTasksExcel = () => {
    const rows = getTaskExportRows();
    const filterRows = getFilterSummary()
      .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
      .join('');
    const tableRows = rows.length
      ? rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value || '-')}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${TASK_EXPORT_HEADERS.length}">Tidak ada data sesuai filter.</td></tr>`;
    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #111827; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
            th { background: #eaf2f8; font-weight: 700; }
            th, td { border: 1px solid #9ca3af; padding: 8px; vertical-align: top; }
          </style>
        </head>
        <body>
          <h1>Daftar Tugas Terfilter</h1>
          <table>${filterRows}</table>
          <table>
            <thead><tr>${TASK_EXPORT_HEADERS.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;
    downloadBlob(`\ufeff${html}`, getExportFilename('xls'), 'application/vnd.ms-excel;charset=utf-8;');
  };

  /**
   * FUNGSI: exportTasksPdf
   * Mengekspor data tugas yang terfilter ke format PDF menggunakan jsPDF dan autoTable.
   */
  const exportTasksPdf = () => {
    const rows = getTaskExportRows();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const filterSummary = getFilterSummary().map(([label, value]) => `${label}: ${value}`).join('   |   ');

    doc.setFontSize(16);
    doc.text('Daftar Tugas Terfilter', 40, 42);
    doc.setFontSize(9);
    doc.text(filterSummary, 40, 62, { maxWidth: 760 });

    autoTable(doc, {
      startY: 82,
      head: [TASK_EXPORT_HEADERS],
      body: rows.length ? rows : [['Tidak ada data sesuai filter.', '-', '-', '-', '-', '-']],
      styles: {
        fontSize: 8,
        cellPadding: 6,
        overflow: 'linebreak',
        valign: 'top'
      },
      headStyles: {
        fillColor: [47, 111, 159],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 170 },
        1: { cellWidth: 150 },
        2: { cellWidth: 95 },
        3: { cellWidth: 105 },
        4: { cellWidth: 120 },
        5: { cellWidth: 100 }
      }
    });

    doc.save(getExportFilename('pdf'));
  };

  /**
   * EFFECT: Inisialisasi dan Update Chart.js
   * Membuat/memperbarui 3 chart: Donut (status tugas), Bar (status proyek), dan Line (burn-down).
   * Chart dihancurkan dan dibuat ulang setiap kali data berubah untuk menghindari memory leak.
   */
  useEffect(() => {
    const ctx1 = document.getElementById('statusChart');
    const ctx2 = document.getElementById('projectChart');

    if (statusChartRef.current) {
      statusChartRef.current.destroy();
      statusChartRef.current = null;
    }
    if (projectChartRef.current) {
      projectChartRef.current.destroy();
      projectChartRef.current = null;
    }

    if (ctx1) {
      statusChartRef.current = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statusCounts).map((status) => labelFrom(TASK_STATUS_LABELS, status)),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ['#2f6f9f', '#d89b2b', '#2f8f83'],
            borderColor: '#ffffff',
            borderWidth: 4,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          devicePixelRatio: chartPixelRatio(),
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 18,
                boxWidth: 8,
                font: { size: 12, weight: 700 }
              }
            },
            tooltip: {
              backgroundColor: '#152333',
              padding: 12,
              cornerRadius: 8,
              displayColors: false
            }
          }
        }
      });
    }

    if (ctx2) {
      projectChartRef.current = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: Object.keys(projectStatus).map((status) => labelFrom(PROJECT_STATUS_LABELS, status)),
          datasets: [{
            label: 'Proyek',
            data: Object.values(projectStatus),
            backgroundColor: ['#2f6f9f', '#2f8f83', '#6b7280', '#d89b2b', '#276f66', '#b7791f', '#b42318'],
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 48
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          devicePixelRatio: chartPixelRatio(),
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#152333',
              padding: 12,
              cornerRadius: 8,
              displayColors: false
            }
          },
          scales: {
            x: {
              alignToPixels: true,
              grid: { display: false },
              ticks: { color: '#52677c', font: { size: 12, weight: 700 } }
            },
            y: {
              alignToPixels: true,
              beginAtZero: true,
              ticks: { precision: 0, color: '#52677c', font: { size: 12 } },
              grid: { color: 'rgba(82, 103, 124, 0.12)', drawBorder: false }
            }
          }
        }
      });
    }

    const ctx3 = document.getElementById('burndownChart');
    if (ctx3) {
      if (burnDownChartRef.current) {
        burnDownChartRef.current.destroy();
        burnDownChartRef.current = null;
      }
      const gradient = ctx3.getContext('2d').createLinearGradient(0, 0, 0, 260);
      gradient.addColorStop(0, 'rgba(47, 143, 131, 0.22)');
      gradient.addColorStop(1, 'rgba(47, 143, 131, 0)');
      burnDownChartRef.current = new Chart(ctx3, {
        type: 'line',
        data: {
          labels: burnDownData.labels,
          datasets: [
            {
              label: 'Rencana',
              data: burnDownData.ideal,
              borderColor: '#64748b',
              borderDash: [8, 6],
              borderWidth: 3,
              pointRadius: 0,
              borderCapStyle: 'round',
              borderJoinStyle: 'round',
              fill: false,
              tension: 0.22
            },
            {
              label: 'Aktual',
              data: burnDownData.actual,
              borderColor: '#2f8f83',
              backgroundColor: gradient,
              borderWidth: 4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#2f8f83',
              pointBorderWidth: 3,
              borderCapStyle: 'round',
              borderJoinStyle: 'round',
              fill: true,
              tension: 0.22
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          devicePixelRatio: chartPixelRatio(),
          layout: {
            padding: {
              top: 10,
              right: 12,
              bottom: 4,
              left: 8
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'line',
                padding: 18,
                font: { size: 12, weight: 700 }
              }
            },
            tooltip: {
              backgroundColor: '#152333',
              padding: 12,
              cornerRadius: 8
            }
          },
          scales: {
            y: {
              alignToPixels: true,
              beginAtZero: true,
              grid: { color: 'rgba(82, 103, 124, 0.16)', drawBorder: false },
              ticks: { color: '#52677c', precision: 0, font: { size: 12, weight: 700 } },
              title: {
                display: true,
                text: 'Sisa Tugas',
                color: '#52677c',
                font: { weight: 800 }
              }
            },
            x: {
              alignToPixels: true,
              grid: { display: false },
              ticks: { color: '#52677c', maxRotation: 0, autoSkipPadding: 24, font: { size: 12, weight: 700 } },
              title: {
                display: true,
                text: 'Waktu',
                color: '#52677c',
                font: { weight: 800 }
              }
            }
          }
        }
      });
    }

    return () => {
      if (statusChartRef.current) {
        statusChartRef.current.destroy();
        statusChartRef.current = null;
      }
      if (projectChartRef.current) {
        projectChartRef.current.destroy();
        projectChartRef.current = null;
      }
      if (burnDownChartRef.current) {
        burnDownChartRef.current.destroy();
        burnDownChartRef.current = null;
      }
    };
  }, [statusCounts, projectStatus, burnDownData]);

  /* --------------------------------------------------------
   * RENDER: JSX UTAMA DASHBOARD
   * Menampilkan panel selamat datang, ringkasan statistik, kategori navigasi,
   * dan seluruh section data (tugas, milestone, tim, monitoring, risiko, proyek, form CRUD).
   * -------------------------------------------------------- */
  return (
    <div className="page dashboard-page">
      <section id="dashboard-section" className="welcome-panel">
        <h2>Selamat datang, {user.username}</h2>
      </section>

      <section className="dashboard-intro">
        <article className="hero-card">
          <div className="hero-header">
            <div>
              <h2>Dasbor & Navigasi Utama</h2>
              <p>Ringkasan proyek, tugas, status, dan milestone utama.</p>
            </div>
          </div>
          <div className="overview-grid">
            <div>
              <strong>Projects</strong>
              <p>{totalProjects}</p>
            </div>
            <div>
              <strong>Tasks</strong>
              <p>{tasks.length}</p>
            </div>
            <div>
              <strong>Completed</strong>
              <p>{statusCounts.done || 0}</p>
            </div>
            <div>
              <strong>Pending</strong>
              <p>{statusCounts.todo || 0}</p>
            </div>
          </div>
          <div className="milestone-tracker">
            <div className="milestone-tracker-header">
              <h3>Milestone Tracker</h3>
            </div>
            <p>Perkembangan fase utama proyek.</p>
            <div className="progress-list">
              {milestoneProgress.length ? milestoneProgress.map((item) => (
                <div key={item.id || item.phase} className="progress-item">
                  <div className="progress-item-heading">
                    <span>{item.phase}</span>
                    <div className="progress-item-actions">
                      <span>{item.percent}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              )) : <p className="empty-state">Belum ada milestone di database.</p>}
            </div>
          </div>
        </article>

        <section className="rbac-section">
          <div className="rbac-card">
            <h2>Hak Akses Berdasarkan Peran</h2>
            <p>Akses disesuaikan dengan peran pengguna.</p>
            <div className="rbac-grid">
              <article className="rbac-item">
                <h3>Project Manager</h3>
                <ul>
                  <li>Mengatur anggaran dan alokasi tim.</li>
                  <li>Memantau profitabilitas proyek.</li>
                  <li>Menindaklanjuti potensi keterlambatan.</li>
                </ul>
              </article>
              <article className="rbac-item">
                <h3>Developer</h3>
                <ul>
                  <li>Melihat daftar tugas harian.</li>
                  <li>Mengunggah hasil pekerjaan atau memperbarui status bug.</li>
                  <li>Melaporkan hambatan teknis.</li>
                </ul>
              </article>
              <article className="rbac-item">
                <h3>Client</h3>
                <ul>
                  <li>Melihat ringkasan milestone.</li>
                  <li>Melakukan UAT dan memberikan persetujuan.</li>
                  <li>Melihat laporan jam kerja sesuai kontrak.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>
      </section>

      {/* Heading kategori Dokumen - klik untuk expand/collapse konten dokumen */}
      {renderCategoryHeading('links', 'dokumen-section', 'Dokumen', 'Akses file, tautan, dan catatan kolaborasi proyek.', 'category-links-heading', 'links-category-content')}

      {/* Heading kategori Aktivitas - klik untuk expand/collapse konten tugas, milestone, tim */}
      {renderCategoryHeading('work', 'aktivitas-section', 'Aktivitas', 'Pantau tugas, milestone, dan susunan tim.', 'category-work-heading', 'work-category-content')}

      {/* Heading kategori Kinerja - klik untuk expand/collapse monitoring dan chart */}
      {renderCategoryHeading('monitoring', 'kinerja-section', 'Kinerja', 'Lihat progres, beban kerja, dan laporan tugas.', 'category-monitoring-heading', 'monitoring-category-content')}

      {/* Heading kategori Risiko - klik untuk expand/collapse register risiko */}
      {renderCategoryHeading('risk', 'risiko-section', 'Risiko', 'Kelola potensi hambatan dan tindak lanjutnya.', 'category-risk-heading', 'risk-category-content')}

      {/* ====== KONTEN KATEGORI: AKTIVITAS (Tugas, Milestone, Tim) ====== */}
      <div
        id="work-category-content"
        className={`category-content-group category-content-work ${categoryCollapsed('work') ? 'is-collapsed' : 'is-expanded'}`}
        aria-hidden={categoryCollapsed('work')}
      >
      {/* Section Manajemen Tugas */}
      <section id="tasks-section" className="task-management-section">
        <div className="task-management-card">
          <div className="task-management-header">
            <div>
              <h2>Tugas</h2>
              <p>Pantau pekerjaan utama, progres, tenggat, dan dependensi.</p>
            </div>
          </div>

          {/* Grid berisi Kanban Board dan Dependencies */}
          <div className="task-management-grid">
            {/* Kartu Kanban Board / Gantt Chart */}
            <article className="task-card">
              <div className="section-action-header">
                <div>
                  <h3>Kanban Board / Gantt Chart</h3>
                  <p>Prioritas kerja dan tenggat utama tim.</p>
                </div>
                {/* Tombol Tambah tugas (hanya PM) */}
                {user.role === 'pm' && (
                  <button type="button" className="mini-action-button" onClick={handleTaskCreateOpen}>
                    Tambah
                  </button>
                )}
              </div>
              {/* Daftar tugas dalam format Gantt dengan progress bar */}
              <div className="gantt-preview">
                {ganttItems.length ? ganttItems.map((task) => (
                  <div key={task.id} className="gantt-row">
                    <div className="gantt-row-main">
                      <span>{task.name}</span>
                      <small>{labelFrom(TASK_STATUS_LABELS, task.status)} - {task.percent}%</small>
                    </div>
                    {/* Tombol Edit tugas (hanya PM) */}
                    {user.role === 'pm' && (
                      <button type="button" className="text-action-button" onClick={() => handleTaskEdit(task)}>
                        Edit
                      </button>
                    )}
                    {/* Bar progres visual tugas */}
                    <div className="gantt-progress-track" aria-label={`Progres ${task.percent}%`}>
                      <div className="gantt-bar" style={{ width: `${Math.max(8, task.percent)}%` }} />
                    </div>
                  </div>
                )) : <p className="empty-state">Belum ada tugas untuk ditampilkan.</p>}
              </div>
            </article>

            {/* Kartu Dependencies (Dependensi Tugas) */}
            <article className="task-card">
              <div className="section-action-header">
                <div>
                  <h3>Dependencies</h3>
                  <p>Tugas yang menunggu pekerjaan lain selesai.</p>
                </div>
                {/* Tombol Tambah dependensi (hanya PM) */}
                {user.role === 'pm' && (
                  <button type="button" className="mini-action-button" onClick={handleDependencyCreateOpen}>
                    Tambah
                  </button>
                )}
              </div>
              {/* Daftar dependensi antar tugas */}
              <div className="dependency-list">
                {taskDependencies.length ? taskDependencies.map((dependency) => (
                  <div key={dependency.id} className="dependency-item inline-action-row">
                    <div>
                      <span>{dependency.task_name}</span>
                      <small>Menunggu: {dependency.depends_on_task_name}</small>
                    </div>
                    {/* Tombol Edit dependensi (hanya PM) */}
                    {user.role === 'pm' && (
                      <button type="button" className="text-action-button" onClick={() => handleDependencyEdit(dependency)}>
                        Edit
                      </button>
                    )}
                  </div>
                )) : <p className="empty-state">Belum ada dependensi tugas.</p>}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Section Milestone & Tim */}
      <section id="milestones-section" className="milestone-team-section">
        <div className="milestone-team-card">
          <div className="section-action-header">
            <div>
              <h2>Milestone & Tim</h2>
              <p>Capaian proyek dan susunan tim diletakkan berdekatan agar konteksnya mudah dibaca.</p>
            </div>
          </div>
          <div className="milestone-team-grid">
            {/* Kartu Milestone */}
            <article className="task-card">
              <div className="section-action-header">
                <div>
                  <h3>Milestone</h3>
                  <p>Target penting dan status pencapaian setiap proyek.</p>
                </div>
                {/* Tombol Tambah milestone (hanya PM) */}
                {user.role === 'pm' && (
                  <button type="button" className="mini-action-button" onClick={handleMilestoneCreateOpen}>
                    Tambah
                  </button>
                )}
              </div>
              {/* Daftar milestone dengan persentase pencapaian */}
              <ul className="milestone-list">
                {milestoneProgress.length ? milestoneProgress.map((milestone) => (
                  <li key={`${milestone.phase}-${milestone.project || ''}`} className="inline-action-row">
                    <div>
                      <strong>{milestone.phase}</strong>
                      <small>{milestone.project || '-'} - {labelFrom(MILESTONE_STATUS_LABELS, milestone.status)}</small>
                      <span>{milestone.percent}% selesai</span>
                    </div>
                    {/* Tombol Edit milestone (hanya PM) */}
                    {user.role === 'pm' && (
                      <button type="button" className="text-action-button" onClick={() => handleMilestoneEdit(milestone)}>
                        Edit
                      </button>
                    )}
                  </li>
                )) : <li className="empty-state">Belum ada milestone.</li>}
              </ul>
            </article>

            {/* Kartu Tim */}
            <article id="teams-section" className="task-card team-overview-card">
              <div className="section-action-header">
                <div>
                  <h3>Tim</h3>
                  <p>Daftar tim dan anggota yang terlibat.</p>
                </div>
                {/* Tombol Tambah tim (hanya PM) */}
                {user.role === 'pm' && (
                  <button type="button" className="mini-action-button" onClick={handleTeamCreateOpen}>
                    Tambah
                  </button>
                )}
              </div>
              {/* Daftar tim beserta anggotanya */}
              <div className="team-overview-list">
                {teams.length ? teams.map((team) => (
                  <div key={team.id} className="team-overview-item inline-action-row">
                    <div>
                      <strong>{team.name}</strong>
                      <span>{teamMemberNames(team)}</span>
                      <small>{team.project_name ? `${team.project_name} - ` : ''}{team.members?.length || 0} anggota</small>
                    </div>
                    {/* Tombol Edit tim (hanya PM) */}
                    {user.role === 'pm' && (
                      <button type="button" className="text-action-button" onClick={() => handleTeamEdit(team)}>
                        Edit
                      </button>
                    )}
                  </div>
                )) : <p className="empty-state">Belum ada tim.</p>}
              </div>
            </article>
          </div>
        </div>
      </section>
      </div>

      {/* ====== KONTEN KATEGORI: KINERJA (Monitoring, Filter, Chart, Tabel) ====== */}
      <div
        id="monitoring-category-content"
        className={`category-content-group category-content-monitoring ${categoryCollapsed('monitoring') ? 'is-collapsed' : 'is-expanded'}`}
        aria-hidden={categoryCollapsed('monitoring')}
      >
      {/* Section Monitoring Progres & Performa */}
      <section id="monitoring-section" className="monitoring-section">
        <div className="monitoring-panel">
          <div className="monitoring-header">
            <div>
              <h2>Monitoring Progres & Performa</h2>
              <p>Indikator jadwal, beban kerja, dan pencatatan waktu.</p>
            </div>
          </div>

          <div className="monitoring-grid">
            {/* Kartu Burn-down Chart */}
            <article className="monitoring-card">
              <h3>Burn-down Chart</h3>
              <p>Perbandingan target dan jumlah tugas yang belum selesai.</p>
              <div className="burndown-chart-frame">
                {/* Canvas untuk Chart.js burn-down line chart */}
                <canvas id="burndownChart" aria-label="Burn-down chart sisa pekerjaan dan waktu" />
              </div>
            </article>

            {/* Kartu Resource Utilization */}
            <article className="monitoring-card">
              <h3>Resource Utilization</h3>
              <p>Beban kerja tim dalam jam dan persentase utilisasi.</p>
              {/* Tabel utilisasi sumber daya */}
              <table className="utilization-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Jam / Minggu</th>
                    <th>Utilisasi</th>
                  </tr>
                </thead>
                <tbody>
                  {resourceUtilization.length ? resourceUtilization.map((member) => (
                    <tr key={member.name}>
                      <td>{member.name}</td>
                      <td>{member.hours}</td>
                      <td>{member.utilization}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3">Belum ada log waktu.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </article>

            {/* Kartu Time Tracking */}
            <article className="monitoring-card">
              <div className="section-action-header">
                <div>
                  <h3>Time Tracking</h3>
                  <p>Catatan waktu pekerjaan per tanggal.</p>
                </div>
                {/* Tombol Tambah log waktu (bukan client) */}
                {user.role !== 'client' && (
                  <button type="button" className="mini-action-button" onClick={handleTimeLogCreateOpen}>
                    Tambah
                  </button>
                )}
              </div>
              {/* Daftar entri time tracking terbaru */}
              <div className="time-tracking-list">
                {timeTrackingEntries.length ? timeTrackingEntries.map((entry) => (
                  <div key={entry.id || `${entry.task}-${entry.date}`} className="time-tracking-item inline-action-row">
                    <div>
                      <span>{entry.task}</span>
                      <small>{entry.hours} jam - {entry.date}{entry.username ? ` - ${entry.username}` : ''}</small>
                    </div>
                    {/* Tombol Edit log waktu (bukan client) */}
                    {user.role !== 'client' && (
                      <button type="button" className="text-action-button" onClick={() => handleTimeLogEdit(entry)}>
                        Edit
                      </button>
                    )}
                  </div>
                )) : <p className="empty-state">Belum ada log waktu.</p>}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Section Filter Tugas */}
      <section id="filters-section" className="filters-section">
        <h2>Filter Tasks</h2>
        {/* Baris filter: status, peran, rentang tanggal */}
        <div className="filters-row">
          <label className="filter-field">
            <span>Status</span>
            <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
              <option value="">Semua Status</option>
              <option value="todo">Belum Dikerjakan</option>
              <option value="in_progress">Berjalan</option>
              <option value="done">Selesai</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Peran</span>
            <select value={filters.role} onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}>
              <option value="">Semua Peran</option>
              <option value="pm">Project Manager</option>
              <option value="dev">Developer</option>
              <option value="client">Client</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Dari</span>
            <input type="date" value={filters.fromDate} onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))} />
          </label>
          <label className="filter-field">
            <span>Sampai</span>
            <input type="date" value={filters.toDate} onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))} />
          </label>
          {/* Tombol refresh data */}
          <button className="filter-action refresh-action" type="button" onClick={refreshData} disabled={loading}>
            Perbarui
          </button>
        </div>
        {/* Tombol ekspor data tugas (CSV, Excel, PDF) */}
        <div className="export-actions" aria-label="Pilihan unduh data tugas">
          <button className="filter-action export-csv" type="button" onClick={exportTasksCsv}>
            Unduh CSV
          </button>
          <button className="filter-action export-excel" type="button" onClick={exportTasksExcel}>
            Unduh Excel
          </button>
          <button className="filter-action export-pdf" type="button" onClick={exportTasksPdf}>
            Unduh PDF
          </button>
        </div>
      </section>

      {/* Section Chart Status Tugas dan Proyek */}
      <section id="charts-section" className="charts-section">
        {/* Chart Donut: Distribusi status tugas */}
        <div className="chart-card">
          <h3>Task Status</h3>
          <canvas id="statusChart" />
        </div>
        {/* Chart Bar: Distribusi status proyek */}
        <div className="chart-card">
          <h3>Project Status</h3>
          <canvas id="projectChart" />
        </div>
      </section>

      {/* Section Tabel Daftar Tugas Terfilter */}
      <section id="table-section" className="table-section">
        <h2>Task List</h2>
        <div className="data-table">
          {/* Tampilkan loading atau tabel data */}
          {loading ? <p>Memuat data...</p> : (
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Proyek</th>
                  <th>Status</th>
                  <th>Peran</th>
                  <th>Tenggat</th>
                </tr>
              </thead>
              <tbody>
                {/* Iterasi setiap tugas yang sudah difilter */}
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.name}</td>
                    <td>{task.project_name || '-'}</td>
                    <td>{labelFrom(TASK_STATUS_LABELS, task.status)}</td>
                    <td>{labelFrom(ROLE_LABELS, task.assigned_role || users.find((entry) => Number(entry.id) === Number(task.assigned_to))?.role)}</td>
                    <td>{formatDate(task.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      </div>

      {/* ====== KONTEN KATEGORI: RISIKO ====== */}
      <div
        id="risk-category-content"
        className={`category-content-group category-content-risk ${categoryCollapsed('risk') ? 'is-collapsed' : 'is-expanded'}`}
        aria-hidden={categoryCollapsed('risk')}
      >
      {/* Section Register Risiko */}
      <section id="risk-register-section" className="risk-register-section">
        <div className="risk-register-card">
          <div className="section-action-header">
            <div>
              <h2>Manajemen Risiko</h2>
              <p>Pantau potensi kendala sebelum mengganggu jadwal proyek.</p>
            </div>
            {/* Tombol Tambah Risiko (hanya PM) */}
            {user.role === 'pm' && (
              <button type="button" className="mini-action-button" onClick={handleRiskCreateOpen}>
                Tambah Risiko
              </button>
            )}
          </div>
          {/* Panel Risiko Delay Otomatis */}
          <div className="delay-risk-panel">
            <div>
              <h3>Risiko Delay</h3>
              <p>Task belum selesai yang melewati atau mendekati tenggat.</p>
            </div>
            {/* Daftar tugas yang berisiko terlambat */}
            <div className="delay-risk-list">
              {automaticDelayRisks.length ? automaticDelayRisks.slice(0, 5).map((task) => (
                <div key={task.id} className="delay-risk-item">
                  <div>
                    <strong>{task.name}</strong>
                    <small>{task.project_name || '-'} - Tenggat {formatDate(task.due_date)}</small>
                  </div>
                  {/* Badge tingkat keparahan delay */}
                  <span className={`delay-risk-badge delay-risk-${task.severity}`}>{task.label}</span>
                </div>
              )) : <p className="empty-state">Tidak ada task yang terdeteksi berisiko delay.</p>}
            </div>
          </div>
          {/* Tabel Register Risiko */}
          <table className="risk-table">
            <thead>
              <tr>
                <th>Risiko</th>
                <th>Proyek</th>
                <th>Probabilitas</th>
                <th>Dampak</th>
                <th>Status</th>
                <th>Mitigasi</th>
                {user.role === 'pm' && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {/* Iterasi setiap risiko yang terdaftar */}
              {risks.length ? risks.map((risk) => (
                <tr key={risk.id}>
                  <td>
                    <strong>{risk.title}</strong>
                    <small>{risk.description || '-'}</small>
                  </td>
                  <td>{risk.project_name || '-'}</td>
                  <td>{labelFrom(RISK_LEVEL_LABELS, risk.probability)}</td>
                  <td>{labelFrom(RISK_LEVEL_LABELS, risk.impact)}</td>
                  <td>{labelFrom(RISK_STATUS_LABELS, risk.status)}</td>
                  <td>{risk.mitigation || '-'}</td>
                  {/* Tombol Edit risiko (hanya PM) */}
                  {user.role === 'pm' && (
                    <td>
                      <button type="button" className="text-action-button" onClick={() => handleRiskEdit(risk)}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={user.role === 'pm' ? 7 : 6}>Belum ada risiko di database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      {/* ====== Section Overview Proyek ====== */}
      <section id="projects-section" className="project-overview-section">
        <div className="project-overview-card">
          <div className="section-action-header">
            <div>
              <h2>Proyek</h2>
              <p>Ringkasan proyek konsultasi TI, status, Project Manager, dan Client.</p>
            </div>
            {/* Tombol Tambah Proyek (hanya PM) */}
            {user.role === 'pm' && (
              <button type="button" className="mini-action-button" onClick={handleProjectCreateOpen}>
                Tambah Proyek
              </button>
            )}
          </div>
          {/* Grid kartu proyek */}
          {projects.length ? (
            <div className="project-overview-grid">
              {projects.map((project) => (
                <article key={project.id} className="project-card">
                  {/* Gambar cover proyek (atau SVG placeholder) */}
                  <img className="project-card-image" src={projectImage(project)} alt="" onError={(event) => handleProjectImageError(event, project)} />
                  <div className="project-card-header">
                    <h3>{project.name}</h3>
                    {/* Badge status proyek */}
                    <span className={`status-pill status-${project.status || 'planning'}`}>
                      {labelFrom(PROJECT_STATUS_LABELS, project.status || 'planning')}
                    </span>
                  </div>
                  <p>{project.description || 'Belum ada deskripsi.'}</p>
                  {/* Metadata proyek: PM dan Client */}
                  <div className="project-meta-grid">
                    <span>
                      <strong>Project Manager</strong>
                      {project.pm_username || '-'}
                    </span>
                    <span>
                      <strong>Client</strong>
                      {project.client_username || '-'}
                    </span>
                  </div>
                  {/* Tombol aksi proyek (hanya PM) */}
                  {user.role === 'pm' && (
                    <div className="page-card-actions">
                      <button type="button" onClick={() => handleProjectEdit(project)}>Edit</button>
                      <button type="button" className="danger-button" onClick={() => handleProjectDelete(project.id)}>Hapus</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : <p className="empty-state">Belum ada proyek.</p>}
        </div>
      </section>

      {/* ====== Section Kelola Data Proyek (Form CRUD) ====== */}
      <section className="data-management-section">
        <div className="data-management-card">
          <h2>Kelola Data Proyek</h2>
          <p>Kelola proyek, tugas, milestone, dan tim dari satu tempat.</p>
          {/* Tab navigasi form data */}
          <div className="data-tabs" role="tablist" aria-label="Pilih form data">
            {dataFormTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeDataForm === tab.key ? 'active' : ''}
                onClick={() => setActiveDataForm(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Grid form dan daftar data */}
          <div className="data-management-grid">
            {/* Form Proyek */}
            <article className="data-card" hidden={activeDataForm !== 'project'}>
              <h3>{editingProject ? 'Edit Proyek' : 'Tambah Proyek'}</h3>
              <form onSubmit={handleProjectSave}>
                <label>
                  Nama Proyek
                  <input value={projectForm.name} onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </label>
                <label>
                  Deskripsi
                  <input value={projectForm.description} onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))} />
                </label>
                <label>
                  Tanggal Mulai
                  <input type="date" value={projectForm.start_date} onChange={(e) => setProjectForm((prev) => ({ ...prev, start_date: e.target.value }))} />
                </label>
                <label>
                  Tanggal Selesai
                  <input type="date" value={projectForm.end_date} onChange={(e) => setProjectForm((prev) => ({ ...prev, end_date: e.target.value }))} />
                </label>
                <label>
                  Status
                  <select value={projectForm.status} onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="planning">Perencanaan</option>
                    <option value="in_progress">Berjalan</option>
                    <option value="completed">Selesai</option>
                    <option value="on_hold">Ditunda</option>
                    <option value="on_track">Sesuai Jadwal</option>
                    <option value="at_risk">Berisiko</option>
                    <option value="delayed">Tertunda</option>
                  </select>
                </label>
                <label>
                  URL Gambar Proyek
                  <input value={projectForm.cover_image_url} onChange={(e) => setProjectForm((prev) => ({ ...prev, cover_image_url: e.target.value }))} placeholder="https://..." />
                </label>
                <label>
                  Client
                  <select value={projectForm.client_id} onChange={(e) => setProjectForm((prev) => ({ ...prev, client_id: e.target.value }))}>
                    <option value="">Pilih Client</option>
                    {users.filter((user) => user.role === 'client').map((user) => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Manajer Proyek
                  <select value={projectForm.pm_id} onChange={(e) => setProjectForm((prev) => ({ ...prev, pm_id: e.target.value }))}>
                    <option value="">Pilih Project Manager</option>
                    {users.filter((user) => user.role === 'pm').map((user) => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </label>
                <button type="submit">{editingProject ? 'Simpan Perubahan' : 'Buat Proyek'}</button>
                {editingProject && <button type="button" className="secondary-button" onClick={() => { setEditingProject(null); setProjectForm({ name: '', description: '', start_date: '', end_date: '', status: 'planning', client_id: '', pm_id: '', cover_image_url: '' }); }}>Batal</button>}
              </form>
            </article>

            {/* Form Tugas */}
            <article className="data-card" hidden={activeDataForm !== 'task'}>
              <h3>{editingTask ? 'Edit Tugas' : 'Tambah Tugas'}</h3>
              <form onSubmit={handleTaskSave}>
                <label>
                  Proyek
                  <select value={taskForm.project_id} onChange={(e) => setTaskForm((prev) => ({ ...prev, project_id: e.target.value }))} required>
                    <option value="">Pilih proyek</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Nama Tugas
                  <input value={taskForm.name} onChange={(e) => setTaskForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </label>
                <label>
                  Deskripsi
                  <input value={taskForm.description} onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))} />
                </label>
                <label>
                  Penanggung Jawab
                  <select value={taskForm.assigned_to} onChange={(e) => setTaskForm((prev) => ({ ...prev, assigned_to: e.target.value }))}>
                    <option value="">Belum ditugaskan</option>
                    {users.filter((user) => user.role === 'dev').map((user) => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select value={taskForm.status} onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="todo">Belum Dikerjakan</option>
                    <option value="in_progress">Berjalan</option>
                    <option value="done">Selesai</option>
                  </select>
                </label>
                <label>
                  Progres
                  <input type="number" min="0" max="100" value={taskForm.progress} onChange={(e) => setTaskForm((prev) => ({ ...prev, progress: e.target.value }))} />
                </label>
                <label>
                  Tenggat
                  <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((prev) => ({ ...prev, due_date: e.target.value }))} />
                </label>
                <button type="submit">{editingTask ? 'Simpan Perubahan' : 'Buat Tugas'}</button>
                {editingTask && <button type="button" className="secondary-button" onClick={() => { setEditingTask(null); setTaskForm({ project_id: '', name: '', description: '', assigned_to: '', status: 'todo', progress: 0, due_date: '' }); }}>Batal</button>}
              </form>
            </article>

            {/* Form Milestone */}
            <article className="data-card" hidden={activeDataForm !== 'milestone'}>
              <h3>{editingMilestone ? 'Edit Milestone' : 'Tambah Milestone'}</h3>
              <form onSubmit={handleMilestoneSave}>
                <label>
                  Proyek
                  <select value={milestoneForm.project_id} onChange={(e) => setMilestoneForm((prev) => ({ ...prev, project_id: e.target.value }))} required>
                    <option value="">Pilih proyek</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Nama Milestone
                  <input value={milestoneForm.name} onChange={(e) => setMilestoneForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </label>
                <label>
                  Deskripsi
                  <input value={milestoneForm.description} onChange={(e) => setMilestoneForm((prev) => ({ ...prev, description: e.target.value }))} />
                </label>
                <label>
                  Tenggat
                  <input type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm((prev) => ({ ...prev, due_date: e.target.value }))} />
                </label>
                <label>
                  Status
                  <select value={milestoneForm.status} onChange={(e) => setMilestoneForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="pending">{MILESTONE_STATUS_LABELS.pending}</option>
                    <option value="achieved">{MILESTONE_STATUS_LABELS.achieved}</option>
                  </select>
                </label>
                <button type="submit">{editingMilestone ? 'Simpan Perubahan' : 'Buat Milestone'}</button>
                {editingMilestone && <button type="button" className="secondary-button" onClick={() => { setEditingMilestone(null); setMilestoneForm({ project_id: '', name: '', description: '', due_date: '', status: 'pending' }); }}>Batal</button>}
              </form>
            </article>

            {/* Form Tim */}
            <article className="data-card" hidden={activeDataForm !== 'team'}>
              <h3>{editingTeam ? 'Edit Tim' : 'Tambah Tim'}</h3>
              <form onSubmit={handleTeamSave}>
                <label>
                  Proyek
                  <select value={teamForm.project_id} onChange={(e) => setTeamForm((prev) => ({ ...prev, project_id: e.target.value }))} required>
                    <option value="">Pilih proyek</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Nama Tim
                  <input value={teamForm.name} onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </label>
                <div className="form-field form-field-wide">
                  <span className="field-label">Anggota Tim</span>
                  <div className="member-picker">
                    {users.map((entry) => {
                      const value = String(entry.id);
                      const checked = teamForm.member_ids.includes(value);
                      return (
                        <label key={entry.id} className="member-option">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => setTeamForm((prev) => ({
                              ...prev,
                              member_ids: event.target.checked
                                ? [...prev.member_ids, value]
                                : prev.member_ids.filter((memberId) => memberId !== value)
                            }))}
                          />
                          <span>{entry.username}</span>
                          <small>{entry.role}</small>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <button type="submit">{editingTeam ? 'Simpan Perubahan' : 'Buat Tim'}</button>
                {editingTeam && <button type="button" className="secondary-button" onClick={() => { setEditingTeam(null); setTeamForm({ project_id: '', name: '', member_ids: [] }); }}>Batal</button>}
              </form>
            </article>

            {/* Form khusus PM: Link, Risiko, Dependensi, File */}
            {user.role === 'pm' && (
              <>
                {/* Form Link Proyek */}
                <article className="data-card" hidden={activeDataForm !== 'link'}>
                  <h3>{editingLink ? 'Edit Link Proyek' : 'Tambah Link Proyek'}</h3>
                  <form onSubmit={handleLinkSave}>
                    <label>
                      Proyek
                      <select value={linkForm.project_id} onChange={(e) => setLinkForm((prev) => ({ ...prev, project_id: e.target.value }))}>
                        <option value="">Global</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Judul
                      <input value={linkForm.title} onChange={(e) => setLinkForm((prev) => ({ ...prev, title: e.target.value }))} required />
                    </label>
                    <label>
                      URL
                      <input type="url" value={linkForm.url} onChange={(e) => setLinkForm((prev) => ({ ...prev, url: e.target.value }))} required />
                    </label>
                    <label>
                      Tipe
                      <select value={linkForm.type} onChange={(e) => setLinkForm((prev) => ({ ...prev, type: e.target.value }))}>
                        {Object.entries(LINK_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Urutan
                      <input type="number" min="0" value={linkForm.sort_order} onChange={(e) => setLinkForm((prev) => ({ ...prev, sort_order: e.target.value }))} />
                    </label>
                    <button type="submit">{editingLink ? 'Simpan Perubahan' : 'Simpan Link'}</button>
                    {editingLink && (
                      <button type="button" className="secondary-button" onClick={() => { setEditingLink(null); setLinkForm({ project_id: '', title: '', url: '', type: 'other', sort_order: 0 }); }}>
                        Batal
                      </button>
                    )}
                  </form>
                </article>

                {/* Form Risiko */}
                <article className="data-card" hidden={activeDataForm !== 'risk'}>
                  <h3>{editingRisk ? 'Edit Risiko' : 'Tambah Risiko'}</h3>
                  <form onSubmit={handleRiskSave}>
                    <label>
                      Proyek
                      <select value={riskForm.project_id} onChange={(e) => setRiskForm((prev) => ({ ...prev, project_id: e.target.value }))} required>
                        <option value="">Pilih proyek</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Risiko
                      <input value={riskForm.title} onChange={(e) => setRiskForm((prev) => ({ ...prev, title: e.target.value }))} required />
                    </label>
                    <label>
                      Deskripsi
                      <input value={riskForm.description} onChange={(e) => setRiskForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </label>
                    <label>
                      Probabilitas
                      <select value={riskForm.probability} onChange={(e) => setRiskForm((prev) => ({ ...prev, probability: e.target.value }))}>
                        {Object.entries(RISK_LEVEL_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Dampak
                      <select value={riskForm.impact} onChange={(e) => setRiskForm((prev) => ({ ...prev, impact: e.target.value }))}>
                        {Object.entries(RISK_LEVEL_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Mitigasi
                      <input value={riskForm.mitigation} onChange={(e) => setRiskForm((prev) => ({ ...prev, mitigation: e.target.value }))} />
                    </label>
                    <label>
                      Status
                      <select value={riskForm.status} onChange={(e) => setRiskForm((prev) => ({ ...prev, status: e.target.value }))}>
                        {Object.entries(RISK_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Pemilik Risiko
                      <select value={riskForm.owner_id} onChange={(e) => setRiskForm((prev) => ({ ...prev, owner_id: e.target.value }))}>
                        <option value="">Belum ditugaskan</option>
                        {users.map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.username} ({entry.role})</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tenggat
                      <input type="date" value={riskForm.due_date} onChange={(e) => setRiskForm((prev) => ({ ...prev, due_date: e.target.value }))} />
                    </label>
                    <button type="submit">{editingRisk ? 'Simpan Perubahan' : 'Simpan Risiko'}</button>
                    {editingRisk && (
                      <button type="button" className="secondary-button" onClick={() => { setEditingRisk(null); setRiskForm({ project_id: '', title: '', description: '', probability: 'medium', impact: 'medium', mitigation: '', status: 'open', owner_id: '', due_date: '' }); }}>
                        Batal
                      </button>
                    )}
                  </form>
                </article>

                {/* Form Dependensi Tugas */}
                <article className="data-card" hidden={activeDataForm !== 'dependency'}>
                  <h3>{editingDependency ? 'Edit Dependensi' : 'Tambah Dependensi'}</h3>
                  <form onSubmit={handleDependencySave}>
                    <label>
                      Tugas
                      <select value={dependencyForm.task_id} onChange={(e) => setDependencyForm((prev) => ({ ...prev, task_id: e.target.value }))} required>
                        <option value="">Pilih tugas</option>
                        {tasks.map((task) => (
                          <option key={task.id} value={task.id}>{task.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Menunggu Tugas
                      <select value={dependencyForm.depends_on_task_id} onChange={(e) => setDependencyForm((prev) => ({ ...prev, depends_on_task_id: e.target.value }))} required>
                        <option value="">Pilih dependensi</option>
                        {tasks.map((task) => (
                          <option key={task.id} value={task.id}>{task.name}</option>
                        ))}
                      </select>
                    </label>
                    <button type="submit">{editingDependency ? 'Simpan Perubahan' : 'Simpan Dependensi'}</button>
                    {editingDependency && (
                      <button type="button" className="secondary-button" onClick={() => { setEditingDependency(null); setDependencyForm({ task_id: '', depends_on_task_id: '' }); }}>
                        Batal
                      </button>
                    )}
                  </form>
                </article>

                {/* Form File Proyek */}
                <article className="data-card" hidden={activeDataForm !== 'file'}>
                  <h3>{editingFile ? 'Edit File Proyek' : 'Tambah File Proyek'}</h3>
                  <form onSubmit={handleFileSave}>
                    <label>
                      Proyek
                      <select value={fileForm.project_id} onChange={(e) => setFileForm((prev) => ({ ...prev, project_id: e.target.value }))} required>
                        <option value="">Pilih proyek</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Judul File
                      <input value={fileForm.title} onChange={(e) => setFileForm((prev) => ({ ...prev, title: e.target.value }))} required />
                    </label>
                    <label>
                      URL File
                      <input type="url" value={fileForm.file_url} onChange={(e) => setFileForm((prev) => ({ ...prev, file_url: e.target.value }))} required />
                    </label>
                    <label>
                      Tipe File
                      <input value={fileForm.file_type} onChange={(e) => setFileForm((prev) => ({ ...prev, file_type: e.target.value }))} />
                    </label>
                    <button type="submit">{editingFile ? 'Simpan Perubahan' : 'Simpan File'}</button>
                    {editingFile && (
                      <button type="button" className="secondary-button" onClick={() => { setEditingFile(null); setFileForm({ project_id: '', title: '', file_url: '', file_type: 'dokumen' }); }}>
                        Batal
                      </button>
                    )}
                  </form>
                </article>
              </>
            )}

            {/* Form Log Waktu (bukan client) */}
            {user.role !== 'client' && (
              <article className="data-card" hidden={activeDataForm !== 'timeLog'}>
                <h3>{editingTimeLog ? 'Edit Log Waktu' : 'Tambah Log Waktu'}</h3>
                <form onSubmit={handleTimeLogSave}>
                  <label>
                    Tugas
                    <select value={timeLogForm.task_id} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, task_id: e.target.value }))} required>
                      <option value="">Pilih tugas</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id}>{task.name}</option>
                      ))}
                    </select>
                  </label>
                  {user.role === 'pm' && (
                    <label>
                      User
                      <select value={timeLogForm.user_id} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, user_id: e.target.value }))}>
                        <option value="">Gunakan akun saya</option>
                        {users.map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.username} ({entry.role})</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Jam
                    <input type="number" min="0.25" max="24" step="0.25" value={timeLogForm.hours} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, hours: e.target.value }))} required />
                  </label>
                  <label>
                    Tanggal
                    <input type="date" value={timeLogForm.log_date} onChange={(e) => setTimeLogForm((prev) => ({ ...prev, log_date: e.target.value }))} />
                  </label>
                  <button type="submit">{editingTimeLog ? 'Simpan Perubahan' : 'Simpan Log'}</button>
                  {editingTimeLog && (
                    <button type="button" className="secondary-button" onClick={() => { setEditingTimeLog(null); setTimeLogForm({ task_id: '', user_id: '', hours: '', log_date: '' }); }}>
                      Batal
                    </button>
                  )}
                </form>
              </article>
            )}

            {/* Form Komentar Tugas (semua role) */}
            <article className="data-card" hidden={activeDataForm !== 'comment'}>
              <h3>{editingComment ? 'Edit Komentar' : 'Tambah Komentar'}</h3>
              <form onSubmit={handleCommentSave}>
                <label>
                  Tugas
                  <select value={commentForm.task_id} onChange={(e) => setCommentForm((prev) => ({ ...prev, task_id: e.target.value }))} required>
                    <option value="">Pilih tugas</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>{task.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Komentar
                  <input value={commentForm.comment} onChange={(e) => setCommentForm((prev) => ({ ...prev, comment: e.target.value }))} required />
                </label>
                <button type="submit">{editingComment ? 'Simpan Perubahan' : 'Simpan Komentar'}</button>
                {editingComment && (
                  <button type="button" className="secondary-button" onClick={() => { setEditingComment(null); setCommentForm({ task_id: '', comment: '' }); }}>
                    Batal
                  </button>
                )}
              </form>
            </article>
          </div>

          {/* Grid Daftar Data (menampilkan list sesuai tab aktif) */}
          <div className="data-overview-grid">
            {/* Daftar Proyek */}
            <div className="data-list-card" hidden={activeDataList !== 'projects'}>
              <h3>Daftar Proyek</h3>
              <div className="data-list-scroll">
                {projects.length ? projects.map((project) => (
                  <div key={project.id} className="data-list-item">
                    <span className="data-list-with-image">
                      <img src={projectImage(project)} alt="" onError={(event) => handleProjectImageError(event, project)} />
                      {project.name}
                    </span>
                    <div className="data-actions">
                      <button type="button" onClick={() => handleProjectEdit(project)}>Edit</button>
                      <button type="button" className="danger-button" onClick={() => handleProjectDelete(project.id)}>Hapus</button>
                    </div>
                  </div>
                )) : <p className="empty-state">Belum ada proyek.</p>}
              </div>
            </div>
            {/* Daftar Tugas */}
            <div className="data-list-card" hidden={activeDataList !== 'tasks'}>
              <h3>Daftar Tugas</h3>
              <div className="data-list-scroll">
                {tasks.length ? tasks.map((task) => (
                  <div key={task.id} className="data-list-item">
                    <span>{task.name}</span>
                    <div className="data-actions">
                      <button type="button" onClick={() => handleTaskEdit(task)}>Edit</button>
                      <button type="button" className="danger-button" onClick={() => handleTaskDelete(task.id)}>Hapus</button>
                    </div>
                  </div>
                )) : <p className="empty-state">Belum ada tugas.</p>}
              </div>
            </div>
            {/* Daftar Milestone */}
            <div className="data-list-card" hidden={activeDataList !== 'milestones'}>
              <h3>Daftar Milestone</h3>
              <div className="data-list-scroll">
                {milestones.length ? milestones.map((milestone) => (
                  <div key={milestone.id} className="data-list-item">
                    <span>{milestone.name}</span>
                    <div className="data-actions">
                      <button type="button" onClick={() => handleMilestoneEdit(milestone)}>Edit</button>
                      <button type="button" className="danger-button" onClick={() => handleMilestoneDelete(milestone.id)}>Hapus</button>
                    </div>
                  </div>
                )) : <p className="empty-state">Belum ada milestone.</p>}
              </div>
            </div>
            {/* Daftar Tim */}
            <div className="data-list-card" hidden={activeDataList !== 'teams'}>
              <h3>Daftar Tim</h3>
              <div className="data-list-scroll">
                {teams.length ? teams.map((team) => (
                  <div key={team.id} className="data-list-item">
                    <span>{team.name}<small>{team.project_name || 'Tanpa proyek'}</small></span>
                    <div className="data-actions">
                      <button type="button" onClick={() => handleTeamEdit(team)}>Edit</button>
                      <button type="button" className="danger-button" onClick={() => handleTeamDelete(team.id)}>Hapus</button>
                    </div>
                  </div>
                )) : <p className="empty-state">Belum ada tim.</p>}
              </div>
            </div>
            {/* Daftar Link */}
            <div className="data-list-card" hidden={activeDataList !== 'links'}>
              <h3>Daftar Link</h3>
              <div className="data-list-scroll">
                {projectLinks.length ? projectLinks.map((link) => (
                  <div key={link.id} className="data-list-item">
                    <span>{link.title}</span>
                    {user.role === 'pm' && (
                      <div className="data-actions">
                        <button type="button" onClick={() => handleLinkEdit(link)}>Edit</button>
                        <button type="button" className="danger-button" onClick={() => deleteRecord('/project-links', link.id, 'Hapus link ini?')}>Hapus</button>
                      </div>
                    )}
                  </div>
                )) : <p className="empty-state">Belum ada link.</p>}
              </div>
            </div>
            {/* Daftar Risiko */}
            <div className="data-list-card" hidden={activeDataList !== 'risks'}>
              <h3>Daftar Risiko</h3>
              <div className="data-list-scroll">
                {risks.length ? risks.map((risk) => (
                  <div key={risk.id} className="data-list-item">
                    <span>{risk.title}</span>
                    {user.role === 'pm' && (
                      <div className="data-actions">
                        <button type="button" onClick={() => handleRiskEdit(risk)}>Edit</button>
                        <button type="button" className="danger-button" onClick={() => deleteRecord('/risks', risk.id, 'Hapus risiko ini?')}>Hapus</button>
                      </div>
                    )}
                  </div>
                )) : <p className="empty-state">Belum ada risiko.</p>}
              </div>
            </div>
            {/* Daftar Dependensi */}
            <div className="data-list-card" hidden={activeDataList !== 'dependencies'}>
              <h3>Daftar Dependensi</h3>
              <div className="data-list-scroll">
                {taskDependencies.length ? taskDependencies.map((dependency) => (
                  <div key={dependency.id} className="data-list-item">
                    <span>{dependency.task_name} {'->'} {dependency.depends_on_task_name}</span>
                    {user.role === 'pm' && (
                      <div className="data-actions">
                        <button type="button" onClick={() => handleDependencyEdit(dependency)}>Edit</button>
                        <button type="button" className="danger-button" onClick={() => deleteRecord('/task-dependencies', dependency.id, 'Hapus dependensi ini?')}>Hapus</button>
                      </div>
                    )}
                  </div>
                )) : <p className="empty-state">Belum ada dependensi.</p>}
              </div>
            </div>
            {/* Daftar Log Waktu */}
            <div className="data-list-card" hidden={activeDataList !== 'timeLogs'}>
              <h3>Daftar Log Waktu</h3>
              <div className="data-list-scroll">
                {timeLogs.length ? timeLogs.map((log) => (
                  <div key={log.id} className="data-list-item">
                    <span>{log.task_name || `Tugas #${log.task_id}`} - {log.hours} jam</span>
                    {user.role !== 'client' && (
                      <div className="data-actions">
                        <button type="button" onClick={() => handleTimeLogEdit(log)}>Edit</button>
                        <button type="button" className="danger-button" onClick={() => deleteRecord('/time-logs', log.id, 'Hapus log waktu ini?')}>Hapus</button>
                      </div>
                    )}
                  </div>
                )) : <p className="empty-state">Belum ada log waktu.</p>}
              </div>
            </div>
            {/* Daftar File */}
            <div className="data-list-card" hidden={activeDataList !== 'files'}>
              <h3>Daftar File</h3>
              <div className="data-list-scroll">
                {projectFiles.length ? projectFiles.map((file) => (
                  <div key={file.id} className="data-list-item">
                    <span>{file.title}</span>
                    {user.role === 'pm' && (
                      <div className="data-actions">
                        <button type="button" onClick={() => handleFileEdit(file)}>Edit</button>
                        <button type="button" className="danger-button" onClick={() => deleteRecord('/project-files', file.id, 'Hapus file ini?')}>Hapus</button>
                      </div>
                    )}
                  </div>
                )) : <p className="empty-state">Belum ada file.</p>}
              </div>
            </div>
            {/* Daftar Komentar */}
            <div className="data-list-card" hidden={activeDataList !== 'comments'}>
              <h3>Daftar Komentar</h3>
              <div className="data-list-scroll">
                {taskComments.length ? taskComments.map((comment) => (
                  <div key={comment.id} className="data-list-item">
                    <span>{comment.task_name || `Tugas #${comment.task_id}`}</span>
                    {(user.role === 'pm' || Number(comment.user_id) === Number(user.id)) && (
                      <div className="data-actions">
                        <button type="button" onClick={() => handleCommentEdit(comment)}>Edit</button>
                        {user.role === 'pm' && (
                          <button type="button" className="danger-button" onClick={() => deleteRecord('/task-comments', comment.id, 'Hapus komentar ini?')}>Hapus</button>
                        )}
                      </div>
                    )}
                  </div>
                )) : <p className="empty-state">Belum ada komentar.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== KONTEN KATEGORI: DOKUMEN (Quick Links, File Repository, Communication Log) ====== */}
      <div
        id="links-category-content"
        className={`category-content-group category-content-links ${categoryCollapsed('links') ? 'is-collapsed' : 'is-expanded'}`}
        aria-hidden={categoryCollapsed('links')}
      >
      {/* Section Quick Links */}
      <section id="quick-links-section" className="quick-links-section">
        <article className="quick-links-card">
          <div className="section-action-header">
            <div>
              <h3>Quick Links</h3>
              <p>Dokumentasi dan sumber kerja proyek.</p>
            </div>
            {/* Tombol Tambah link (hanya PM) */}
            {user.role === 'pm' && (
              <button type="button" className="mini-action-button" onClick={handleLinkCreateOpen}>
                Tambah
              </button>
            )}
          </div>
          {/* Daftar link proyek */}
          <ul>
            {projectLinks.length ? projectLinks.map((link) => (
              <li key={link.id} className="inline-action-row">
                <div>
                  {/* Link eksternal ke dokumen/sumber */}
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.title}
                  </a>
                  <small>{labelFrom(LINK_TYPE_LABELS, link.type)}{link.project_name ? ` - ${link.project_name}` : ''}</small>
                </div>
                {/* Tombol Edit link (hanya PM) */}
                {user.role === 'pm' && (
                  <button type="button" className="text-action-button" onClick={() => handleLinkEdit(link)}>
                    Edit
                  </button>
                )}
              </li>
            )) : <li className="empty-state">Belum ada link proyek di database.</li>}
          </ul>
        </article>
      </section>

      {/* Section Fitur Tambahan (File Repository & Communication Log) */}
      <section id="optional-features-section" className="optional-features-section">
        <div className="optional-features-card">
          <h2>Fitur Tambahan</h2>
          <p>Dukungan kolaborasi dan dokumentasi proyek.</p>
          <div className="optional-features-grid">
            {/* Kartu File Repository */}
            <article className="feature-item">
              <div className="section-action-header">
                <div>
                  <h3>File Repository</h3>
                  <p>Ruang penyimpanan kontrak, desain, dan dokumen serah terima.</p>
                </div>
                {/* Tombol Tambah file (hanya PM) */}
                {user.role === 'pm' && (
                  <button type="button" className="mini-action-button" onClick={handleFileCreateOpen}>
                    Tambah
                  </button>
                )}
              </div>
              {/* Daftar file proyek (maksimal 6 item) */}
              <ul>
                {projectFiles.length ? projectFiles.slice(0, 6).map((file) => (
                  <li key={file.id} className="inline-action-row">
                    <div>
                      {/* Link ke file eksternal */}
                      <a className="file-repository-link" href={file.file_url} target="_blank" rel="noreferrer">{file.title}</a>
                      <small>{file.project_name || '-'} - {file.file_type || 'dokumen'}</small>
                    </div>
                    {/* Tombol Edit file (hanya PM) */}
                    {user.role === 'pm' && (
                      <button type="button" className="text-action-button" onClick={() => handleFileEdit(file)}>
                        Edit
                      </button>
                    )}
                  </li>
                )) : <li className="empty-state">Belum ada file proyek.</li>}
              </ul>
            </article>
            {/* Kartu Communication Log (Komentar Tugas) */}
            <article className="feature-item">
              <div className="section-action-header">
                <div>
                  <h3>Communication Log</h3>
                  <p>Catatan komentar dan diskusi tugas.</p>
                </div>
                {/* Tombol Tambah komentar */}
                <button type="button" className="mini-action-button" onClick={handleCommentCreateOpen}>
                  Tambah
                </button>
              </div>
              {/* Daftar komentar terbaru (maksimal 6 item) */}
              <ul>
                {taskComments.length ? taskComments.slice(0, 6).map((comment) => (
                  <li key={comment.id} className="inline-action-row">
                    <div>
                      <strong>{comment.task_name || `Tugas #${comment.task_id}`}</strong>
                      <span>{comment.comment}</span>
                      <small>{comment.username || '-'} - {formatDate(comment.created_at)}</small>
                    </div>
                    {/* Tombol Edit komentar (PM atau pemilik komentar) */}
                    {(user.role === 'pm' || Number(comment.user_id) === Number(user.id)) && (
                      <button type="button" className="text-action-button" onClick={() => handleCommentEdit(comment)}>
                        Edit
                      </button>
                    )}
                  </li>
                )) : <li className="empty-state">Belum ada komentar tugas.</li>}
              </ul>
            </article>
          </div>
        </div>
      </section>
      </div>

    </div>
  );
}
