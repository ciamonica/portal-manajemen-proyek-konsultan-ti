<?php
include 'php/config.php';

$new_username = 'adminfairy';
$new_password_hash = '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq';

$stmt = $pdo->prepare("UPDATE users SET username = ?, password = ? WHERE username = 'fairy'");
$stmt->execute([$new_username, $new_password_hash]);

echo "User updated successfully.";
?>