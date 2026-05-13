/**
 * ========================================================
 * KATEGORI      : Validator (Validasi Data Input)
 * DESKRIPSI     : File ini berisi definisi skema validasi menggunakan library Zod.
 * FUNGSI UTAMA  : Memastikan data yang dikirimkan oleh Client sesuai dengan format dan aturan yang diharapkan sebelum diproses ke database.
 * ========================================================
 */

// Mengimpor module Zod untuk validasi skema berbasis objek
const { z } = require('zod');

/**
 * SKEMA: Login
 * Digunakan untuk memvalidasi payload saat user melakukan login.
 */
const loginSchema = z.object({
  username: z.string().min(3), // Username minimal 3 karakter
  password: z.string().min(8)  // Password minimal 8 karakter
});

/**
 * SKEMA: Kebijakan Password (Password Policy)
 * Digunakan secara reusable untuk memastikan password memenuhi standar keamanan minimum.
 */
const passwordPolicySchema = z.string()
  .min(8, 'Password minimal 8 karakter') // Minimal panjang karakter
  .regex(/[a-z]/, 'Password harus memiliki huruf kecil') // Harus ada huruf kecil
  .regex(/[A-Z]/, 'Password harus memiliki huruf besar') // Harus ada huruf besar
  .regex(/[0-9]/, 'Password harus memiliki angka'); // Harus ada angka

/**
 * SKEMA: Pembuatan User (Create User)
 * Digunakan saat admin atau sistem menambahkan pengguna baru.
 */
const userCreateSchema = z.object({
  username: z.string().min(3), // Username minimal 3 karakter
  password: passwordPolicySchema, // Menggunakan skema kebijakan password di atas
  email: z.string().email(), // Harus berformat email yang valid
  role: z.enum(['pm', 'dev', 'client']) // Hanya menerima 3 jenis peran (Project Manager, Developer, Client)
});

/**
 * SKEMA: Pembuatan Proyek (Create Project)
 * Validasi saat menambahkan proyek baru.
 */
const projectCreateSchema = z.object({
  name: z.string().min(3), // Nama proyek minimal 3 karakter
  description: z.string().optional(), // Deskripsi bersifat opsional
  start_date: z.string().optional(), // Tanggal mulai proyek
  end_date: z.string().optional(), // Tanggal selesai proyek
  status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'on_track', 'at_risk', 'delayed']).optional(), // Status proyek (opsional, ada default di DB)
  client_id: z.number().int().optional(), // ID Client (foreign key)
  pm_id: z.number().int().optional(), // ID Project Manager pengelola proyek
  cover_image_url: z.string().url().optional().or(z.literal('')) // URL gambar cover opsional atau string kosong
});

/**
 * SKEMA: Pembuatan Tugas (Create Task)
 * Validasi data saat menambahkan task pada proyek tertentu.
 */
const taskCreateSchema = z.object({
  project_id: z.number().int(), // Harus terhubung ke sebuah proyek
  name: z.string().min(3), // Nama tugas minimal 3 karakter
  description: z.string().optional(), // Deskripsi opsional
  assigned_to: z.number().int().optional(), // ID user yang ditugaskan (opsional)
  status: z.enum(['todo', 'in_progress', 'done']).optional(), // Status default todo
  progress: z.number().min(0).max(100).optional(), // Progress dari 0 hingga 100
  due_date: z.string().optional() // Tanggal jatuh tempo
});

/**
 * SKEMA: Pembuatan Milestone
 * Milestone adalah penanda pencapaian penting dalam proyek.
 */
const milestoneCreateSchema = z.object({
  project_id: z.number().int(), // Relasi proyek
  name: z.string().min(3), // Nama milestone
  description: z.string().optional(), // Deskripsi
  due_date: z.string().optional(), // Tenggat waktu
  status: z.enum(['pending', 'achieved']).optional() // Status pencapaian
});

/**
 * SKEMA: Pembuatan Tim
 * Untuk memvalidasi data pembentukan tim baru.
 */
const teamCreateSchema = z.object({
  name: z.string().min(3), // Nama tim
  member_ids: z.array(z.number().int()).optional() // Daftar ID anggota (array integer)
});

/**
 * SKEMA: Tautan Proyek (Project Link)
 * Untuk menautkan referensi eksternal (repo, docs, figma) ke proyek.
 */
const projectLinkSchema = z.object({
  project_id: z.number().int().optional().nullable(), // ID proyek, bisa nullable
  title: z.string().min(2), // Judul tautan
  url: z.string().url(), // Harus berformat URL
  type: z.enum(['api_docs', 'brd', 'repository', 'staging', 'other']).default('other'), // Tipe tautan eksternal
  sort_order: z.number().int().min(0).optional() // Urutan tampilan
});

/**
 * SKEMA: Risiko (Risk)
 * Untuk mencatat potensi risiko yang mungkin terjadi di proyek.
 */
const riskSchema = z.object({
  project_id: z.number().int(), // Relasi ke proyek
  title: z.string().min(3), // Judul risiko
  description: z.string().optional(), // Detail
  probability: z.enum(['low', 'medium', 'high']).default('medium'), // Peluang terjadi
  impact: z.enum(['low', 'medium', 'high']).default('medium'), // Dampak ke proyek
  mitigation: z.string().optional(), // Cara penanganan/mitigasi
  status: z.enum(['open', 'mitigating', 'resolved']).default('open'), // Status penanganan risiko
  owner_id: z.number().int().optional().nullable(), // PIC yang menangani risiko ini
  due_date: z.string().optional().nullable() // Tanggal penyelesaian target mitigasi
});

/**
 * SKEMA: Time Log (Pencatatan Waktu)
 * Untuk melacak waktu yang dihabiskan untuk suatu task.
 */
const timeLogSchema = z.object({
  user_id: z.number().int().optional(), // ID user pelapor (opsional, karena bisa otomatis ambil dari token middleware)
  task_id: z.number().int(), // ID tugas yang dikerjakan
  hours: z.number().positive().max(24), // Jumlah jam (maksimal 24)
  log_date: z.string().optional() // Tanggal pekerjaan
});

/**
 * SKEMA: Dependensi Tugas
 * Tugas B hanya bisa jalan jika Tugas A selesai.
 */
const taskDependencySchema = z.object({
  task_id: z.number().int(), // ID tugas (misal B)
  depends_on_task_id: z.number().int() // ID tugas prasyarat (misal A)
}).refine((value) => value.task_id !== value.depends_on_task_id, {
  message: 'Task cannot depend on itself' // Custom error jika tugas bergantung pada dirinya sendiri
});

/**
 * SKEMA: File Proyek
 * Validasi saat mengunggah atau meregistrasikan file dokumen proyek.
 */
const projectFileSchema = z.object({
  project_id: z.number().int(), // Relasi proyek
  title: z.string().min(2), // Nama file / judul dokumen
  file_url: z.string().url(), // Lokasi / URL file
  file_type: z.string().min(2).max(50).optional() // Tipe file (PDF, DOCX, dll)
});

/**
 * SKEMA: Komentar Tugas (Task Comment)
 * Validasi saat ada diskusi atau komentar di dalam sebuah tugas.
 */
const taskCommentSchema = z.object({
  task_id: z.number().int(), // ID tugas tempat komentar berada
  comment: z.string().min(2) // Isi komentar minimal 2 karakter
});

/**
 * FUNGSI PARSING & VALIDASI
 * Fungsi helper untuk mengeksekusi skema Zod terhadap data input dari user.
 * Mengembalikan objek sukses yang berisi "data", atau "error" jika validasi gagal.
 */
function parseSchema(schema, body) {
  try {
    // Mencoba melakukan validasi dan mengembalikan hasil sanitasi
    return { data: schema.parse(body) };
  } catch (error) {
    // Jika gagal (seperti kurang panjang karakter, bukan URL, dll) lempar error object Zod
    return { error };
  }
}

// Mengekspor semua skema dan fungsi helper agar dapat dipakai oleh routes
module.exports = {
  loginSchema,
  userCreateSchema,
  projectCreateSchema,
  taskCreateSchema,
  milestoneCreateSchema,
  teamCreateSchema,
  projectLinkSchema,
  riskSchema,
  timeLogSchema,
  taskDependencySchema,
  projectFileSchema,
  taskCommentSchema,
  parseSchema
};
