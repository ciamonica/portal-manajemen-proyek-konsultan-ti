import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ status: '', fromDate: '', toDate: '' });
  const [loading, setLoading] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', start_date: '', end_date: '', status: 'planning', client_id: '', pm_id: '' });
  const [taskForm, setTaskForm] = useState({ project_id: '', name: '', description: '', assigned_to: '', status: 'todo', progress: 0, due_date: '' });
  const [milestoneForm, setMilestoneForm] = useState({ project_id: '', name: '', description: '', due_date: '', status: 'pending' });
  const [teamForm, setTeamForm] = useState({ name: '', member_ids: [] });
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const statusChartRef = useRef(null);
  const projectChartRef = useRef(null);
  const burnDownChartRef = useRef(null);

  async function refreshData() {
    setLoading(true);
    try {
      const [projectsRes, tasksRes, milestonesRes, teamsRes, usersRes] = await Promise.all([
        apiClient.get('/projects'),
        apiClient.get('/tasks'),
        apiClient.get('/milestones'),
        apiClient.get('/teams'),
        apiClient.get('/users')
      ]);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
      setMilestones(milestonesRes.data);
      setTeams(teamsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.fromDate && task.due_date < filters.fromDate) return false;
    if (filters.toDate && task.due_date > filters.toDate) return false;
    return true;
  }), [tasks, filters]);

  const { statusCounts, projectStatus } = dashboardStats(filteredTasks, projects);

  const totalProjects = projects.length;
  const projectOverviewStatus = projectStatus.delayed
    ? 'Delayed'
    : projectStatus.at_risk
      ? 'At Risk'
      : 'On Track';
  const milestoneProgress = milestones.length ? milestones.slice(0, 4).map((milestone, idx) => ({
    phase: milestone.name,
    percent: milestone.status === 'achieved' ? 100 : Math.min(80, 40 + idx * 12)
  })) : [
    { phase: 'Discovery', percent: 72 },
    { phase: 'Development', percent: 56 },
    { phase: 'QA', percent: 36 },
    { phase: 'Deployment', percent: 14 }
  ];

  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const totalTasks = tasks.length;
  const completionRatio = totalTasks ? completedTasks / totalTasks : 0;
  const burnDownData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
    ideal: [100, 80, 60, 40, 20],
    actual: [
      100,
      Math.max(20, Math.round(100 - completionRatio * 60)),
      Math.max(10, Math.round(100 - completionRatio * 80)),
      Math.max(5, Math.round(100 - completionRatio * 90)),
      Math.max(0, Math.round(100 - completionRatio * 100))
    ]
  };

  const resourceUtilization = users.slice(0, 4).length ? users.slice(0, 4).map((user, idx) => ({
    name: user.username,
    hours: 32 + idx * 4,
    utilization: `${90 + idx * 5}%`
  })) : [
    { name: 'Developer A', hours: 40, utilization: '100%' },
    { name: 'Developer B', hours: 48, utilization: '120%' },
    { name: 'QA Tester', hours: 36, utilization: '90%' },
    { name: 'DevOps', hours: 30, utilization: '75%' }
  ];
  const timeTrackingEntries = [
    { task: 'Integrasi API', hours: 8, date: '2026-04-28' },
    { task: 'Desain UI', hours: 5, date: '2026-04-28' },
    { task: 'UAT Preparation', hours: 3, date: '2026-04-27' }
  ];

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
      setProjectForm({ name: '', description: '', start_date: '', end_date: '', status: 'planning', client_id: '', pm_id: '' });
      setEditingProject(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleProjectEdit = (project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name || '',
      description: project.description || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      status: project.status || 'planning',
      client_id: project.client_id || '',
      pm_id: project.pm_id || ''
    });
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
    setEditingTask(task);
    setTaskForm({
      project_id: task.project_id || '',
      name: task.name || '',
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      status: task.status || 'todo',
      progress: task.progress || 0,
      due_date: task.due_date || ''
    });
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
    setEditingMilestone(milestone);
    setMilestoneForm({
      project_id: milestone.project_id || '',
      name: milestone.name || '',
      description: milestone.description || '',
      due_date: milestone.due_date || '',
      status: milestone.status || 'pending'
    });
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

  const handleTeamSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...teamForm,
        member_ids: teamForm.member_ids.map(Number)
      };
      if (editingTeam) {
        await apiClient.put(`/teams/${editingTeam.id}`, payload);
      } else {
        await apiClient.post('/teams', payload);
      }
      setTeamForm({ name: '', member_ids: [] });
      setEditingTeam(null);
      refreshData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleTeamEdit = (team) => {
    setEditingTeam(team);
    setTeamForm({
      name: team.name || '',
      member_ids: team.members ? team.members.map((member) => String(member.id)) : []
    });
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

  const exportTasksCsv = () => {
    const header = ['Task', 'Project', 'Status', 'Assigned', 'Due Date'];
    const rows = filteredTasks.map((task) => [
      task.name,
      task.project_name || 'N/A',
      task.status,
      task.assigned_username || 'Unassigned',
      task.due_date || 'N/A'
    ]);
    const csvContent = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tasks_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ['#3498db', '#f1c40f', '#2ecc71']
          }]
        }
      });
    }

    if (ctx2) {
      projectChartRef.current = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: Object.keys(projectStatus),
          datasets: [{
            label: 'Projects',
            data: Object.values(projectStatus),
            backgroundColor: ['#9b59b6', '#e74c3c', '#27ae60', '#f39c12']
          }]
        }
      });
    }

    const ctx3 = document.getElementById('burndownChart');
    if (ctx3) {
      if (burnDownChartRef.current) {
        burnDownChartRef.current.destroy();
        burnDownChartRef.current = null;
      }
      burnDownChartRef.current = new Chart(ctx3, {
        type: 'line',
        data: {
          labels: burnDownData.labels,
          datasets: [
            {
              label: 'Ideal',
              data: burnDownData.ideal,
              borderColor: '#4338ca',
              borderDash: [6, 4],
              fill: false,
              tension: 0.2
            },
            {
              label: 'Actual',
              data: burnDownData.actual,
              borderColor: '#ef4444',
              backgroundColor: '#ef4444',
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          scales: {
            y: {
              title: {
                display: true,
                text: 'Remaining Work'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Time'
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
  }, [statusCounts, projectStatus]);

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Selamat datang, {user.username}. Role: {user.role}</p>
        </div>
        <button className="outline-button" onClick={logout}>Logout</button>
      </header>

      <section className="dashboard-intro">
        <article className="hero-card">
          <div className="hero-header">
            <h2>Dasbor & Navigasi Utama</h2>
            <span className={`status-badge status-${projectOverviewStatus.toLowerCase().replace(' ', '-')}`}>
              {projectOverviewStatus}
            </span>
          </div>
          <p>Ini adalah halaman pertama yang dilihat pengguna. Fungsinya adalah memberikan snapshot instan mengenai kesehatan proyek.</p>
          <div className="overview-grid">
            <div>
              <strong>Project Overview</strong>
              <p>{totalProjects} proyek aktif saat ini</p>
            </div>
            <div>
              <strong>On Track</strong>
              <p>{projectStatus.on_track || 0}</p>
            </div>
            <div>
              <strong>At Risk</strong>
              <p>{projectStatus.at_risk || 0}</p>
            </div>
            <div>
              <strong>Delayed</strong>
              <p>{projectStatus.delayed || 0}</p>
            </div>
          </div>
          <div className="milestone-tracker">
            <h3>Milestone Tracker</h3>
            <p>Grafik linier yang menunjukkan persentase penyelesaian fase besar.</p>
            <div className="progress-list">
              {milestoneProgress.map((item) => (
                <div key={item.phase} className="progress-item">
                  <div className="progress-item-heading">
                    <span>{item.phase}</span>
                    <span>{item.percent}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="quick-links-card">
          <h3>Quick Links</h3>
          <p>Akses cepat ke dokumentasi teknis dan sumber daya penting.</p>
          <ul>
            <li><a href="https://example.com/api-docs" target="_blank" rel="noreferrer">API Docs</a></li>
            <li><a href="https://example.com/brd" target="_blank" rel="noreferrer">BRD</a></li>
            <li><a href="https://github.com" target="_blank" rel="noreferrer">Repository</a></li>
            <li><a href="http://localhost:5174" target="_blank" rel="noreferrer">Staging Server</a></li>
          </ul>
        </article>
      </section>

      <section className="task-management-section">
        <div className="task-management-card">
          <div className="task-management-header">
            <div>
              <h2>Manajemen Tugas & Milestone</h2>
              <p>Modul ini adalah jantung dari operasional harian.</p>
            </div>
            <span className="task-management-note">Tampilkan tugas, milestone, dan dependencies agar tim tetap terkoordinasi.</span>
          </div>

          <div className="task-management-grid">
            <article className="task-card">
              <h3>Kanban Board / Gantt Chart</h3>
              <p>Visualisasi tugas membantu Developer melihat prioritas dan deadline dengan cepat.</p>
              <div className="gantt-preview">
                <div className="gantt-row">
                  <span>Desain UI</span>
                  <div className="gantt-bar gantt-bar-short" />
                </div>
                <div className="gantt-row">
                  <span>API Integration</span>
                  <div className="gantt-bar gantt-bar-medium" />
                </div>
                <div className="gantt-row">
                  <span>QA Testing</span>
                  <div className="gantt-bar gantt-bar-long" />
                </div>
                <div className="gantt-row">
                  <span>Deployment</span>
                  <div className="gantt-bar gantt-bar-small" />
                </div>
              </div>
            </article>

            <article className="task-card">
              <h3>Milestone</h3>
              <p>Penanda pencapaian penting yang biasanya terkait termin pembayaran atau tenggat waktu besar.</p>
              <ul className="milestone-list">
                <li>
                  <strong>Milestone 1:</strong> Inisiasi proyek dan analisis kebutuhan
                  <span>80% selesai</span>
                </li>
                <li>
                  <strong>Milestone 2:</strong> Pengembangan modul inti
                  <span>55% selesai</span>
                </li>
                <li>
                  <strong>Milestone 3:</strong> UAT dan persiapan live
                  <span>30% selesai</span>
                </li>
              </ul>
            </article>

            <article className="task-card">
              <h3>Dependencies</h3>
              <p>Menunjukkan tugas mana yang menghalangi (*blocking*) tugas lainnya.</p>
              <div className="dependency-list">
                <div className="dependency-item">
                  <span>Integrasi API</span>
                  <small>Blocked by: Desain API schema</small>
                </div>
                <div className="dependency-item">
                  <span>QA Automation</span>
                  <small>Blocked by: Pengujian manual selesai</small>
                </div>
                <div className="dependency-item">
                  <span>Deployment Script</span>
                  <small>Blocked by: Review konfigurasi server</small>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="monitoring-section">
        <div className="monitoring-header">
          <div>
            <h2>Monitoring Progres & Performa</h2>
            <p>Fitur ini sangat krusial bagi Project Manager untuk memastikan proyek tetap sesuai jadwal.</p>
          </div>
        </div>
        <div className="monitoring-grid">
          <article className="monitoring-card">
            <h3>Burn-down Chart</h3>
            <p>Grafik yang menunjukkan sisa pekerjaan dibandingkan dengan waktu yang tersedia.</p>
            <canvas id="burndownChart" />
            <p className="monitoring-note">Jika garis aktual berada di atas garis ideal, ini sinyal bahaya.</p>
          </article>

          <article className="monitoring-card">
            <h3>Resource Utilization</h3>
            <p>Menunjukkan beban kerja tim dalam jam dan persentase utilisasi.</p>
            <table className="utilization-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jam / Minggu</th>
                  <th>Utilisasi</th>
                </tr>
              </thead>
              <tbody>
                {resourceUtilization.map((member) => (
                  <tr key={member.name}>
                    <td>{member.name}</td>
                    <td>{member.hours}</td>
                    <td>{member.utilization}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="monitoring-card">
            <h3>Time Tracking</h3>
            <p>Pencatatan waktu nyata yang digunakan untuk pengerjaan fitur tertentu.</p>
            <div className="time-tracking-list">
              {timeTrackingEntries.map((entry) => (
                <div key={`${entry.task}-${entry.date}`} className="time-tracking-item">
                  <span>{entry.task}</span>
                  <small>{entry.hours} jam — {entry.date}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="risk-register-section">
        <div className="risk-register-card">
          <h2>Manajemen Risiko</h2>
          <p>Fitur untuk mengantisipasi Risiko Delay. Konsultan TI sering menghadapi masalah teknis tak terduga.</p>
          <table className="risk-table">
            <thead>
              <tr>
                <th>Komponen</th>
                <th>Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><em>Risk Description</em></td>
                <td>Potensi masalah (misal: "Integrasi API pihak ketiga lambat").</td>
              </tr>
              <tr>
                <td><em>Probability</em></td>
                <td>Seberapa besar kemungkinan terjadi (Low/Medium/High).</td>
              </tr>
              <tr>
                <td><em>Impact</em></td>
                <td>Seberapa parah pengaruhnya ke timeline.</td>
              </tr>
              <tr>
                <td><em>Mitigation Plan</em></td>
                <td>Rencana cadangan jika risiko tersebut benar-benar terjadi.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-management-section">
        <div className="data-management-card">
          <h2>Kelola Data Proyek</h2>
          <p>Tambah, edit, atau hapus data Proyek, Tugas, Milestone, dan Tim langsung dari dashboard.</p>
          <div className="data-management-grid">
            <article className="data-card">
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
                  Start Date
                  <input type="date" value={projectForm.start_date} onChange={(e) => setProjectForm((prev) => ({ ...prev, start_date: e.target.value }))} />
                </label>
                <label>
                  End Date
                  <input type="date" value={projectForm.end_date} onChange={(e) => setProjectForm((prev) => ({ ...prev, end_date: e.target.value }))} />
                </label>
                <label>
                  Status
                  <select value={projectForm.status} onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </label>
                <label>
                  Client
                  <select value={projectForm.client_id} onChange={(e) => setProjectForm((prev) => ({ ...prev, client_id: e.target.value }))}>
                    <option value="">Pilih client</option>
                    {users.filter((user) => user.role === 'client').map((user) => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Project Manager
                  <select value={projectForm.pm_id} onChange={(e) => setProjectForm((prev) => ({ ...prev, pm_id: e.target.value }))}>
                    <option value="">Pilih PM</option>
                    {users.filter((user) => user.role === 'pm').map((user) => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </label>
                <button type="submit">{editingProject ? 'Update Proyek' : 'Buat Proyek'}</button>
                {editingProject && <button type="button" className="secondary-button" onClick={() => { setEditingProject(null); setProjectForm({ name: '', description: '', start_date: '', end_date: '', status: 'planning', client_id: '', pm_id: '' }); }}>Batal</button>}
              </form>
            </article>

            <article className="data-card">
              <h3>{editingTask ? 'Edit Tugas' : 'Tambah Tugas'}</h3>
              <form onSubmit={handleTaskSave}>
                <label>
                  Project
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
                  Assigned To
                  <select value={taskForm.assigned_to} onChange={(e) => setTaskForm((prev) => ({ ...prev, assigned_to: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {users.filter((user) => user.role === 'dev').map((user) => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select value={taskForm.status} onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>
                <label>
                  Progress
                  <input type="number" min="0" max="100" value={taskForm.progress} onChange={(e) => setTaskForm((prev) => ({ ...prev, progress: e.target.value }))} />
                </label>
                <label>
                  Due Date
                  <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((prev) => ({ ...prev, due_date: e.target.value }))} />
                </label>
                <button type="submit">{editingTask ? 'Update Tugas' : 'Buat Tugas'}</button>
                {editingTask && <button type="button" className="secondary-button" onClick={() => { setEditingTask(null); setTaskForm({ project_id: '', name: '', description: '', assigned_to: '', status: 'todo', progress: 0, due_date: '' }); }}>Batal</button>}
              </form>
            </article>

            <article className="data-card">
              <h3>{editingMilestone ? 'Edit Milestone' : 'Tambah Milestone'}</h3>
              <form onSubmit={handleMilestoneSave}>
                <label>
                  Project
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
                  Due Date
                  <input type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm((prev) => ({ ...prev, due_date: e.target.value }))} />
                </label>
                <label>
                  Status
                  <select value={milestoneForm.status} onChange={(e) => setMilestoneForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="achieved">Achieved</option>
                  </select>
                </label>
                <button type="submit">{editingMilestone ? 'Update Milestone' : 'Buat Milestone'}</button>
                {editingMilestone && <button type="button" className="secondary-button" onClick={() => { setEditingMilestone(null); setMilestoneForm({ project_id: '', name: '', description: '', due_date: '', status: 'pending' }); }}>Batal</button>}
              </form>
            </article>

            <article className="data-card">
              <h3>{editingTeam ? 'Edit Tim' : 'Tambah Tim'}</h3>
              <form onSubmit={handleTeamSave}>
                <label>
                  Nama Tim
                  <input value={teamForm.name} onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </label>
                <label>
                  Anggota Tim
                  <select multiple value={teamForm.member_ids} onChange={(e) => setTeamForm((prev) => ({ ...prev, member_ids: Array.from(e.target.selectedOptions, (opt) => opt.value) }))}>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.username} ({user.role})</option>
                    ))}
                  </select>
                </label>
                <button type="submit">{editingTeam ? 'Update Tim' : 'Buat Tim'}</button>
                {editingTeam && <button type="button" className="secondary-button" onClick={() => { setEditingTeam(null); setTeamForm({ name: '', member_ids: [] }); }}>Batal</button>}
              </form>
            </article>
          </div>

          <div className="data-overview-grid">
            <div className="data-list-card">
              <h3>Projects</h3>
              <div className="data-list-scroll">
                {projects.map((project) => (
                  <div key={project.id} className="data-list-item">
                    <span>{project.name}</span>
                    <div className="data-actions">
                      <button type="button" onClick={() => handleProjectEdit(project)}>Edit</button>
                      <button type="button" className="danger-button" onClick={() => handleProjectDelete(project.id)}>Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="data-list-card">
              <h3>Tasks</h3>
              <div className="data-list-scroll">
                {tasks.map((task) => (
                  <div key={task.id} className="data-list-item">
                    <span>{task.name}</span>
                    <div className="data-actions">
                      <button type="button" onClick={() => handleTaskEdit(task)}>Edit</button>
                      <button type="button" className="danger-button" onClick={() => handleTaskDelete(task.id)}>Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="data-list-card">
              <h3>Milestones</h3>
              <div className="data-list-scroll">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="data-list-item">
                    <span>{milestone.name}</span>
                    <div className="data-actions">
                      <button type="button" onClick={() => handleMilestoneEdit(milestone)}>Edit</button>
                      <button type="button" className="danger-button" onClick={() => handleMilestoneDelete(milestone.id)}>Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="data-list-card">
              <h3>Teams</h3>
              <div className="data-list-scroll">
                {teams.map((team) => (
                  <div key={team.id} className="data-list-item">
                    <span>{team.name}</span>
                    <div className="data-actions">
                      <button type="button" onClick={() => handleTeamEdit(team)}>Edit</button>
                      <button type="button" className="danger-button" onClick={() => handleTeamDelete(team.id)}>Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rbac-section">
        <div className="rbac-card">
          <h2>Hak Akses Berdasarkan Peran</h2>
          <p>Setiap pengguna melihat data yang berbeda sesuai kepentingan mereka.</p>
          <div className="rbac-grid">
            <article className="rbac-item">
              <h3>Project Manager</h3>
              <ul>
                <li>Mengatur anggaran dan alokasi tim.</li>
                <li>Memantau profitabilitas proyek.</li>
                <li>Melakukan intervensi jika burn-down chart menunjukkan keterlambatan.</li>
              </ul>
            </article>
            <article className="rbac-item">
              <h3>Developer</h3>
              <ul>
                <li>Melihat daftar to-do list harian.</li>
                <li>Mengunggah hasil pekerjaan atau memperbarui status bug.</li>
                <li>Melaporkan kendala teknis (impediments).</li>
              </ul>
            </article>
            <article className="rbac-item">
              <h3>Klien</h3>
              <ul>
                <li>Melihat progres high-level (Milestone).</li>
                <li>Melakukan User Acceptance Testing (UAT) dan memberikan approval.</li>
                <li>Melihat laporan penggunaan jam kerja (jika model kontraknya adalah Time & Material).</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="optional-features-section">
        <div className="optional-features-card">
          <h2>Fitur Tambahan</h2>
          <p>Opsional tapi penting untuk mendukung kolaborasi proyek dan dokumentasi yang lebih rapi.</p>
          <div className="optional-features-grid">
            <article className="feature-item">
              <h3>File Repository</h3>
              <p>Tempat menyimpan dokumen kontrak, desain UI/UX (Figma links), dan dokumen serah terima.</p>
              <ul>
                <li>Dokumen kontrak proyek</li>
                <li>Link desain UI/UX dan prototipe</li>
                <li>Dokumen serah terima dan Handover</li>
              </ul>
            </article>
            <article className="feature-item">
              <h3>Communication Log</h3>
              <p>Integrasi dengan Slack atau kolom komentar langsung di setiap task.</p>
              <ul>
                <li>Riwayat diskusi tugas</li>
                <li>Notifikasi komentar dan update</li>
                <li>Mencegah obrolan tersebar di WhatsApp/Email</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <h2>Projects</h2>
          <p>{projects.length}</p>
        </article>
        <article className="summary-card">
          <h2>Tasks</h2>
          <p>{tasks.length}</p>
        </article>
        <article className="summary-card">
          <h2>Completed</h2>
          <p>{statusCounts.done || 0}</p>
        </article>
        <article className="summary-card">
          <h2>Pending</h2>
          <p>{statusCounts.todo || 0}</p>
        </article>
      </section>

      <section className="filters-section">
        <h2>Filter Tasks</h2>
        <div className="filters-row">
          <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
            <option value="">Semua Status</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <label>
            Dari
            <input type="date" value={filters.fromDate} onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))} />
          </label>
          <label>
            Sampai
            <input type="date" value={filters.toDate} onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))} />
          </label>
          <button type="button" onClick={() => exportTasksCsv()}>
            Export CSV
          </button>
        </div>
      </section>

      <section className="charts-section">
        <div className="chart-card">
          <h3>Task Status</h3>
          <canvas id="statusChart" />
        </div>
        <div className="chart-card">
          <h3>Project Status</h3>
          <canvas id="projectChart" />
        </div>
      </section>

      <section className="table-section">
        <h2>Task List</h2>
        <div className="data-table">
          {loading ? <p>Loading...</p> : (
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Proyek</th>
                  <th>Status</th>
                  <th>Tanggal Jatuh Tempo</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.name}</td>
                    <td>{task.project_name}</td>
                    <td>{task.status}</td>
                    <td>{task.due_date || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
