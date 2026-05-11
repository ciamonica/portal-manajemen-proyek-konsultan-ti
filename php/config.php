<?php
// config.php - Database configuration
$host = 'localhost';
$dbname = 'project_portal';
$username = 'root'; // Default XAMPP
$password = ''; // Default XAMPP

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>