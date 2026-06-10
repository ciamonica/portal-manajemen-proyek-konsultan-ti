/**
 * ========================================================
 * KATEGORI      : Konfigurasi Server Utama (Backend)
 * DESKRIPSI     : File ini berfungsi sebagai titik masuk (entry point) utama untuk konfigurasi aplikasi Express.js.
 * FUNGSI UTAMA  : Menginisialisasi middleware (CORS, Helmet, Body Parser), mendefinisikan routing utama API, dan menangani error secara global.
 * ========================================================
 */

// Mengimpor library express untuk membuat framework server
const express = require('express');
// Mengimpor cors untuk mengizinkan permintaan lintas origin (Cross-Origin Resource Sharing)
const cors = require('cors');
// Mengimpor helmet untuk mengamankan aplikasi Express dengan mengatur berbagai header HTTP
const helmet = require('helmet');
// Mengimpor body-parser untuk mem-parsing request body yang masuk sebelum ke handler
const bodyParser = require('body-parser');

/* --------------------------------------------------------
 * IMPOR ROUTER API
 * Mengimpor semua modul router yang berisi rute-rute spesifik untuk setiap fitur.
 * -------------------------------------------------------- */
const authRouter = require('./routes/auth'); // Router untuk autentikasi (login/register)
const usersRouter = require('./routes/users'); // Router untuk manajemen pengguna
const projectsRouter = require('./routes/projects'); // Router untuk manajemen proyek
const tasksRouter = require('./routes/tasks'); // Router untuk manajemen tugas (tasks)
const milestonesRouter = require('./routes/milestones'); // Router untuk milestone proyek
const teamsRouter = require('./routes/teams'); // Router untuk manajemen tim proyek
const projectLinksRouter = require('./routes/projectLinks'); // Router untuk tautan proyek
const risksRouter = require('./routes/risks'); // Router untuk manajemen risiko
const timeLogsRouter = require('./routes/timeLogs'); // Router untuk pencatatan waktu kerja (time logs)
const taskDependenciesRouter = require('./routes/taskDependencies'); // Router untuk dependensi antar tugas
const projectFilesRouter = require('./routes/projectFiles'); // Router untuk file/dokumen proyek
const taskCommentsRouter = require('./routes/taskComments'); // Router untuk komentar tugas

// Mengimpor middleware untuk memverifikasi token JWT dari request
const { authenticateToken } = require('./middleware/auth');
// Mengimpor middleware penanganan error global
const errorHandler = require('./middleware/errorHandler');

// Membuat instance aplikasi Express
const app = express();

/**
 * MENGATUR CORS ORIGIN
 * Memeriksa variabel lingkungan CORS_ORIGIN, jika ada maka akan di-split menjadi array, jika tidak maka true (semua diizinkan)
 */
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) // Memisahkan string origin dengan koma dan menghilangkan spasi
  : true; // Mengizinkan semua origin sebagai default

// Mendaftarkan middleware helmet untuk keamanan HTTP
app.use(helmet());
// Mendaftarkan middleware cors dengan opsi origin dan credentials (cookies/header otorisasi)
app.use(cors({ origin: corsOrigin, credentials: true }));
// Mendaftarkan body-parser untuk mem-parsing data JSON dari body request
app.use(bodyParser.json());
// Mendaftarkan body-parser untuk mem-parsing data URL-encoded
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * MIDDLEWARE LOGGING WAKTU RESPONS
 * Berfungsi untuk mencatat ke konsol setiap permintaan yang masuk beserta waktu pemrosesannya.
 */
app.use((req, res, next) => {
  const startedAt = Date.now(); // Mencatat waktu awal permintaan
  // Menambahkan listener 'finish' yang dipanggil setelah respons selesai dikirim
  res.on('finish', () => {
    // Mencetak metode HTTP, URL, status kode, dan durasi proses
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next(); // Melanjutkan ke middleware atau rute berikutnya
});

// Endpoint dasar (root) untuk mengecek apakah backend berjalan
app.get('/', (req, res) => res.json({ success: true, message: 'Backend running. Frontend available at http://localhost:5173' }));
// Endpoint health-check untuk memastikan API beroperasi dengan baik
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is up' }));

/* --------------------------------------------------------
 * PENDAFTARAN RUTE API
 * Mendaftarkan setiap rute ke path spesifik. Sebagian besar rute dilindungi oleh authenticateToken.
 * -------------------------------------------------------- */
app.use('/api/auth', authRouter); // Rute autentikasi tidak memerlukan token
app.use('/api/users', authenticateToken, usersRouter); // Rute pengguna memerlukan token
app.use('/api/projects', authenticateToken, projectsRouter); // Rute proyek memerlukan token
app.use('/api/tasks', authenticateToken, tasksRouter); // Rute tugas memerlukan token
app.use('/api/milestones', authenticateToken, milestonesRouter); // Rute milestone memerlukan token
app.use('/api/teams', authenticateToken, teamsRouter); // Rute tim memerlukan token
app.use('/api/project-links', authenticateToken, projectLinksRouter); // Rute tautan memerlukan token
app.use('/api/risks', authenticateToken, risksRouter); // Rute risiko memerlukan token
app.use('/api/time-logs', authenticateToken, timeLogsRouter); // Rute time logs memerlukan token
app.use('/api/task-dependencies', authenticateToken, taskDependenciesRouter); // Rute dependensi tugas memerlukan token
app.use('/api/project-files', authenticateToken, projectFilesRouter); // Rute file proyek memerlukan token
app.use('/api/task-comments', authenticateToken, taskCommentsRouter); // Rute komentar tugas memerlukan token

// Mendaftarkan middleware penanganan error sebagai langkah terakhir
app.use(errorHandler);

// Mengekspor instance app agar dapat digunakan di file lain (misal: server.js)
module.exports = app;
