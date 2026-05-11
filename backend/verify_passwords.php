<?php
$hash1 = '$2y$10$UJmmaGOAhJsHUv/gi0Tzu.wHnEHtUQzUnakaAZEPFY5cfDeYMNGQS';
$hash2 = '$2y$10$7ZntQsKYmcJGTA5fCuIo/.DjnnK.4ffRtmjNIY1kWRyRnUHtRr6/K';
$cands = ['konsultan123','password','password123','fairy123','dev123','client123','12345678','admin123','secret123','hello123','fairy','dev1','client1'];
foreach ($cands as $p) {
    echo $p . ' -> ';
    $matches = [];
    if (password_verify($p, $hash1)) {
        $matches[] = 'hash1';
    }
    if (password_verify($p, $hash2)) {
        $matches[] = 'hash2';
    }
    echo empty($matches) ? 'none' : implode(',', $matches);
    echo PHP_EOL;
}
