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
        $stmt = $pdo->prepare("INSERT INTO projects (name, description, start_date, end_date, client_id, pm_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$_POST['name'], $_POST['description'], $_POST['start_date'], $_POST['end_date'], $_POST['client_id'], $user_id]);
    } elseif (isset($_POST['edit'])) {
        $stmt = $pdo->prepare("UPDATE projects SET name=?, description=?, start_date=?, end_date=?, status=? WHERE id=?");
        $stmt->execute([$_POST['name'], $_POST['description'], $_POST['start_date'], $_POST['end_date'], $_POST['status'], $_POST['id']]);
    } elseif (isset($_POST['delete'])) {
        $stmt = $pdo->prepare("DELETE FROM projects WHERE id=?");
        $stmt->execute([$_POST['id']]);
    }
}

// Fetch projects
if ($role == 'pm') {
    $projects = $pdo->query("SELECT * FROM projects WHERE pm_id = $user_id")->fetchAll();
} elseif ($role == 'client') {
    $projects = $pdo->query("SELECT * FROM projects WHERE client_id = $user_id")->fetchAll();
} else {
    $projects = $pdo->query("SELECT DISTINCT p.* FROM projects p JOIN tasks t ON p.id = t.project_id WHERE t.assigned_to = $user_id")->fetchAll();
}

// Fetch clients for add form
$clients = $pdo->query("SELECT id, username FROM users WHERE role='client'")->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Projects - Portal Manajemen Proyek</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <h1>Projects</h1>
        <nav>
            <a href="dashboard.php">Dashboard</a>
            <a href="tasks.php">Tasks</a>
            <a href="milestones.php">Milestones</a>
            <a href="teams.php">Teams</a>
            <a href="php/logout.php">Logout</a>
        </nav>
    </header>
    <main>
        <h2>Project List</h2>
        <table>
            <tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr>
            <?php foreach ($projects as $p) { ?>
                <tr>
                    <td><?php echo $p['name']; ?></td>
                    <td><?php echo $p['description']; ?></td>
                    <td><?php echo $p['status']; ?></td>
                    <td>
                        <?php if ($role == 'pm') { ?>
                            <form method="post" style="display:inline;">
                                <input type="hidden" name="id" value="<?php echo $p['id']; ?>">
                                <button type="submit" name="delete">Delete</button>
                            </form>
                            <button onclick="editProject(<?php echo $p['id']; ?>)">Edit</button>
                        <?php } ?>
                    </td>
                </tr>
            <?php } ?>
        </table>

        <?php if ($role == 'pm') { ?>
            <h2>Add Project</h2>
            <form method="post">
                <input type="text" name="name" placeholder="Name" required>
                <textarea name="description" placeholder="Description"></textarea>
                <input type="date" name="start_date">
                <input type="date" name="end_date">
                <select name="client_id">
                    <?php foreach ($clients as $c) { ?>
                        <option value="<?php echo $c['id']; ?>"><?php echo $c['username']; ?></option>
                    <?php } ?>
                </select>
                <button type="submit" name="add">Add Project</button>
            </form>

            <div id="editForm" style="display:none;">
                <h2>Edit Project</h2>
                <form method="post">
                    <input type="hidden" name="id" id="editId">
                    <input type="text" name="name" id="editName" required>
                    <textarea name="description" id="editDesc"></textarea>
                    <input type="date" name="start_date" id="editStart">
                    <input type="date" name="end_date" id="editEnd">
                    <select name="status" id="editStatus">
                        <option value="planning">Planning</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="on_hold">On Hold</option>
                    </select>
                    <button type="submit" name="edit">Update</button>
                </form>
            </div>
        <?php } ?>
    </main>
    <script>
        function editProject(id) {
            // Fetch project data via AJAX or prefill, for simplicity, assume data is available
            // In real app, use AJAX
            document.getElementById('editForm').style.display = 'block';
            // Prefill fields - need to get data, for now placeholder
        }
    </script>
</body>
</html>