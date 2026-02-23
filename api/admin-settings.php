<?php
// api/admin-settings.php
// معالجة طلبات التحكم بالإعدادات

header('Content-Type: application/json');
require_once '../includes/config.php';
require_once '../includes/db.php';

// التحقق من صلاحية المشرف
session_start();
if (!isset($_SESSION['admin_logged']) || $_SESSION['admin_logged'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? '';

switch($action) {
    case 'get':
        getSettings();
        break;
    case 'save_prices':
        savePrices();
        break;
    case 'save_ad_codes':
        saveAdCodes();
        break;
    case 'save_api_keys':
        saveApiKeys();
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
}

function getSettings() {
    global $pdo;
    
    try {
        $stmt = $pdo->query("SELECT * FROM settings WHERE id = 1");
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // إخفاء مفاتيح API بشكل كامل
        $settings['faucetpay_api_key'] = $settings['faucetpay_api_key'] ? '********' : '';
        $settings['nowpayments_api_key'] = $settings['nowpayments_api_key'] ? '********' : '';
        
        // إحصائيات سريعة
        $stats = $pdo->query("
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 day') as today_users,
                (SELECT COALESCE(SUM(amount), 0) FROM earnings) as total_earnings,
                (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'completed') as total_withdrawn,
                (SELECT COUNT(*) FROM earnings WHERE source = 'video_ad') as total_ads,
                (SELECT COUNT(*) FROM game_sessions) as total_games
        ")->fetch(PDO::FETCH_ASSOC);
        
        $settings = array_merge($settings, $stats);
        
        echo json_encode($settings);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function savePrices() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $stmt = $pdo->prepare("
            UPDATE settings SET
                video_ad_rate = ?,
                smart_link_rate = ?,
                game_click_rate = ?,
                task_rate = ?,
                min_withdraw_faucetpay = ?,
                min_withdraw_visa = ?,
                freefire_diamonds = ?,
                visa_exchange_rate = ?,
                freefire_exchange_rate = ?,
                smart_link_timer = ?,
                game_ad_interval = ?,
                referral_percent = ?,
                updated_at = NOW()
            WHERE id = 1
        ");
        
        $stmt->execute([
            $data['video_ad_rate'],
            $data['smart_link_rate'],
            $data['game_click_rate'],
            $data['task_rate'],
            $data['min_withdraw_faucetpay'],
            $data['min_withdraw_visa'],
            $data['freefire_diamonds'],
            $data['visa_exchange_rate'],
            $data['freefire_exchange_rate'],
            $data['smart_link_timer'],
            $data['game_ad_interval'],
            $data['referral_percent']
        ]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function saveAdCodes() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $stmt = $pdo->prepare("
            UPDATE settings SET
                bitmedia_banner_code = ?,
                bitmedia_video_code = ?,
                bitmedia_interstitial_code = ?,
                bitmedia_rewarded_code = ?,
                updated_at = NOW()
            WHERE id = 1
        ");
        
        $stmt->execute([
            $data['bitmedia_banner_code'],
            $data['bitmedia_video_code'],
            $data['bitmedia_interstitial_code'],
            $data['bitmedia_rewarded_code']
        ]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function saveApiKeys() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $stmt = $pdo->prepare("
            UPDATE settings SET
                faucetpay_api_key = CASE WHEN ? != '********' THEN ? ELSE faucetpay_api_key END,
                faucetpay_merchant_id = CASE WHEN ? != '' THEN ? ELSE faucetpay_merchant_id END,
                nowpayments_api_key = CASE WHEN ? != '********' THEN ? ELSE nowpayments_api_key END,
                nowpayments_ipn_secret = CASE WHEN ? != '' THEN ? ELSE nowpayments_ipn_secret END,
                updated_at = NOW()
            WHERE id = 1
        ");
        
        $stmt->execute([
            $data['faucetpay_key'], $data['faucetpay_key'],
            $data['faucetpay_merchant'], $data['faucetpay_merchant'],
            $data['nowpayments_key'], $data['nowpayments_key'],
            $data['nowpayments_secret'], $data['nowpayments_secret']
        ]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
