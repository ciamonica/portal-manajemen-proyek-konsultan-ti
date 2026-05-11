<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: php/login.php');
    exit;
}
include 'php/config.php';

$role = $_SESSION['role'];
$user_id = $_SESSION['user_id'];
$username = $pdo->query("SELECT username FROM users WHERE id = $user_id")->fetch()['username'];

// Fetch data based on role
if ($role == 'pm') {
    $projects = $pdo->query("SELECT * FROM projects WHERE pm_id = $user_id")->fetchAll();
    $kpi_score = 120.00;
    $competence_score = 82.86;
    $total_score = ($kpi_score + $competence_score) / 2;
    $options_percentage = 123;
    $customers_percentage = 139;
    $progress_percentage = 88;
} elseif ($role == 'client') {
    $projects = $pdo->query("SELECT * FROM projects WHERE client_id = $user_id")->fetchAll();
    $kpi_score = 100.00;
    $competence_score = 75.00;
    $total_score = ($kpi_score + $competence_score) / 2;
    $options_percentage = 100;
    $customers_percentage = 110;
    $progress_percentage = 80;
} else {
    $projects = $pdo->query("SELECT DISTINCT p.* FROM projects p JOIN tasks t ON p.id = t.project_id WHERE t.assigned_to = $user_id")->fetchAll();
    $kpi_score = 110.00;
    $competence_score = 90.00;
    $total_score = ($kpi_score + $competence_score) / 2;
    $options_percentage = 115;
    $customers_percentage = 125;
    $progress_percentage = 85;
}

// For burn-down
$burn_down_data = [10, 8, 6, 4, 2, 0];
$ideal = [10, 8, 6, 4, 2, 0];

// Resource utilization
$utilization = $pdo->query("SELECT u.username, SUM(tl.hours) as total_hours FROM time_logs tl JOIN users u ON tl.user_id = u.id GROUP BY u.id")->fetchAll(PDO::FETCH_ASSOC);

// Project status distribution
$project_statuses = $pdo->query("SELECT status, COUNT(*) as count FROM projects GROUP BY status")->fetchAll(PDO::FETCH_ASSOC);

// Risk delay
$risk_tasks = $pdo->query("SELECT * FROM tasks WHERE due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status != 'done'")->fetchAll();
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Portal Proyek TI</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="mobile-app">
    <!-- App Bar -->
    <header class="app-bar">
        <div class="app-bar-left">
            <button class="menu-btn" onclick="toggleMenu()"><i class="fas fa-bars"></i></button>
            <h1>Dashboard</h1>
        </div>
        <div class="app-bar-right">
            <span class="user-greeting">Hi, <?php echo htmlspecialchars($username); ?></span>
        </div>
    </header>

    <!-- Side Menu -->
    <nav class="side-menu" id="sideMenu">
        <div class="menu-header">
            <h2>Menu</h2>
            <button class="close-btn" onclick="toggleMenu()"><i class="fas fa-times"></i></button>
        </div>
        <ul class="menu-list">
            <li><a href="dashboard.php"><i class="fas fa-home"></i> Dashboard</a></li>
            <li><a href="projects.php"><i class="fas fa-project-diagram"></i> Projects</a></li>
            <li><a href="tasks.php"><i class="fas fa-tasks"></i> Tasks</a></li>
            <li><a href="teams.php"><i class="fas fa-users"></i> Teams</a></li>
            <li><a href="milestones.php"><i class="fas fa-flag"></i> Milestones</a></li>
            <li><a href="php/logout.php"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
        <!-- KPI Cards -->
        <section class="kpi-cards">
            <div class="card">
                <div class="card-icon"><i class="fas fa-chart-line"></i></div>
                <div class="card-content">
                    <h3>KPI Score</h3>
                    <p class="card-value"><?php echo number_format($kpi_score, 1); ?>/120</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon"><i class="fas fa-brain"></i></div>
                <div class="card-content">
                    <h3>Kompetensi</h3>
                    <p class="card-value"><?php echo number_format($competence_score, 1); ?>/100</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon"><i class="fas fa-trophy"></i></div>
                <div class="card-content">
                    <h3>Total Score</h3>
                    <p class="card-value"><?php echo number_format($total_score, 1); ?></p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon"><i class="fas fa-users"></i></div>
                <div class="card-content">
                    <h3>Pelanggan</h3>
                    <p class="card-value"><?php echo $customers_percentage; ?>%</p>
                </div>
            </div>
        </section>

        <!-- Progress Section -->
        <section class="progress-section">
            <h2>Progress & Status</h2>
            <div class="progress-card">
                <div class="progress-info">
                    <h3>Target Progress</h3>
                    <p><?php echo $progress_percentage; ?>% Complete</p>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: <?php echo $progress_percentage; ?>%"></div>
                </div>
            </div>
        </section>

        <?php if ($role == 'pm') { ?>
            <!-- PM Specific Content -->
            <section class="charts-section">
                <h2>Analytics</h2>
                <div class="chart-container">
                    <canvas id="burnDownChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="utilizationChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="projectStatusChart"></canvas>
                </div>
            </section>

            <section class="risk-section">
                <h2>Risk of Delay</h2>
                <div class="risk-list">
                    <?php foreach ($risk_tasks as $t) { ?>
                        <div class="risk-item">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <p><?php echo $t['name']; ?></p>
                                <small>Due: <?php echo $t['due_date']; ?></small>
                            </div>
                        </div>
                    <?php } ?>
                </div>
            </section>
        <?php } ?>

        <!-- Projects List -->
        <section class="projects-section">
            <h2>My Projects</h2>
            <div class="projects-list">
                <?php foreach ($projects as $p) { ?>
                    <div class="project-item">
                        <div class="project-icon"><i class="fas fa-folder"></i></div>
                        <div class="project-info">
                            <h3><?php echo $p['name']; ?></h3>
                            <p>Status: <?php echo ucfirst($p['status']); ?></p>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                <?php } ?>
            </div>
        </section>
    </main>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
        <a href="dashboard.php" class="nav-item active">
            <i class="fas fa-home"></i>
            <span>Home</span>
        </a>
        <a href="projects.php" class="nav-item">
            <i class="fas fa-project-diagram"></i>
            <span>Projects</span>
        </a>
        <a href="tasks.php" class="nav-item">
            <i class="fas fa-tasks"></i>
            <span>Tasks</span>
        </a>
        <a href="teams.php" class="nav-item">
            <i class="fas fa-users"></i>
            <span>Teams</span>
        </a>
    </nav>

    <script>
        function toggleMenu() {
            const menu = document.getElementById('sideMenu');
            menu.classList.toggle('open');
        }

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const menu = document.getElementById('sideMenu');
            const menuBtn = document.querySelector('.menu-btn');
            if (!menu.contains(event.target) && !menuBtn.contains(event.target)) {
                menu.classList.remove('open');
            }
        });

        <?php if ($role == 'pm') { ?>
        // Initialize Charts
        const ctx = document.getElementById('burnDownChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'],
                datasets: [{
                    label: 'Actual Remaining',
                    data: <?php echo json_encode($burn_down_data); ?>,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Ideal',
                    data: <?php echo json_encode($ideal); ?>,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });

        const ctx2 = document.getElementById('utilizationChart').getContext('2d');
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: <?php echo json_encode(array_column($utilization, 'username')); ?>,
                datasets: [{
                    label: 'Total Hours',
                    data: <?php echo json_encode(array_column($utilization, 'total_hours')); ?>,
                    backgroundColor: '#2ecc71',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });

        const ctx3 = document.getElementById('projectStatusChart').getContext('2d');
        new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: <?php echo json_encode(array_column($project_statuses, 'status')); ?>,
                datasets: [{
                    data: <?php echo json_encode(array_column($project_statuses, 'count')); ?>,
                    backgroundColor: ['#3498db', '#e74c3c', '#f39c12', '#2ecc71'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
        <?php } ?>
    </script>
</body>
</html>