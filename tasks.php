<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: php/login.php');
    exit;
}
include 'php/config.php';

$role = $_SESSION['role'];
$user_id = $_SESSION['user_id'];

// Handle CRUD
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['add'])) {
        $assigned_to = !empty($_POST['assigned_to']) ? $_POST['assigned_to'] : null;
        $stmt = $pdo->prepare("INSERT INTO tasks (project_id, name, description, assigned_to, due_date) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$_POST['project_id'], $_POST['name'], $_POST['description'], $assigned_to, $_POST['due_date']]);
    } elseif (isset($_POST['edit'])) {
        $assigned_to = !empty($_POST['assigned_to']) ? $_POST['assigned_to'] : null;
        $stmt = $pdo->prepare("UPDATE tasks SET name=?, description=?, status=?, due_date=?, assigned_to=? WHERE id=?");
        $stmt->execute([$_POST['name'], $_POST['description'], $_POST['status'], $_POST['due_date'], $assigned_to, $_POST['id']]);
    } elseif (isset($_POST['delete'])) {
        $stmt = $pdo->prepare("DELETE FROM tasks WHERE id=?");
        $stmt->execute([$_POST['id']]);
    } elseif (isset($_POST['update_status'])) {
        $stmt = $pdo->prepare("UPDATE tasks SET status=?, progress=? WHERE id=? AND assigned_to=?");
        $stmt->execute([$_POST['status'], $_POST['progress'] ?? 0, $_POST['id'], $user_id]);
    } elseif (isset($_POST['add_time'])) {
        $stmt = $pdo->prepare("INSERT INTO time_logs (user_id, task_id, hours, log_date) VALUES (?, ?, ?, CURDATE())");
        $stmt->execute([$user_id, $_POST['task_id'], $_POST['hours']]);
    } elseif (isset($_POST['add_comment'])) {
        $stmt = $pdo->prepare("INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)");
        $stmt->execute([$_POST['task_id'], $user_id, $_POST['comment']]);
    }
}

// Fetch tasks
if ($role == 'dev') {
    $tasks = $pdo->query("SELECT t.*, p.name as project_name, u.username as assigned_username FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assigned_to = u.id WHERE t.assigned_to = $user_id")->fetchAll();
} else {
    $tasks = $pdo->query("SELECT t.*, p.name as project_name, u.username as assigned_username FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assigned_to = u.id WHERE p.pm_id = $user_id OR p.client_id = $user_id")->fetchAll();
}

// Fetch projects and users for forms
$projects = $pdo->query("SELECT id, name FROM projects")->fetchAll();
$users = $pdo->query("SELECT id, username FROM users WHERE role='dev'")->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tasks - Portal Manajemen Proyek</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <h1>Tasks</h1>
        <nav>
            <a href="dashboard.php">Dashboard</a>
            <a href="projects.php">Projects</a>
            <a href="milestones.php">Milestones</a>
            <a href="teams.php">Teams</a>
            <a href="php/logout.php">Logout</a>
        </nav>
    </header>
    <main>
        <?php if ($role == 'pm' || $role == 'client') { ?>
            <h2>Task List</h2>
            <table>
                <tr><th>Name</th><th>Project</th><th>Assigned To</th><th>Status</th><th>Due Date</th><th>Actions</th></tr>
                <?php foreach ($tasks as $t) { ?>
                    <tr>
                        <td><?php echo $t['name']; ?></td>
                        <td><?php echo $t['project_name']; ?></td>
                        <td><?php echo $t['assigned_username'] ?: 'Unassigned'; ?></td>
                        <td><?php echo $t['status']; ?></td>
                        <td><?php echo $t['due_date']; ?></td>
                        <td>
                            <?php if ($role == 'pm') { ?>
                                <form method="post" style="display:inline;">
                                    <input type="hidden" name="id" value="<?php echo $t['id']; ?>">
                                    <button type="submit" name="delete">Delete</button>
                                </form>
                                <button onclick="editTask(<?php echo $t['id']; ?>)">Edit</button>
                            <?php } ?>
                        </td>
                    </tr>
                <?php } ?>
            </table>

            <?php if ($role == 'pm') { ?>
                <h2>Add Task</h2>
                <form method="post">
                    <select name="project_id" required>
                        <option value="">Select Project</option>
                        <?php foreach ($projects as $p) { ?>
                            <option value="<?php echo $p['id']; ?>"><?php echo $p['name']; ?></option>
                        <?php } ?>
                    </select>
                    <input type="text" name="name" placeholder="Name" required>
                    <textarea name="description" placeholder="Description"></textarea>
                    <select name="assigned_to">
                        <option value="">Unassigned</option>
                        <?php foreach ($users as $u) { ?>
                            <option value="<?php echo $u['id']; ?>"><?php echo $u['username']; ?></option>
                        <?php } ?>
                    </select>
                    <input type="date" name="due_date">
                    <button type="submit" name="add">Add Task</button>
                </form>

                <div id="editForm" style="display:none;">
                    <h2>Edit Task</h2>
                    <form method="post">
                        <input type="hidden" name="id" id="editId">
                        <input type="text" name="name" id="editName" placeholder="Name" required>
                        <textarea name="description" id="editDescription" placeholder="Description"></textarea>
                        <select name="status" id="editStatus">
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>
                        <select name="assigned_to" id="editAssigned">
                            <option value="">Unassigned</option>
                            <?php foreach ($users as $u) { ?>
                                <option value="<?php echo $u['id']; ?>"><?php echo $u['username']; ?></option>
                            <?php } ?>
                        </select>
                        <input type="date" name="due_date" id="editDueDate">
                        <button type="submit" name="edit">Update Task</button>
                    </form>
                </div>
            <?php } ?>
        <?php } elseif ($role == 'dev') { ?>
            <h2>My Tasks</h2>
            <table>
                <tr><th>Name</th><th>Project</th><th>Status</th><th>Progress</th><th>Due Date</th><th>Actions</th></tr>
                <?php foreach ($tasks as $t) { ?>
                    <tr>
                        <td><?php echo $t['name']; ?></td>
                        <td><?php echo $t['project_name']; ?></td>
                        <td><?php echo $t['status']; ?></td>
                        <td><?php echo $t['progress']; ?>%</td>
                        <td><?php echo $t['due_date']; ?></td>
                        <td>
                            <form method="post" style="display:inline;">
                                <input type="hidden" name="id" value="<?php echo $t['id']; ?>">
                                <select name="status">
                                    <option value="todo" <?php if ($t['status'] == 'todo') echo 'selected'; ?>>To Do</option>
                                    <option value="in_progress" <?php if ($t['status'] == 'in_progress') echo 'selected'; ?>>In Progress</option>
                                    <option value="done" <?php if ($t['status'] == 'done') echo 'selected'; ?>>Done</option>
                                </select>
                                <input type="number" name="progress" value="<?php echo $t['progress']; ?>" min="0" max="100" style="width:50px;">%
                                <button type="submit" name="update_status">Update</button>
                            </form>
                        </td>
                    </tr>
                <?php } ?>
            </table>

            <h2>Time Tracking</h2>
            <form method="post">
                <select name="task_id" required>
                    <option value="">Select Task</option>
                    <?php foreach ($tasks as $t) { ?>
                        <option value="<?php echo $t['id']; ?>"><?php echo $t['name']; ?></option>
                    <?php } ?>
                </select>
                <input type="number" name="hours" placeholder="Hours" step="0.5" required>
                <button type="submit" name="add_time">Log Time</button>
            </form>

            <h2>Comments</h2>
            <?php foreach ($tasks as $t) { ?>
                <h3><?php echo $t['name']; ?></h3>
                <?php
                $comments = $pdo->query("SELECT c.*, u.username FROM task_comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = {$t['id']} ORDER BY c.created_at")->fetchAll();
                ?>
                <ul>
                    <?php foreach ($comments as $c) { ?>
                        <li><?php echo $c['username']; ?>: <?php echo $c['comment']; ?> (<?php echo $c['created_at']; ?>)</li>
                    <?php } ?>
                </ul>
                <form method="post">
                    <input type="hidden" name="task_id" value="<?php echo $t['id']; ?>">
                    <textarea name="comment" placeholder="Add comment" required></textarea>
                    <button type="submit" name="add_comment">Add Comment</button>
                </form>
            <?php } ?>
        <?php } ?>
    </main>
    <script>
        function editTask(id) {
            // Fetch task data and populate form (simplified, in real app use AJAX)
            document.getElementById('editForm').style.display = 'block';
            // Assume we set values here, but for simplicity, user fills manually
        }
    </script>
</body>
</html>