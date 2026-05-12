import { useEffect, useState } from 'react';
import { apiClient } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const statusLabels = {
  planning: 'Perencanaan',
  in_progress: 'Berjalan',
  completed: 'Selesai',
  on_hold: 'Ditunda',
  on_track: 'Sesuai Jadwal',
  at_risk: 'Berisiko',
  delayed: 'Tertunda'
};

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function compactSvgText(value, maxLength = 28) {
  const text = String(value || 'Project Web');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function generatedProjectImage(project) {
  const initials = (project.name || 'Project')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PR';
  const colors = project.status === 'delayed'
    ? ['#5f1616', '#b42318', '#fee2e2']
    : project.status === 'at_risk'
      ? ['#5f3b13', '#d89b2b', '#fff3c4']
      : ['#12263a', '#2f8f83', '#d9f2ef'];
  const safeInitials = escapeSvgText(initials);
  const statusLabel = escapeSvgText(statusLabels[project.status] || project.status || 'Perencanaan');
  const projectTitle = escapeSvgText(compactSvgText(project.name));
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
      <rect x="34" y="108" width="58" height="58" fill="${colors[1]}"/>
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
      <rect x="1328" y="148" width="150" height="44" fill="${colors[2]}"/>
      <rect x="1358" y="166" width="90" height="8" fill="${colors[1]}"/>
      <rect x="308" y="306" width="280" height="126" fill="#ffffff"/>
      <rect x="356" y="354" width="104" height="16" fill="#cbd5e1"/>
      <rect x="356" y="388" width="142" height="27" fill="${colors[1]}"/>
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
      <path d="M376 702C442 638 504 664 578 592C660 514 724 624 806 556C852 518 900 516 962 478" fill="none" stroke="${colors[1]}" stroke-width="13" stroke-linecap="round"/>
      <circle cx="962" cy="478" r="11" fill="#ffffff" stroke="${colors[1]}" stroke-width="7"/>
      <rect x="1064" y="478" width="488" height="314" fill="#ffffff"/>
      <rect x="1118" y="548" width="360" height="18" fill="#cbd5e1"/>
      <rect x="1118" y="604" width="360" height="14" fill="#eef2f7"/>
      <rect x="1118" y="656" width="310" height="14" fill="#eef2f7"/>
      <rect x="1118" y="708" width="338" height="14" fill="#eef2f7"/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function projectImage(project) {
  return project.cover_image_url || generatedProjectImage(project);
}

const defaultProjectForm = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  status: 'planning',
  client_id: '',
  pm_id: '',
  cover_image_url: ''
};

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectForm, setProjectForm] = useState(defaultProjectForm);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadProjects() {
    setLoading(true);
    try {
      const response = await apiClient.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    if (user.role === 'pm') {
      apiClient.get('/users')
        .then((response) => setUsers(response.data))
        .catch((error) => console.error(error));
    }
  }, []);

  const handleProjectSave = async (event) => {
    event.preventDefault();
    const payload = {
      ...projectForm,
      client_id: projectForm.client_id ? Number(projectForm.client_id) : undefined,
      pm_id: projectForm.pm_id ? Number(projectForm.pm_id) : undefined
    };

    try {
      if (editingProject) {
        await apiClient.put(`/projects/${editingProject.id}`, payload);
      } else {
        await apiClient.post('/projects', payload);
      }
      setProjectForm(defaultProjectForm);
      setEditingProject(null);
      loadProjects();
    } catch (error) {
      console.error(error);
    }
  };

  const handleProjectEdit = (project) => {
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
    document.querySelector('.page-control-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleProjectDelete = async (projectId) => {
    if (!window.confirm('Hapus proyek ini?')) return;
    try {
      await apiClient.delete(`/projects/${projectId}`);
      loadProjects();
    } catch (error) {
      console.error(error);
    }
  };

  const pageDescription = {
    pm: 'Kelola proyek yang berada di bawah tanggung jawab Anda.',
    dev: 'Lihat proyek yang terhubung dengan tugas Anda.',
    client: 'Lihat proyek yang terhubung dengan akun client Anda.'
  }[user.role] || 'Daftar proyek yang tersedia untuk Anda.';

  return (
    <div className="page projects-page">
      <header className="page-header">
        <div>
          <h1>Proyek</h1>
          <p>{pageDescription}</p>
        </div>
      </header>
      {user.role === 'pm' && (
        <section className="page-control-card">
          <h2>{editingProject ? 'Edit Proyek' : 'Tambah Proyek'}</h2>
          <form className="page-form-grid" onSubmit={handleProjectSave}>
            <label>
              Nama Proyek
              <input value={projectForm.name} onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </label>
            <label>
              Deskripsi
              <input value={projectForm.description} onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))} />
            </label>
            <label>
              Tanggal Mulai
              <input type="date" value={projectForm.start_date} onChange={(event) => setProjectForm((prev) => ({ ...prev, start_date: event.target.value }))} />
            </label>
            <label>
              Tanggal Selesai
              <input type="date" value={projectForm.end_date} onChange={(event) => setProjectForm((prev) => ({ ...prev, end_date: event.target.value }))} />
            </label>
            <label>
              Status
              <select value={projectForm.status} onChange={(event) => setProjectForm((prev) => ({ ...prev, status: event.target.value }))}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Client
              <select value={projectForm.client_id} onChange={(event) => setProjectForm((prev) => ({ ...prev, client_id: event.target.value }))}>
                <option value="">Pilih client</option>
                {users.filter((entry) => entry.role === 'client').map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.username}</option>
                ))}
              </select>
            </label>
            <label>
              Manajer Proyek
              <select value={projectForm.pm_id} onChange={(event) => setProjectForm((prev) => ({ ...prev, pm_id: event.target.value }))}>
                <option value="">Gunakan akun saya</option>
                {users.filter((entry) => entry.role === 'pm').map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.username}</option>
                ))}
              </select>
            </label>
            <label>
              URL Gambar Proyek
              <input type="url" value={projectForm.cover_image_url} onChange={(event) => setProjectForm((prev) => ({ ...prev, cover_image_url: event.target.value }))} placeholder="https://..." />
            </label>
            <div className="page-form-actions">
              <button type="submit">{editingProject ? 'Simpan Perubahan' : 'Buat Proyek'}</button>
              {editingProject && (
                <button type="button" className="secondary-button" onClick={() => { setEditingProject(null); setProjectForm(defaultProjectForm); }}>
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>
      )}
      <section className="list-section">
        {loading ? <p>Memuat proyek...</p> : projects.length === 0 ? <p>Tidak ada proyek.</p> : (
          <div className="card-grid">
            {projects.map((project) => (
              <article key={project.id} className="project-card">
                <img className="project-card-image" src={projectImage(project)} alt="" />
                <div className="project-card-header">
                  <h3>{project.name}</h3>
                  <span className={`status-pill status-${project.status || 'planning'}`}>
                    {statusLabels[project.status] || project.status || 'Perencanaan'}
                  </span>
                </div>
                <p>{project.description || 'Belum ada deskripsi.'}</p>
                <div className="project-meta-grid">
                  <span>
                    <strong>PM</strong>
                    {project.pm_username || '-'}
                  </span>
                  <span>
                    <strong>Client</strong>
                    {project.client_username || '-'}
                  </span>
                </div>
                {user.role === 'pm' && (
                  <div className="page-card-actions">
                    <button type="button" onClick={() => handleProjectEdit(project)}>Edit</button>
                    <button type="button" className="danger-button" onClick={() => handleProjectDelete(project.id)}>Hapus</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
