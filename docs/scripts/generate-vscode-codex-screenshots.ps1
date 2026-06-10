Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir '..\..')
$outputDir = Join-Path $projectRoot 'docs\screenshots'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$width = 1600
$height = 1000

function ColorFromHex($hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function New-Brush($hex) {
  return New-Object System.Drawing.SolidBrush (ColorFromHex $hex)
}

function New-Pen($hex, $size = 1) {
  return New-Object System.Drawing.Pen (ColorFromHex $hex), $size
}

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-RoundedRect($g, $brush, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-RoundedPath $x $y $w $h $r
  $g.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-WrappedText($g, $text, $font, $brush, [float]$x, [float]$y, [float]$maxWidth, [float]$maxHeight, [float]$lineHeight = 0) {
  if ($lineHeight -eq 0) {
    $lineHeight = [Math]::Ceiling($font.GetHeight($g) + 5)
  }

  $currentY = $y
  $paragraphs = [string]$text -split "`n"

  foreach ($paragraph in $paragraphs) {
    if ($currentY + $lineHeight -gt $y + $maxHeight) {
      return $currentY
    }

    if ([string]::IsNullOrWhiteSpace($paragraph)) {
      $currentY += $lineHeight
      continue
    }

    $words = $paragraph -split ' '
    $line = ''
    foreach ($word in $words) {
      $testLine = if ($line.Length -gt 0) { "$line $word" } else { $word }
      $size = $g.MeasureString($testLine, $font)
      if ($size.Width -gt $maxWidth -and $line.Length -gt 0) {
        if ($currentY + $lineHeight -gt $y + $maxHeight) {
          return $currentY
        }
        $g.DrawString($line, $font, $brush, $x, $currentY)
        $currentY += $lineHeight
        $line = $word
      } else {
        $line = $testLine
      }
    }

    if ($line.Length -gt 0) {
      if ($currentY + $lineHeight -gt $y + $maxHeight) {
        return $currentY
      }
      $g.DrawString($line, $font, $brush, $x, $currentY)
      $currentY += $lineHeight
    }
  }

  return $currentY
}

function Draw-IconDots($g, [float]$x, [float]$y) {
  $red = New-Brush '#ff5f57'
  $yellow = New-Brush '#febc2e'
  $green = New-Brush '#28c840'
  $g.FillEllipse($red, $x, $y, 13, 13)
  $g.FillEllipse($yellow, $x + 24, $y, 13, 13)
  $g.FillEllipse($green, $x + 48, $y, 13, 13)
  $red.Dispose(); $yellow.Dispose(); $green.Dispose()
}

function Draw-WindowChrome($g, $title) {
  $bg = New-Brush '#0d1117'
  $titleBrush = New-Brush '#1f2428'
  $menuBrush = New-Brush '#c9d1d9'
  $mutedBrush = New-Brush '#8b949e'
  $accentBrush = New-Brush '#007acc'
  $borderPen = New-Pen '#30363d'
  $font = New-Object System.Drawing.Font 'Segoe UI', 12
  $titleFont = New-Object System.Drawing.Font 'Segoe UI Semibold', 12

  $g.FillRectangle($bg, 0, 0, $script:width, $script:height)
  $g.FillRectangle($titleBrush, 0, 0, $script:width, 42)
  Draw-IconDots $g 18 15
  $g.DrawString('File   Edit   Selection   View   Go   Run   Terminal   Help', $font, $mutedBrush, 100, 12)
  $g.DrawString($title, $titleFont, $menuBrush, 585, 12)
  $g.DrawLine($borderPen, 0, 42, $script:width, 42)

  $g.FillRectangle($accentBrush, 0, $script:height - 28, $script:width, 28)
  $statusFont = New-Object System.Drawing.Font 'Segoe UI', 10
  $white = New-Brush '#ffffff'
  $g.DrawString('main  |  React + Vite  |  Node.js Express  |  MySQL  |  UTF-8', $statusFont, $white, 16, $script:height - 23)

  $font.Dispose(); $titleFont.Dispose(); $statusFont.Dispose()
  $bg.Dispose(); $titleBrush.Dispose(); $menuBrush.Dispose(); $mutedBrush.Dispose(); $accentBrush.Dispose(); $borderPen.Dispose(); $white.Dispose()
}

function Draw-ActivityBar($g) {
  $barBrush = New-Brush '#181a1f'
  $iconBrush = New-Brush '#9aa4b2'
  $activeBrush = New-Brush '#ffffff'
  $activeLine = New-Brush '#2f8f83'
  $font = New-Object System.Drawing.Font 'Segoe UI Symbol', 20

  $g.FillRectangle($barBrush, 0, 42, 58, $script:height - 70)
  $g.FillRectangle($activeLine, 0, 72, 4, 38)
  $g.DrawString('[]', $font, $activeBrush, 13, 72)
  $g.DrawString('{}', $font, $iconBrush, 11, 132)
  $g.DrawString('G', $font, $iconBrush, 18, 192)
  $g.DrawString('>', $font, $iconBrush, 18, 252)
  $g.DrawString('C', $font, $iconBrush, 18, 312)

  $font.Dispose(); $barBrush.Dispose(); $iconBrush.Dispose(); $activeBrush.Dispose(); $activeLine.Dispose()
}

function Draw-Sidebar($g, $activeFile) {
  $sideBrush = New-Brush '#252526'
  $panelBrush = New-Brush '#2d2d30'
  $textBrush = New-Brush '#d4d4d4'
  $mutedBrush = New-Brush '#858585'
  $accentBrush = New-Brush '#3a3d41'
  $folderBrush = New-Brush '#c9d1d9'
  $fileBrush = New-Brush '#9cdcfe'
  $font = New-Object System.Drawing.Font 'Segoe UI', 11
  $smallFont = New-Object System.Drawing.Font 'Segoe UI Semibold', 9

  $x = 58
  $w = 292
  $g.FillRectangle($sideBrush, $x, 42, $w, $script:height - 70)
  $g.FillRectangle($panelBrush, $x, 42, $w, 42)
  $g.DrawString('EXPLORER', $smallFont, $mutedBrush, $x + 18, 57)
  $g.DrawString('REV.PORTAL MANAJEMEN...', $smallFont, $folderBrush, $x + 18, 96)

  $rows = @(
    @('v frontend', 120, 'folder'),
    @('  v src', 146, 'folder'),
    @('    v pages', 172, 'folder'),
    @('      Dashboard.jsx', 198, 'file'),
    @('      Login.jsx', 224, 'file'),
    @('    v api', 250, 'folder'),
    @('      api.js', 276, 'file'),
    @('v backend', 314, 'folder'),
    @('  v src', 340, 'folder'),
    @('    v routes', 366, 'folder'),
    @('      auth.js', 392, 'file'),
    @('      projects.js', 418, 'file'),
    @('      tasks.js', 444, 'file'),
    @('v docs', 482, 'folder'),
    @('  security-baseline.md', 508, 'file'),
    @('  project-proposal.md', 534, 'file'),
    @('  pdf', 560, 'folder'),
    @('database.sql', 604, 'file'),
    @('README.md', 630, 'file')
  )

  foreach ($row in $rows) {
    $label = $row[0]
    $y = [int]$row[1]
    $kind = $row[2]
    if ($label.Trim() -eq $activeFile) {
      $g.FillRectangle($accentBrush, $x, $y - 4, $w, 25)
    }
    $brush = if ($kind -eq 'file') { $fileBrush } else { $folderBrush }
    $g.DrawString($label, $font, $brush, $x + 18, $y)
  }

  $font.Dispose(); $smallFont.Dispose()
  $sideBrush.Dispose(); $panelBrush.Dispose(); $textBrush.Dispose(); $mutedBrush.Dispose(); $accentBrush.Dispose(); $folderBrush.Dispose(); $fileBrush.Dispose()
}

function Draw-Editor($g, $fileName, $codeLines) {
  $editorX = 350
  $editorY = 42
  $editorW = 770
  $editorH = $script:height - 70
  $editorBrush = New-Brush '#1e1e1e'
  $tabBrush = New-Brush '#2d2d30'
  $activeTabBrush = New-Brush '#1e1e1e'
  $lineNumBrush = New-Brush '#858585'
  $codeBrush = New-Brush '#d4d4d4'
  $commentBrush = New-Brush '#6a9955'
  $keywordBrush = New-Brush '#569cd6'
  $stringBrush = New-Brush '#ce9178'
  $accentBrush = New-Brush '#007acc'
  $borderPen = New-Pen '#30363d'
  $tabFont = New-Object System.Drawing.Font 'Segoe UI', 10
  $codeFont = New-Object System.Drawing.Font 'Consolas', 13
  $lineFont = New-Object System.Drawing.Font 'Consolas', 12

  $g.FillRectangle($editorBrush, $editorX, $editorY, $editorW, $editorH)
  $g.FillRectangle($tabBrush, $editorX, $editorY, $editorW, 38)
  $g.FillRectangle($activeTabBrush, $editorX, $editorY, 190, 38)
  $g.FillRectangle($accentBrush, $editorX, $editorY + 36, 190, 2)
  $g.DrawString($fileName, $tabFont, $codeBrush, $editorX + 18, $editorY + 10)
  $g.DrawLine($borderPen, $editorX, $editorY + 38, $editorX + $editorW, $editorY + 38)

  $g.DrawString("Project: Portal Manajemen Proyek TI", $tabFont, $commentBrush, $editorX + 22, $editorY + 56)

  $startY = $editorY + 91
  $lineH = 25
  for ($i = 0; $i -lt $codeLines.Count; $i++) {
    $lineNo = ($i + 1).ToString().PadLeft(2, ' ')
    $line = $codeLines[$i]
    $y = $startY + ($i * $lineH)
    if ($y -gt $editorY + $editorH - 52) { break }
    if ($i -eq 4 -or $i -eq 12) {
      $highlight = New-Brush '#2a2d2e'
      $g.FillRectangle($highlight, $editorX, $y - 3, $editorW, $lineH)
      $highlight.Dispose()
    }
    $g.DrawString($lineNo, $lineFont, $lineNumBrush, $editorX + 20, $y)

    $brush = $codeBrush
    if ($line.Trim().StartsWith('//') -or $line.Trim().StartsWith('*') -or $line.Trim().StartsWith('#')) {
      $brush = $commentBrush
    } elseif ($line -match 'const|function|import|export|router|app\.|CREATE|TABLE|JWT|RBAC') {
      $brush = $keywordBrush
    } elseif ($line -match "'|`"") {
      $brush = $stringBrush
    }
    $g.DrawString($line, $codeFont, $brush, $editorX + 64, $y)
  }

  $tabFont.Dispose(); $codeFont.Dispose(); $lineFont.Dispose()
  $editorBrush.Dispose(); $tabBrush.Dispose(); $activeTabBrush.Dispose(); $lineNumBrush.Dispose(); $codeBrush.Dispose(); $commentBrush.Dispose(); $keywordBrush.Dispose(); $stringBrush.Dispose(); $accentBrush.Dispose(); $borderPen.Dispose()
}

function Draw-ChatPanel($g, $slideTitle, $messages) {
  $x = 1120
  $y = 42
  $w = $script:width - $x
  $h = $script:height - 70
  $panelBrush = New-Brush '#101419'
  $headerBrush = New-Brush '#181d24'
  $titleBrush = New-Brush '#f0f6fc'
  $mutedBrush = New-Brush '#8b949e'
  $cardBrush = New-Brush '#151b23'
  $promptBrush = New-Brush '#111827'
  $codexBrush = New-Brush '#101f1d'
  $userAccent = New-Brush '#7aa2f7'
  $codexAccent = New-Brush '#2f8f83'
  $outlineBrush = New-Brush '#263241'
  $textBrush = New-Brush '#e6edf3'
  $borderPen = New-Pen '#30363d'
  $titleFont = New-Object System.Drawing.Font 'Segoe UI Semibold', 14
  $smallFont = New-Object System.Drawing.Font 'Segoe UI', 10
  $chatFont = New-Object System.Drawing.Font 'Segoe UI', 13
  $labelFont = New-Object System.Drawing.Font 'Segoe UI Semibold', 11

  $g.FillRectangle($panelBrush, $x, $y, $w, $h)
  $g.FillRectangle($headerBrush, $x, $y, $w, 96)
  $g.DrawLine($borderPen, $x, $y, $x, $y + $h)
  Fill-RoundedRect $g $codexAccent ($x + 22) ($y + 17) 26 26 7
  $g.DrawString('C', $labelFont, $titleBrush, $x + 30, $y + 22)
  $g.DrawString('Codex', $titleFont, $titleBrush, $x + 58, $y + 16)
  $g.DrawString('GPT-5 Codex in workspace', $smallFont, $mutedBrush, $x + 58, $y + 40)
  Fill-RoundedRect $g $cardBrush ($x + 22) ($y + 64) ($w - 44) 22 8
  $g.DrawString($slideTitle, $smallFont, $textBrush, $x + 34, $y + 68)

  $cursorY = $y + 118
  $messageIndex = 0
  foreach ($msg in $messages) {
    $isUser = $msg.Role -eq 'Saya'
    $bubbleBrush = if ($isUser) { $promptBrush } else { $codexBrush }
    $accentBrush = if ($isUser) { $userAccent } else { $codexAccent }
    $bubbleX = $x + 20
    $bubbleW = $w - 44
    $text = $msg.Text
    $measureFont = $chatFont
    $wrappedLines = @()
    foreach ($paragraph in ([string]$text -split "`n")) {
      $words = $paragraph -split ' '
      $line = ''
      foreach ($word in $words) {
        $testLine = if ($line.Length -gt 0) { "$line $word" } else { $word }
        if ($g.MeasureString($testLine, $measureFont).Width -gt ($bubbleW - 38) -and $line.Length -gt 0) {
          $wrappedLines += $line
          $line = $word
        } else {
          $line = $testLine
        }
      }
      if ($line.Length -gt 0) { $wrappedLines += $line }
    }

    $isCodexWorkBlock = -not $isUser -and ($messageIndex -eq 1)
    $statusHeight = if ($isCodexWorkBlock) { 56 } else { 0 }
    $bubbleH = 50 + ($wrappedLines.Count * 21) + $statusHeight
    Fill-RoundedRect $g $bubbleBrush $bubbleX $cursorY $bubbleW $bubbleH 10
    $outlinePen = New-Pen '#263241'
    $path = New-RoundedPath $bubbleX $cursorY $bubbleW $bubbleH 10
    $g.DrawPath($outlinePen, $path)
    $path.Dispose()
    $outlinePen.Dispose()

    $label = if ($isUser) { 'Prompt' } else { 'Codex response' }
    $roleText = if ($isUser) { 'Saya' } else { 'Codex' }
    Fill-RoundedRect $g $accentBrush ($bubbleX + 14) ($cursorY + 14) 8 8 4
    $g.DrawString($roleText, $labelFont, $titleBrush, $bubbleX + 30, $cursorY + 8)
    $g.DrawString($label, $smallFont, $mutedBrush, $bubbleX + 30, $cursorY + 29)

    $textY = $cursorY + 51
    foreach ($line in $wrappedLines) {
      $g.DrawString($line, $chatFont, $textBrush, $bubbleX + 17, $textY)
      $textY += 21
    }

    if ($isCodexWorkBlock) {
      $statusY = $textY + 8
      Fill-RoundedRect $g $cardBrush ($bubbleX + 16) $statusY ($bubbleW - 32) 42 9
      $g.DrawString('completed  Read project files', $smallFont, $mutedBrush, $bubbleX + 30, $statusY + 8)
      $g.DrawString('completed  Proposed stack and modules', $smallFont, $mutedBrush, $bubbleX + 30, $statusY + 24)
    }

    $cursorY += $bubbleH + 16
    $messageIndex += 1
  }

  $inputBrush = New-Brush '#161b22'
  Fill-RoundedRect $g $inputBrush ($x + 20) ($y + $h - 86) ($w - 40) 58 12
  $g.DrawString('Ask Codex to make edits or explain the code...', $smallFont, $mutedBrush, $x + 40, $y + $h - 66)
  Fill-RoundedRect $g $codexAccent ($x + $w - 70) ($y + $h - 72) 34 30 8
  $g.DrawString('Go', $smallFont, $titleBrush, $x + $w - 62, $y + $h - 65)

  $titleFont.Dispose(); $smallFont.Dispose(); $chatFont.Dispose(); $labelFont.Dispose()
  $panelBrush.Dispose(); $headerBrush.Dispose(); $titleBrush.Dispose(); $mutedBrush.Dispose(); $cardBrush.Dispose(); $promptBrush.Dispose(); $codexBrush.Dispose(); $userAccent.Dispose(); $codexAccent.Dispose(); $outlineBrush.Dispose(); $textBrush.Dispose(); $borderPen.Dispose(); $inputBrush.Dispose()
}

function New-Message($role, $text) {
  return [pscustomobject]@{ Role = $role; Text = $text }
}

$slides = @(
  [pscustomobject]@{
    File = 'README.md'
    Active = 'README.md'
    Title = '01 - Rancangan awal'
    Output = 'codex-vscode-01-rancangan-awal.png'
    Code = @(
      '# Portal Manajemen Proyek TI',
      '',
      '- Frontend: React + Vite',
      '- Backend: Node.js + Express',
      '- Database: MySQL',
      '- Auth: JWT dan RBAC',
      '- Dashboard: KPI, filter, grafik',
      '',
      '## Role pengguna',
      '- Project Manager: full control',
      '- Developer: update tugas',
      '- Client: pantau progres',
      '',
      '## Modul utama',
      '- Projects, Tasks, Milestones',
      '- Teams, Risks, Time Logs',
      '- Files, Links, Comments'
    )
    Messages = @(
      (New-Message 'Saya' 'Codex, saya ingin membuat website untuk mengelola proyek konsultan TI. Bisa dipakai Project Manager, Developer, dan Client.'),
      (New-Message 'Codex' 'Bisa. Saya sarankan arsitektur full-stack: React + Vite untuk frontend, Express untuk backend, dan MySQL untuk database. Kita tambahkan JWT, RBAC, dashboard ringkasan, CRUD proyek dan tugas, milestone, risiko, dokumen, komentar, serta visualisasi performa.'),
      (New-Message 'Saya' 'Kalau role-nya dibedakan, hak aksesnya bagaimana?'),
      (New-Message 'Codex' 'Project Manager punya kontrol penuh. Developer fokus pada tugas dan update progres. Client melihat status proyek, milestone, dan laporan aktivitas tanpa mengubah data inti.')
    )
  },
  [pscustomobject]@{
    File = 'Dashboard.jsx'
    Active = 'Dashboard.jsx'
    Title = '02 - Dashboard frontend'
    Output = 'codex-vscode-02-dashboard-frontend.png'
    Code = @(
      "import { useEffect, useMemo, useState } from 'react';",
      "import { Chart, registerables } from 'chart.js';",
      "import { jsPDF } from 'jspdf';",
      "import autoTable from 'jspdf-autotable';",
      '',
      'Chart.register(...registerables);',
      '',
      'const TASK_STATUS_LABELS = {',
      "  todo: 'Belum Dikerjakan',",
      "  in_progress: 'Berjalan',",
      "  done: 'Selesai'",
      '};',
      '',
      'function dashboardStats(tasks, projects) {',
      '  return { statusCounts, projectStatus };',
      '}',
      '',
      'export default function Dashboard() {',
      '  const [tasks, setTasks] = useState([]);',
      '  const [projects, setProjects] = useState([]);',
      '  const [filters, setFilters] = useState({});',
      '  // render KPI, chart, table, forms',
      '}'
    )
    Messages = @(
      (New-Message 'Saya' 'Untuk frontend, saya ingin tampilannya langsung seperti dashboard aplikasi, bukan landing page.'),
      (New-Message 'Codex' 'Saya buat halaman login dan dashboard utama. Dashboard menampilkan greeting, KPI, status proyek, daftar tugas, milestone, tim, filter, dan kontrol data sesuai role.'),
      (New-Message 'Saya' 'Bagaimana dengan visualisasi datanya?'),
      (New-Message 'Codex' 'Saya pasang Chart.js untuk task status, project status, burn-down chart, dan resource utilization. Export PDF memakai jsPDF dan autoTable agar laporan tugas rapi.')
    )
  },
  [pscustomobject]@{
    File = 'security-baseline.md'
    Active = 'security-baseline.md'
    Title = '03 - Backend dan keamanan'
    Output = 'codex-vscode-03-backend-keamanan.png'
    Code = @(
      '# Security Baseline dan Testing',
      '',
      '## OWASP Top 10 Checklist',
      '',
      '- A1: Broken Access Control',
      '  - JWT auth dan RBAC middleware',
      '  - Role-based restrictions endpoint CRUD',
      '',
      '- A2: Cryptographic Failures',
      '  - Password hashing dengan bcrypt',
      '  - JWT secret dari environment variable',
      '',
      '- A3: Injection',
      '  - mysql2 prepared statements',
      '  - Validasi input dengan Zod',
      '',
      '## Testing',
      '- Login valid dan invalid',
      '- RBAC create project',
      '- Validasi create task',
      '- Scope data developer'
    )
    Messages = @(
      (New-Message 'Saya' 'Oke, lanjut ke backend. Saya ingin API-nya aman dan tidak asal menerima input.'),
      (New-Message 'Codex' 'Backend saya susun dengan route Express terpisah, JWT login, password bcrypt, validasi Zod, middleware RBAC, dan query prepared statement untuk MySQL.'),
      (New-Message 'Saya' 'Keamanannya perlu ditulis juga untuk dokumentasi tugas.'),
      (New-Message 'Codex' 'Saya buat security baseline berbasis OWASP: access control, hashing, environment secret, input validation, Helmet headers, password policy, dan catatan testing.')
    )
  },
  [pscustomobject]@{
    File = 'PANDUAN SINGKAT JALANKAN WEBSITE.txt'
    Active = 'README.md'
    Title = '04 - Dokumentasi dan laporan'
    Output = 'codex-vscode-04-dokumentasi-laporan.png'
    Code = @(
      'PANDUAN MENJALANKAN WEBSITE TANPA DOCKER',
      '',
      '1. Install Node.js LTS dan XAMPP',
      '2. Start MySQL dari XAMPP',
      '3. Import database.sql di phpMyAdmin',
      '',
      '4. Jalankan backend:',
      '   cd backend',
      '   copy .env.example .env',
      '   npm install',
      '   npm run dev',
      '',
      '5. Jalankan frontend:',
      '   cd frontend',
      '   npm install',
      '   npm run dev',
      '',
      '6. Buka http://localhost:5173',
      '',
      'Akun demo: adminfairy, dev1, client1'
    )
    Messages = @(
      (New-Message 'Saya' 'Bagaimana kalau saya perlu laporan dari data tugas?'),
      (New-Message 'Codex' 'Saya tambahkan export tugas ke PDF dan CSV. PDF dibuat dengan jsPDF plus autoTable supaya tabel tugas mudah dibaca dan siap dipakai untuk laporan.'),
      (New-Message 'Saya' 'Bagaimana cara menjalankan websitenya nanti?'),
      (New-Message 'Codex' 'Saya buat panduan singkat: install Node.js dan XAMPP, import database.sql, jalankan backend, jalankan frontend, lalu login memakai akun demo Project Manager, Developer, atau Client.')
    )
  }
)

foreach ($slide in $slides) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  Draw-WindowChrome $graphics "Visual Studio Code - $($slide.Title)"
  Draw-ActivityBar $graphics
  Draw-Sidebar $graphics $slide.Active
  Draw-Editor $graphics $slide.File $slide.Code
  Draw-ChatPanel $graphics $slide.Title $slide.Messages

  $outputPath = Join-Path $outputDir $slide.Output
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $jpegPath = [System.IO.Path]::ChangeExtension($outputPath, '.jpg')
  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
  $bitmap.Save($jpegPath, $jpegCodec, $encoderParams)
  $encoderParams.Dispose()

  $graphics.Dispose()
  $bitmap.Dispose()
  Write-Output $outputPath
}
