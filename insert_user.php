<?php
include 'php/config.php';

$username = 'admin';
$password = password_hash('password123', PASSWORD_DEFAULT);
$email = 'admin@example.com';
$role = 'pm';

$stmt = $pdo->prepare("INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)");
$stmt->execute([$username, $password, $email, $role]);

echo "User inserted successfully.";
?>