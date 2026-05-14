/**
 * ========================================================
 * KATEGORI      : Utilitas (Kontrol Akses Tingkat Baris)
 * DESKRIPSI     : File ini berisi fungsi-fungsi pemeriksaan hak akses berbasis baris data (Row-Level Access Control).
 * FUNGSI UTAMA  : Memastikan bahwa pengguna hanya dapat mengakses, mengubah, atau menghapus data yang sesuai dengan perannya (role) dan kepemilikannya.
 * ========================================================
 */

// Mengimpor pool koneksi database untuk menjalankan query
const pool = require('../db');

/**
 * FUNGSI: projectManagedByPm
 * Memeriksa apakah suatu proyek (projectId) dikelola oleh Project Manager tertentu (pmId).
 * Mengembalikan true jika proyek tersebut memang milik PM yang bersangkutan.
 *
 * @param {number} projectId - ID proyek yang akan diperiksa
 * @param {number} pmId - ID Project Manager yang sedang login
 * @returns {Promise<boolean>} - true jika proyek dikelola oleh PM tersebut
 */
async function projectManagedByPm(projectId, pmId) {
  // Menjalankan query untuk mencari proyek dengan ID dan pm_id yang cocok
  const [rows] = await pool.query(
    'SELECT id FROM projects WHERE id = ? AND pm_id = ?',
    [projectId, pmId]
  );
  // Jika ditemukan minimal 1 baris, berarti PM ini mengelola proyek tersebut
  return rows.length > 0;
}

/**
 * FUNGSI: taskAccessibleToUser
 * Memeriksa apakah suatu tugas (taskId) dapat diakses oleh pengguna tertentu berdasarkan perannya.
 * - PM: bisa akses jika proyek tugas tersebut dikelola olehnya
 * - Client: bisa akses jika proyek tugas tersebut milik client tersebut
 * - Dev: bisa akses jika tugas tersebut ditugaskan kepadanya
 *
 * @param {number} taskId - ID tugas yang akan diperiksa
 * @param {object} user - Objek pengguna yang berisi id dan role
 * @returns {Promise<boolean>} - true jika pengguna memiliki akses ke tugas tersebut
 */
async function taskAccessibleToUser(taskId, user) {
  const params = [taskId]; // Parameter pertama selalu taskId
  let accessClause = ''; // Klausa SQL dinamis berdasarkan role

  // Menentukan klausa akses berdasarkan peran pengguna
  if (user.role === 'pm') {
    // Project Manager: cek apakah proyek dari tugas ini dikelola olehnya
    accessClause = 'p.pm_id = ?';
    params.push(user.id);
  } else if (user.role === 'client') {
    // Client: cek apakah proyek dari tugas ini milik client tersebut
    accessClause = 'p.client_id = ?';
    params.push(user.id);
  } else {
    // Developer: cek apakah tugas ini ditugaskan kepadanya
    accessClause = 't.assigned_to = ?';
    params.push(user.id);
  }

  // Menjalankan query JOIN antara tasks dan projects untuk validasi akses
  const [rows] = await pool.query(
    `
      SELECT t.id
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ? AND ${accessClause}
    `,
    params
  );
  // Mengembalikan true jika tugas ditemukan dan user memiliki akses
  return rows.length > 0;
}

/**
 * FUNGSI: tasksShareManagedProject
 * Memeriksa apakah dua tugas (taskId dan dependsOnTaskId) berada dalam proyek yang sama
 * DAN proyek tersebut dikelola oleh PM tertentu.
 * Digunakan untuk validasi pembuatan dependensi antar tugas.
 *
 * @param {number} taskId - ID tugas utama
 * @param {number} dependsOnTaskId - ID tugas prasyarat (dependensi)
 * @param {number} pmId - ID Project Manager yang sedang login
 * @returns {Promise<boolean>} - true jika kedua tugas berada di proyek yang sama dan dikelola PM tersebut
 */
async function tasksShareManagedProject(taskId, dependsOnTaskId, pmId) {
  // Query JOIN untuk memastikan kedua tugas ada di proyek yang sama dan PM-nya cocok
  const [rows] = await pool.query(
    `
      SELECT t.project_id
      FROM tasks t
      JOIN tasks dt ON dt.id = ?
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
        AND t.project_id = dt.project_id
        AND p.pm_id = ?
    `,
    [dependsOnTaskId, taskId, pmId]
  );
  // Mengembalikan true jika ditemukan kecocokan
  return rows.length > 0;
}

/**
 * FUNGSI: dependencyManagedByPm
 * Memeriksa apakah suatu relasi dependensi (dependencyId) berada dalam proyek yang dikelola oleh PM tertentu.
 *
 * @param {number} dependencyId - ID record dependensi tugas
 * @param {number} pmId - ID Project Manager yang sedang login
 * @returns {Promise<boolean>} - true jika dependensi tersebut berada di proyek milik PM
 */
async function dependencyManagedByPm(dependencyId, pmId) {
  // Query JOIN dari task_dependencies -> tasks -> projects untuk validasi kepemilikan PM
  const [rows] = await pool.query(
    `
      SELECT td.id
      FROM task_dependencies td
      JOIN tasks t ON td.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE td.id = ? AND p.pm_id = ?
    `,
    [dependencyId, pmId]
  );
  // Mengembalikan true jika ditemukan
  return rows.length > 0;
}

/**
 * FUNGSI: projectRecordManagedByPm
 * Fungsi generik untuk memeriksa apakah suatu record (milestone, risk, atau project_file)
 * berada dalam proyek yang dikelola oleh PM tertentu.
 * Mendukung tabel: milestones, risks, project_files.
 *
 * @param {string} tableName - Nama tabel database (harus salah satu dari: milestones, risks, project_files)
 * @param {string} alias - Alias tabel untuk query SQL (misal: 'm', 'r', 'pf')
 * @param {number} recordId - ID record yang akan diperiksa
 * @param {number} pmId - ID Project Manager yang sedang login
 * @returns {Promise<boolean>} - true jika record tersebut berada di proyek milik PM
 * @throws {Error} - Jika tableName tidak termasuk dalam daftar yang diizinkan (whitelist)
 */
async function projectRecordManagedByPm(tableName, alias, recordId, pmId) {
  // Whitelist tabel yang diizinkan untuk mencegah SQL Injection
  const allowedTables = new Set(['milestones', 'risks', 'project_files']);
  if (!allowedTables.has(tableName)) {
    // Lempar error jika tabel tidak dikenali (keamanan)
    throw new Error(`Unsupported project record table: ${tableName}`);
  }

  // Query JOIN dari tabel target ke projects untuk validasi kepemilikan PM
  const [rows] = await pool.query(
    `
      SELECT ${alias}.id
      FROM ${tableName} ${alias}
      JOIN projects p ON ${alias}.project_id = p.id
      WHERE ${alias}.id = ? AND p.pm_id = ?
    `,
    [recordId, pmId]
  );
  // Mengembalikan true jika record ditemukan dan PM cocok
  return rows.length > 0;
}

/**
 * FUNGSI: projectLinkManagedByPm
 * Memeriksa apakah suatu tautan proyek (linkId) dapat dikelola oleh PM tertentu.
 * Tautan tanpa project_id (global) dianggap bisa dikelola oleh siapa saja yang berhak.
 *
 * @param {number} linkId - ID tautan proyek
 * @param {number} pmId - ID Project Manager yang sedang login
 * @returns {Promise<boolean>} - true jika tautan bisa dikelola oleh PM tersebut
 */
async function projectLinkManagedByPm(linkId, pmId) {
  // Query dengan LEFT JOIN karena project_id bisa NULL (tautan global)
  const [rows] = await pool.query(
    `
      SELECT pl.id
      FROM project_links pl
      LEFT JOIN projects p ON pl.project_id = p.id
      WHERE pl.id = ? AND (pl.project_id IS NULL OR p.pm_id = ?)
    `,
    [linkId, pmId]
  );
  // Mengembalikan true jika tautan ditemukan (baik global maupun milik PM)
  return rows.length > 0;
}

/**
 * FUNGSI: timeLogEditableByUser
 * Memeriksa apakah suatu catatan waktu (timeLogId) dapat diedit oleh pengguna tertentu.
 * - PM: bisa edit jika time log berada di proyek yang dikelolanya
 * - Dev: hanya bisa edit time log miliknya sendiri
 *
 * @param {number} timeLogId - ID catatan waktu
 * @param {object} user - Objek pengguna yang berisi id dan role
 * @returns {Promise<boolean>} - true jika pengguna berhak mengedit time log tersebut
 */
async function timeLogEditableByUser(timeLogId, user) {
  const params = [timeLogId]; // Parameter pertama: ID time log
  let accessClause = ''; // Klausa akses dinamis

  if (user.role === 'pm') {
    // PM bisa edit time log dari proyek yang dikelolanya
    accessClause = 'p.pm_id = ?';
    params.push(user.id);
  } else {
    // Dev/user lain hanya bisa edit time log miliknya sendiri
    accessClause = 'tl.user_id = ?';
    params.push(user.id);
  }

  // Query JOIN dari time_logs -> tasks -> projects untuk validasi
  const [rows] = await pool.query(
    `
      SELECT tl.id
      FROM time_logs tl
      JOIN tasks t ON tl.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE tl.id = ? AND ${accessClause}
    `,
    params
  );
  // Mengembalikan true jika time log ditemukan dan user memiliki akses
  return rows.length > 0;
}

/**
 * FUNGSI: taskCommentEditableByUser
 * Memeriksa apakah suatu komentar tugas (commentId) dapat diedit oleh pengguna tertentu.
 * - PM: bisa edit semua komentar di proyek yang dikelolanya
 * - Client: hanya bisa edit komentar miliknya sendiri di proyek miliknya
 * - Dev: hanya bisa edit komentar miliknya sendiri di tugas yang ditugaskan kepadanya
 *
 * @param {number} commentId - ID komentar tugas
 * @param {object} user - Objek pengguna yang berisi id dan role
 * @returns {Promise<boolean>} - true jika pengguna berhak mengedit komentar tersebut
 */
async function taskCommentEditableByUser(commentId, user) {
  const params = [commentId]; // Parameter pertama: ID komentar
  let accessClause = ''; // Klausa akses dinamis

  if (user.role === 'pm') {
    // PM bisa edit komentar apa saja di proyek yang dikelolanya
    accessClause = 'p.pm_id = ?';
    params.push(user.id);
  } else if (user.role === 'client') {
    // Client hanya bisa edit komentar miliknya sendiri di proyek miliknya
    accessClause = 'tc.user_id = ? AND p.client_id = ?';
    params.push(user.id, user.id);
  } else {
    // Dev hanya bisa edit komentar miliknya sendiri di tugas yang ditugaskan kepadanya
    accessClause = 'tc.user_id = ? AND t.assigned_to = ?';
    params.push(user.id, user.id);
  }

  // Query JOIN dari task_comments -> tasks -> projects untuk validasi
  const [rows] = await pool.query(
    `
      SELECT tc.id
      FROM task_comments tc
      JOIN tasks t ON tc.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE tc.id = ? AND ${accessClause}
    `,
    params
  );
  // Mengembalikan true jika komentar ditemukan dan user memiliki akses
  return rows.length > 0;
}

// Mengekspor semua fungsi kontrol akses agar dapat digunakan oleh file route
module.exports = {
  projectManagedByPm,
  taskAccessibleToUser,
  tasksShareManagedProject,
  dependencyManagedByPm,
  projectRecordManagedByPm,
  projectLinkManagedByPm,
  timeLogEditableByUser,
  taskCommentEditableByUser
};
