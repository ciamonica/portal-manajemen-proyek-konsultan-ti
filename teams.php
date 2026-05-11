<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: php/login.php');
    exit;
}
include 'php/config.php';

$role = $_SESSION['role'];
$user_id = $_SESSION['user_id'];

if ($role != 'pm') {
    echo "Access denied.";
    exit;
}

// Handle CRUD
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['add_team'])) {
        $stmt = $pdo->prepare("INSERT INTO teams (name) VALUES (?)");
        $stmt->execute([$_POST['team_name']]);
    } elseif (isset($_POST['add_member'])) {
        // Check if already member
        $check = $pdo->prepare("SELECT COUNT(*) FROM team_members WHERE team_id=? AND user_id=?");
        $check->execute([$_POST['team_id'], $_POST['user_id']]);
        if ($check->fetchColumn() == 0) {
            $stmt = $pdo->prepare("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)");
            $stmt->execute([$_POST['team_id'], $_POST['user_id']]);
        }
    } elseif (isset($_POST['remove_member'])) {
        $stmt = $pdo->prepare("DELETE FROM team_members WHERE team_id=? AND user_id=?");
        $stmt->execute([$_POST['team_id'], $_POST['user_id']]);
    } elseif (isset($_POST['delete_team'])) {
        $stmt = $pdo->prepare("DELETE FROM teams WHERE id=?");
        $stmt->execute([$_POST['team_id']]);
    }
}

// Fetch teams
$teams = $pdo->query("SELECT * FROM teams")->fetchAll();

// Fetch users for adding members
$users = $pdo->query("SELECT id, username FROM users WHERE role='dev'")->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Teams - Portal Manajemen Proyek</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <h1>Teams</h1>
        <nav>
            <a href="dashboard.php">Dashboard</a>
            <a href="projects.php">Projects</a>
            <a href="tasks.php">Tasks</a>
            <a href="milestones.php">Milestones</a>
            <a href="php/logout.php">Logout</a>
        </nav>
    </header>
    <main>
        <h2>Teams</h2>
        <?php foreach ($teams as $team) { ?>
            <h3><?php echo $team['name']; ?></h3>
            <?php
            $members = $pdo->query("SELECT u.username, tm.user_id FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = {$team['id']}")->fetchAll();
            ?>
            <ul>
                <?php foreach ($members as $m) { ?>
                    <li><?php echo $m['username']; ?>
                        <form method="post" style="display:inline;">
                            <input type="hidden" name="team_id" value="<?php echo $team['id']; ?>">
                            <input type="hidden" name="user_id" value="<?php echo $m['user_id']; ?>">
                            <button type="submit" name="remove_member">Remove</button>
                        </form>
                    </li>
                <?php } ?>
            </ul>
            <form method="post" style="display:inline;">
                <input type="hidden" name="team_id" value="<?php echo $team['id']; ?>">
                <select name="user_id">
                    <option value="">Add Member</option>
                    <?php foreach ($users as $u) { ?>
                        <option value="<?php echo $u['id']; ?>"><?php echo $u['username']; ?></option>
                    <?php } ?>
                </select>
                <button type="submit" name="add_member">Add</button>
            </form>
            <form method="post" style="display:inline;">
                <input type="hidden" name="team_id" value="<?php echo $team['id']; ?>">
                <button type="submit" name="delete_team">Delete Team</button>
            </form>
        <?php } ?>

        <h2>Add Team</h2>
        <form method="post">
            <input type="text" name="team_name" placeholder="Team Name" required>
            <button type="submit" name="add_team">Add Team</button>
        </form>
    </main>
</body>
</html>