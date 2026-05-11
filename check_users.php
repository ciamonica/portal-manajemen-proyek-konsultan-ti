<?php
include 'php/config.php';

$stmt = $pdo->query("SELECT username, password FROM users");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($users as $user) {
    echo "Username: " . $user['username'] . ", Password Hash: " . $user['password'] . "\n";
}
?>