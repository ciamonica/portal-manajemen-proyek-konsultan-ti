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
        $stmt = $pdo->prepare("INSERT INTO milestones (project_id, name, description, due_date) VALUES (?, ?, ?, ?)");
        $stmt->execute([$_POST['project_id'], $_POST['name'], $_POST['description'], $_POST['due_date']]);
    } elseif (isset($_POST['edit'])) {
        $stmt = $pdo->prepare("UPDATE milestones SET name=?, description=?, status=?, due_date=? WHERE id=?");
        $stmt->execute([$_POST['name'], $_POST['description'], $_POST['status'], $_POST['due_date'], $_POST['id']]);
    } elseif (isset($_POST['delete'])) {
        $stmt = $pdo->prepare("DELETE FROM milestones WHERE id=?");
        $stmt->execute([$_POST['id']]);
    } elseif (isset($_POST['approve'])) {
        $stmt = $pdo->prepare("UPDATE milestones SET status='achieved' WHERE id=?");
        $stmt->execute([$_POST['id']]);
    }
}

// Fetch milestones
if ($role == 'pm') {
    $milestones = $pdo->query("SELECT m.*, p.name as project_name FROM milestones m JOIN projects p ON m.project_id = p.id WHERE p.pm_id = $user_id")->fetchAll();
} elseif ($role == 'client') {
    $milestones = $pdo->query("SELECT m.*, p.name as project_name FROM milestones m JOIN projects p ON m.project_id = p.id WHERE p.client_id = $user_id")->fetchAll();
} else {
    $milestones = $pdo->query("SELECT m.*, p.name as project_name FROM milestones m JOIN projects p ON m.project_id = p.id JOIN tasks t ON p.id = t.project_id WHERE t.assigned_to = $user_id")->fetchAll();
}

// Fetch projects for PM
$projects = $pdo->query("SELECT id, name FROM projects WHERE pm_id = $user_id")->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Milestones - Portal Manajemen Proyek</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <h1>Milestones</h1>
        <nav>
            <a href="dashboard.php">Dashboard</a>
            <a href="projects.php">Projects</a>
            <a href="tasks.php">Tasks</a>
            <a href="teams.php">Teams</a>
            <a href="php/logout.php">Logout</a>
        </nav>
    </header>
    <main>
        <h2>Milestones</h2>
        <table>
            <tr><th>Name</th><th>Project</th><th>Status</th><th>Due Date</th><th>Actions</th></tr>
            <?php foreach ($milestones as $m) { ?>
                <tr>
                    <td><?php echo $m['name']; ?></td>
                    <td><?php echo $m['project_name']; ?></td>
                    <td><?php echo $m['status']; ?></td>
                    <td><?php echo $m['due_date']; ?></td>
                    <td>
                        <?php if ($role == 'pm') { ?>
                            <form method="post" style="display:inline;">
                                <input type="hidden" name="id" value="<?php echo $m['id']; ?>">
                                <button type="submit" name="delete">Delete</button>
                            </form>
                            <button onclick="editMilestone(<?php echo $m['id']; ?>)">Edit</button>
                        <?php } elseif ($role == 'client' && $m['status'] == 'pending') { ?>
                            <form method="post" style="display:inline;">
                                <input type="hidden" name="id" value="<?php echo $m['id']; ?>">
                                <button type="submit" name="approve">Approve</button>
                            </form>
                        <?php } ?>
                    </td>
                </tr>
            <?php } ?>
        </table>

        <?php if ($role == 'pm') { ?>
            <h2>Add Milestone</h2>
            <form method="post">
                <select name="project_id" required>
                    <option value="">Select Project</option>
                    <?php foreach ($projects as $p) { ?>
                        <option value="<?php echo $p['id']; ?>"><?php echo $p['name']; ?></option>
                    <?php } ?>
                </select>
                <input type="text" name="name" placeholder="Name" required>
                <textarea name="description" placeholder="Description"></textarea>
                <input type="date" name="due_date">
                <button type="submit" name="add">Add Milestone</button>
            </form>

            <div id="editForm" style="display:none;">
                <h2>Edit Milestone</h2>
                <form method="post">
                    <input type="hidden" name="id" id="editId">
                    <input type="text" name="name" id="editName" placeholder="Name" required>
                    <textarea name="description" id="editDescription" placeholder="Description"></textarea>
                    <select name="status" id="editStatus">
                        <option value="pending">Pending</option>
                        <option value="achieved">Achieved</option>
                    </select>
                    <input type="date" name="due_date" id="editDueDate">
                    <button type="submit" name="edit">Update Milestone</button>
                </form>
            </div>
        <?php } ?>
    </main>
    <script>
        function editMilestone(id) {
            document.getElementById('editForm').style.display = 'block';
        }
    </script>
</body>
</html>