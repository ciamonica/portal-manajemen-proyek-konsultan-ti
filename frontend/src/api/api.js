/**
 * ========================================================
 * KATEGORI      : API Client (Frontend)
 * DESKRIPSI     : Utilitas untuk melakukan panggilan HTTP ke backend API.
 * FUNGSI UTAMA  : Menangani request, menyisipkan token otorisasi secara otomatis, dan memparsing respons JSON.
 * ========================================================
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function clearStoredSession() {
  sessionStorage.removeItem('project_portal_token');
  sessionStorage.removeItem('project_portal_user');
  localStorage.removeItem('project_portal_token');
  localStorage.removeItem('project_portal_user');
  window.dispatchEvent(new Event('project-portal-auth-expired'));
}

/**
 * FUNGSI BANTUAN: request
 * Pembungkus fetch API dasar yang menyuntikkan token dari sessionStorage.
 */
async function request(path, options = {}) {
  // Ambil token dari session storage agar login hanya bertahan selama tab aktif.
  const token = sessionStorage.getItem('project_portal_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Sisipkan header Authorization jika token tersedia
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Lakukan request dengan fetch
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  // Konversi respons ke format JSON
  const data = await response.json();
  // Tangani error HTTP status code
  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
    }
    throw new Error(data.error || 'API request failed');
  }
  return data;
}

// Objek Client API dengan metode shorthand
export const apiClient = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' })
};
