<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$action = $_REQUEST['action'] ?? '';

switch($action) {
    case 'check':
        checkConnection();
        break;
        
    case 'list':
        listContent();
        break;
        
    case 'replace_file':
        replaceFile();
        break;
        
    case 'replace_link':
        replaceLink();
        break;
        
    default:
        echo json_encode(['ok' => false, 'error' => 'Unknown action: ' . $action]);
}

function checkConnection() {
    $url = $_POST['url'] ?? '';
    if (!$url) {
        echo json_encode(['ok' => false, 'error' => 'URL не указан']);
        return;
    }
    
    // Добавляем слеш в конце если его нет
    $url = rtrim($url, '/');
    $apiUrl = $url . '/remote-api.php';
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'action=ping');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if ($data && isset($data['ok']) && $data['ok'] === true) {
            echo json_encode(['ok' => true]);
            return;
        }
    }
    
    // Детальная информация об ошибке
    $errorMsg = 'Не удалось подключиться к сайту. ';
    if ($error) {
        $errorMsg .= 'Ошибка: ' . $error;
    } elseif ($httpCode !== 200) {
        $errorMsg .= 'HTTP код: ' . $httpCode;
    } else {
        $errorMsg .= 'API не отвечает корректно';
    }
    
    echo json_encode(['ok' => false, 'error' => $errorMsg]);
}

function listContent() {
    $url = $_POST['url'] ?? '';
    $type = $_POST['type'] ?? 'files';
    
    if (!$url) {
        echo json_encode(['ok' => false, 'error' => 'URL не указан']);
        return;
    }
    
    $url = rtrim($url, '/');
    $apiUrl = $url . '/remote-api.php';
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'action' => 'list_' . $type
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if ($data && isset($data['items'])) {
            echo json_encode(['ok' => true, 'items' => $data['items']]);
            return;
        }
    }
    
    echo json_encode(['ok' => false, 'error' => 'Не удалось получить данные']);
}

function replaceFile() {
    $domain = $_POST['domain'] ?? '';
    $oldUrl = $_POST['old_url'] ?? '';
    $newUrl = $_POST['new_url'] ?? '';
    $fileName = $_POST['file_name'] ?? '';
    
    if (!$domain || !$oldUrl || !$newUrl || !$fileName) {
        echo json_encode(['ok' => false, 'error' => 'Не все параметры указаны']);
        return;
    }
    
    // Загружаем файл с нашего сервера
    $localPath = $_SERVER['DOCUMENT_ROOT'] . $newUrl;
    if (!file_exists($localPath)) {
        // Попробуем альтернативный путь
        $localPath = dirname(dirname(__DIR__)) . $newUrl;
        if (!file_exists($localPath)) {
            echo json_encode(['ok' => false, 'error' => 'Файл не найден на сервере: ' . $newUrl]);
            return;
        }
    }
    
    $fileContent = base64_encode(file_get_contents($localPath));
    
    $domain = rtrim($domain, '/');
    $apiUrl = $domain . '/remote-api.php';
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'action' => 'replace_file',
        'old_url' => $oldUrl,
        'file_name' => $fileName,
        'file_content' => $fileContent
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if ($data) {
            echo json_encode($data);
        } else {
            echo json_encode(['ok' => false, 'error' => 'Некорректный ответ от удаленного сервера']);
        }
    } else {
        $errorMsg = 'Ошибка соединения. ';
        if ($error) {
            $errorMsg .= 'Детали: ' . $error;
        } else {
            $errorMsg .= 'HTTP код: ' . $httpCode;
        }
        echo json_encode(['ok' => false, 'error' => $errorMsg]);
    }
}

function replaceLink() {
    $domain = $_POST['domain'] ?? '';
    $oldUrl = $_POST['old_url'] ?? '';
    $newUrl = $_POST['new_url'] ?? '';
    
    if (!$domain || !$oldUrl || !$newUrl) {
        echo json_encode(['ok' => false, 'error' => 'Не все параметры указаны']);
        return;
    }
    
    $domain = rtrim($domain, '/');
    $apiUrl = $domain . '/remote-api.php';
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'action' => 'replace_link',
        'old_url' => $oldUrl,
        'new_url' => $newUrl
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if ($data) {
            echo json_encode($data);
        } else {
            echo json_encode(['ok' => false, 'error' => 'Некорректный ответ от удаленного сервера']);
        }
    } else {
        echo json_encode(['ok' => false, 'error' => 'Ошибка соединения (HTTP ' . $httpCode . ')']);
    }
}
?>