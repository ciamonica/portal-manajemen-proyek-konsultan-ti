import { useEffect, useState } from 'react';
import { apiClient } from '../api/api.js';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    loadTasks();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>Kelola dan tinjau tugas anda dengan filter dan status.</p>
        </div>
      </header>
      <section className="list-section">
        {loading ? <p>Memuat tugas...</p> : (
          <table className="full-width-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.name}</td>
                  <td>{task.project_name || 'N/A'}</td>
                  <td>{task.assigned_username || 'Unassigned'}</td>
                  <td>{task.status}</td>
                  <td>{task.due_date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
