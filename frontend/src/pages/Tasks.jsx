import { useEffect, useState } from 'react';
import { apiClient } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const statusLabels = {
  todo: 'Belum Dikerjakan',
  in_progress: 'Berjalan',
  done: 'Selesai'
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

const defaultTaskForm = {
  project_id: '',
  name: '',
  description: '',
  assigned_to: '',
  status: 'todo',
  progress: 0,
  due_date: ''
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadTasks() {
    setLoading(true);
    try {
      const response = await apiClient.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
    if (user.role === 'pm') {
      Promise.all([apiClient.get('/projects'), apiClient.get('/users')])
        .then(([projectResponse, userResponse]) => {
          setProjects(projectResponse.data);
          setUsers(userResponse.data);
        })
        .catch((error) => console.error(error));
    }
  }, []);

  const handleTaskSave = async (event) => {
    event.preventDefault();
    const payload = {
      ...taskForm,
      project_id: Number(taskForm.project_id),
      assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : undefined,
      progress: Number(taskForm.progress)
    };

    try {
      if (editingTask) {
        await apiClient.put(`/tasks/${editingTask.id}`, payload);
      } else {
        await apiClient.post('/tasks', payload);
      }
      setTaskForm(defaultTaskForm);
      setEditingTask(null);
      loadTasks();
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
      due_date: toDateInput(task.due_date)
    });
    document.querySelector('.page-control-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTaskDelete = async (taskId) => {
    if (!window.confirm('Hapus tugas ini?')) return;
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      loadTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDevTaskUpdate = async (event, taskId) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await apiClient.put(`/tasks/${taskId}`, {
        status: formData.get('status'),
        progress: Number(formData.get('progress'))
      });
      loadTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const pageDescription = {
    pm: 'Kelola dan pantau tugas dari proyek yang Anda pimpin.',
    dev: 'Perbarui status dan progres tugas yang ditugaskan ke akun Anda.',
    client: 'Pantau status tugas proyek Anda secara read-only.'
  }[user.role] || 'Pantau tugas, penanggung jawab, status, dan tenggat.';

  const actionColumn = user.role === 'pm' || user.role === 'dev';

  return (
    <div className="page tasks-page">
      <header className="page-header">
        <div>
          <h1>Tugas</h1>
          <p>{pageDescription}</p>
        </div>
      </header>
      {user.role === 'pm' && (
        <section className="page-control-card">
          <h2>{editingTask ? 'Edit Tugas' : 'Tambah Tugas'}</h2>
          <form className="page-form-grid" onSubmit={handleTaskSave}>
            <label>
              Proyek
              <select value={taskForm.project_id} onChange={(event) => setTaskForm((prev) => ({ ...prev, project_id: event.target.value }))} required>
                <option value="">Pilih proyek</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
            <label>
              Nama Tugas
              <input value={taskForm.name} onChange={(event) => setTaskForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </label>
            <label>
              Deskripsi
              <input value={taskForm.description} onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))} />
            </label>
            <label>
              Penanggung Jawab
              <select value={taskForm.assigned_to} onChange={(event) => setTaskForm((prev) => ({ ...prev, assigned_to: event.target.value }))}>
                <option value="">Belum ditugaskan</option>
                {users.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.username} ({entry.role})</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={taskForm.status} onChange={(event) => setTaskForm((prev) => ({ ...prev, status: event.target.value }))}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Progres
              <input type="number" min="0" max="100" value={taskForm.progress} onChange={(event) => setTaskForm((prev) => ({ ...prev, progress: event.target.value }))} />
            </label>
            <label>
              Tenggat
              <input type="date" value={taskForm.due_date} onChange={(event) => setTaskForm((prev) => ({ ...prev, due_date: event.target.value }))} />
            </label>
            <div className="page-form-actions">
              <button type="submit">{editingTask ? 'Simpan Perubahan' : 'Buat Tugas'}</button>
              {editingTask && (
                <button type="button" className="secondary-button" onClick={() => { setEditingTask(null); setTaskForm(defaultTaskForm); }}>
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>
      )}
      <section className="list-section">
        {loading ? <p>Memuat tugas...</p> : (
          <div className="table-panel">
            <table className="full-width-table">
              <thead>
                <tr>
                  <th>Tugas</th>
                  <th>Proyek</th>
                  <th>Penanggung Jawab</th>
                  <th>Status</th>
                  <th>Progres</th>
                  <th>Tenggat</th>
                  {actionColumn && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {tasks.length ? tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong className="table-primary-text">{task.name}</strong>
                    </td>
                    <td>{task.project_name || '-'}</td>
                    <td>{task.assigned_username || 'Belum ditugaskan'}</td>
                    <td>
                      <span className={`status-pill status-${task.status || 'todo'}`}>
                        {statusLabels[task.status] || task.status || 'Belum Dikerjakan'}
                      </span>
                    </td>
                    <td>{Number(task.progress || 0)}%</td>
                    <td>{formatDate(task.due_date)}</td>
                    {user.role === 'pm' && (
                      <td>
                        <div className="page-table-actions">
                          <button type="button" onClick={() => handleTaskEdit(task)}>Edit</button>
                          <button type="button" className="danger-button" onClick={() => handleTaskDelete(task.id)}>Hapus</button>
                        </div>
                      </td>
                    )}
                    {user.role === 'dev' && (
                      <td>
                        <form className="task-inline-form" onSubmit={(event) => handleDevTaskUpdate(event, task.id)}>
                          <select name="status" defaultValue={task.status || 'todo'}>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          <input name="progress" type="number" min="0" max="100" defaultValue={task.progress || 0} />
                          <button type="submit">Simpan</button>
                        </form>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={actionColumn ? 7 : 6}>Belum ada tugas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
