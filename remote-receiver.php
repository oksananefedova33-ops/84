<?php
// Этот код будет встроен в экспортируемый сайт
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$action = $_REQUEST['action'] ?? '';

switch($action) {
    case 'ping':
        echo json_encode(['ok' => true, 'version' => '1.0']);
        break;
        
    case 'list_files':
        $files = [];
        // Сканируем HTML файлы
        foreach(glob('*.html') as $htmlFile) {
            $content = file_get_contents($htmlFile);
            // Ищем кнопки-файлы
            if (preg_match_all('/<a[^>]+download="([^"]+)"[^>]*href="([^"]+)"/i', $content, $matches)) {
                for($i = 0; $i < count($matches[0]); $i++) {
                    $files[] = [
                        'name' => $matches[1][$i],
                        'url' => $matches[2][$i]
                    ];
                }
            }
        }
        echo json_encode(['ok' => true, 'items' => array_unique($files, SORT_REGULAR)]);
        break;
        
    case 'list_links':
        $links = [];
        // Сканируем HTML файлы
        foreach(glob('*.html') as $htmlFile) {
            $content = file_get_contents($htmlFile);
            // Ищем кнопки-ссылки
            if (preg_match_all('/<div[^>]+class="[^"]*linkbtn[^"]*"[^>]*>.*?<a[^>]+href="([^"]+)"/is', $content, $matches)) {
                foreach($matches[1] as $url) {
                    if ($url !== '#') {
                        $links[] = ['url' => $url];
                    }
                }
            }
        }
        echo json_encode(['ok' => true, 'items' => array_unique($links, SORT_REGULAR)]);
        break;
        
    case 'replace_file':
        $oldUrl = $_POST['old_url'] ?? '';
        $fileName = $_POST['file_name'] ?? '';
        $fileContent = $_POST['file_content'] ?? '';
        
        if (!$oldUrl || !$fileName || !$fileContent) {
            echo json_encode(['ok' => false, 'error' => 'Missing parameters']);
            break;
        }
        
        // Сохраняем новый файл
        $uploadDir = 'assets/uploads/';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }
        
        $newPath = $uploadDir . $fileName;
        file_put_contents($newPath, base64_decode($fileContent));
        
        // Заменяем во всех HTML файлах
        $replaced = 0;
        foreach(glob('*.html') as $htmlFile) {
            $content = file_get_contents($htmlFile);
            $newContent = str_replace($oldUrl, $newPath, $content);
            if ($content !== $newContent) {
                file_put_contents($htmlFile, $newContent);
                $replaced++;
            }
        }
        
        echo json_encode(['ok' => true, 'replaced' => $replaced]);
        break;
        
    case 'replace_link':
        $oldUrl = $_POST['old_url'] ?? '';
        $newUrl = $_POST['new_url'] ?? '';
        
        if (!$oldUrl || !$newUrl) {
            echo json_encode(['ok' => false, 'error' => 'Missing parameters']);
            break;
        }
        
        // Заменяем во всех HTML файлах
        $replaced = 0;
        foreach(glob('*.html') as $htmlFile) {
            $content = file_get_contents($htmlFile);
            $newContent = str_replace('href="' . $oldUrl . '"', 'href="' . $newUrl . '"', $content);
            if ($content !== $newContent) {
                file_put_contents($htmlFile, $newContent);
                $replaced++;
            }
        }
        
        echo json_encode(['ok' => true, 'replaced' => $replaced]);
        break;
        
    default:
        echo json_encode(['ok' => false, 'error' => 'Unknown action']);
}