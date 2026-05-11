import { useEffect, useState } from 'react';
import { apiClient } from '../api/api.js';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    loadProjects();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Projects</h1>
          <p>Daftar proyek yang dapat Anda akses.</p>
        </div>
      </header>
      <section className="list-section">
        {loading ? <p>Memuat proyek...</p> : projects.length === 0 ? <p>Tidak ada proyek.</p> : (
          <div className="card-grid">
            {projects.map((project) => (
              <article key={project.id} className="project-card">
                <h3>{project.name}</h3>
                <p>{project.description || 'Tidak ada deskripsi.'}</p>
                <small>Status: {project.status}</small>
                <small>PM: {project.pm_username || 'N/A'}</small>
                <small>Client: {project.client_username || 'N/A'}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
