#!/usr/bin/env php
<?php
/**
 * Cron Status Check - Prüft ob der Cron-Job korrekt konfiguriert ist
 */

echo "=== CRON STATUS CHECK ===\n\n";

// 1. Prüfe ob cron service läuft
echo "1. Checking cron service status...\n";
$cronStatus = shell_exec('service cron status 2>&1');
if (strpos($cronStatus, 'running') !== false || strpos($cronStatus, 'active') !== false) {
    echo "   ✅ Cron service is running\n";
} else {
    echo "   ❌ Cron service is NOT running\n";
    echo "   Output: " . trim($cronStatus) . "\n";
}

// 2. Prüfe crontab
echo "\n2. Checking crontab entries...\n";
$crontab = shell_exec('crontab -l 2>&1');
if (strpos($crontab, 'daily_fetch.php') !== false) {
    echo "   ✅ Daily fetch cron job found\n";
    echo "   Entry: " . trim($crontab) . "\n";
} else {
    echo "   ❌ Daily fetch cron job NOT found\n";
    echo "   Crontab output: " . trim($crontab) . "\n";
}

// 3. Prüfe /etc/cron.d/daily-fetch
echo "\n3. Checking /etc/cron.d/daily-fetch...\n";
if (file_exists('/etc/cron.d/daily-fetch')) {
    $cronFile = file_get_contents('/etc/cron.d/daily-fetch');
    echo "   ✅ Cron file exists\n";
    echo "   Content: " . trim($cronFile) . "\n";
    
    $permissions = substr(sprintf('%o', fileperms('/etc/cron.d/daily-fetch')), -4);
    echo "   Permissions: $permissions\n";
} else {
    echo "   ❌ Cron file does NOT exist\n";
}

// 4. Teste daily_fetch.php Script
echo "\n4. Testing daily_fetch.php script...\n";
if (file_exists('/var/www/html/scripts/daily_fetch.php')) {
    echo "   ✅ daily_fetch.php exists\n";
    
    if (is_executable('/var/www/html/scripts/daily_fetch.php')) {
        echo "   ✅ daily_fetch.php is executable\n";
    } else {
        echo "   ❌ daily_fetch.php is NOT executable\n";
    }
} else {
    echo "   ❌ daily_fetch.php does NOT exist\n";
}

// 5. Nächste geplante Ausführung
echo "\n5. Next scheduled execution...\n";
$nextRun = shell_exec('date -d "tomorrow 06:00" 2>&1');
if ($nextRun) {
    echo "   Next run scheduled for: " . trim($nextRun) . " (06:00 UTC)\n";
}

// 6. Zeitzone prüfen
echo "\n6. Current timezone and time...\n";
echo "   Server time: " . date('Y-m-d H:i:s T') . "\n";
echo "   UTC time: " . gmdate('Y-m-d H:i:s') . " UTC\n";

echo "\n=== CRON STATUS CHECK COMPLETED ===\n";
?>