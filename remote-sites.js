(function(){
    'use strict';
    
    let domains = JSON.parse(localStorage.getItem('rs_domains') || '[]');
    let selectedDomains = [];
    let selectedItems = [];
    let currentTab = 'files';
    
    // Добавляем кнопку в тулбар
    function addRemoteSitesButton() {
        const toolbar = document.querySelector('.topbar');
        if (!toolbar || document.getElementById('btnRemoteSites')) return;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'btnRemoteSites';
        btn.className = 'btn';
        btn.textContent = '🌐 Мои сайты';
        btn.addEventListener('click', openModal);
        
        const exportBtn = toolbar.querySelector('#btnExport');
        if (exportBtn) {
            exportBtn.parentNode.insertBefore(btn, exportBtn);
        } else {
            toolbar.appendChild(btn);
        }
    }
    
    // Создаем модальное окно
    function createModal() {
        if (document.getElementById('rsModalBackdrop')) return;
        
        const backdrop = document.createElement('div');
        backdrop.id = 'rsModalBackdrop';
        backdrop.className = 'rs-backdrop hidden';
        
        const modal = document.createElement('div');
        modal.className = 'rs-modal';
        
        modal.innerHTML = `
            <div class="rs-modal__header">
                <div class="rs-modal__title">🌐 Управление удаленными сайтами</div>
                <button type="button" class="rs-close">×</button>
            </div>
            <div class="rs-modal__body">
                <!-- Добавление домена -->
                <div class="rs-section">
                    <div class="rs-section__title">Добавить сайт</div>
                    <div class="rs-input-group">
                        <input type="text" class="rs-input" id="rsNewDomain" placeholder="https://example.com">
                        <button class="rs-btn" id="rsCheckConnection">🔍 Проверить соединение</button>
                        <button class="rs-btn primary" id="rsAddDomain">➕ Добавить</button>
                    </div>
                    <div id="rsConnectionStatus"></div>
                </div>
                
                <!-- Список доменов -->
                <div class="rs-section">
                    <div class="rs-section__title">Подключенные сайты</div>
                    <div class="rs-domain-list" id="rsDomainList"></div>
                </div>
                
                <!-- Контент выбранных доменов -->
                <div class="rs-section" id="rsContentSection" style="display:none">
                    <div class="rs-section__title">Управление контентом</div>
                    
                    <div class="rs-content-tabs">
                        <button class="rs-tab active" data-tab="files">📁 Файлы в кнопках</button>
                        <button class="rs-tab" data-tab="links">🔗 Ссылки в кнопках</button>
                    </div>
                    
                    <!-- Панель файлов -->
                    <div class="rs-content-panel active" data-panel="files">
                        <div class="rs-items-list" id="rsFilesList">
                            <div class="rs-empty">Выберите домены для просмотра файлов</div>
                        </div>
                        
                        <div class="rs-replace-section">
                            <div style="margin-bottom:12px">
                                <label style="color:#9fb2c6;font-size:13px">Загрузить новый файл:</label>
                                <input type="file" id="rsNewFile" style="margin-top:8px">
                            </div>
                            <button class="rs-btn primary" id="rsReplaceFiles">🔄 Заменить файлы на выбранных доменах</button>
                        </div>
                    </div>
                    
                    <!-- Панель ссылок -->
                    <div class="rs-content-panel" data-panel="links">
                        <div class="rs-items-list" id="rsLinksList">
                            <div class="rs-empty">Выберите домены для просмотра ссылок</div>
                        </div>
                        
                        <div class="rs-replace-section">
                            <div style="margin-bottom:12px">
                                <label style="color:#9fb2c6;font-size:13px">Новая ссылка:</label>
                                <input type="text" class="rs-input" id="rsNewLink" placeholder="https://new-link.com" style="margin-top:8px">
                            </div>
                            <button class="rs-btn primary" id="rsReplaceLinks">🔄 Заменить ссылки на выбранных доменах</button>
                        </div>
                    </div>
                </div>
                
                <div id="rsStatus"></div>
                
                <!-- Debug информация -->
                <div class="rs-section" id="rsDebugSection" style="display:none; background: #0a0d13; border-color: #2a3441;">
                    <div class="rs-section__title">🐛 Debug информация</div>
                    <pre id="rsDebugContent" style="color: #9fb2c6; font-size: 11px; overflow: auto; max-height: 200px;"></pre>
                </div>
            </div>
        `;
        
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
        
        // Обработчики
        modal.querySelector('.rs-close').addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });
        
        document.getElementById('rsCheckConnection').addEventListener('click', checkConnection);
        document.getElementById('rsAddDomain').addEventListener('click', addDomain);
        document.getElementById('rsReplaceFiles').addEventListener('click', replaceFiles);
        document.getElementById('rsReplaceLinks').addEventListener('click', replaceLinks);
        
        // Табы
        modal.querySelectorAll('.rs-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });
        
        // Добавляем хоткей для включения debug режима (Ctrl+Shift+D)
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                const debugSection = document.getElementById('rsDebugSection');
                if (debugSection) {
                    debugSection.style.display = debugSection.style.display === 'none' ? 'block' : 'none';
                }
            }
        });
    }
    
    function openModal() {
        createModal();
        document.getElementById('rsModalBackdrop').classList.remove('hidden');
        renderDomains();
    }
    
    function closeModal() {
        document.getElementById('rsModalBackdrop').classList.add('hidden');
    }
    
    function renderDomains() {
        const list = document.getElementById('rsDomainList');
        
        if (domains.length === 0) {
            list.innerHTML = '<div class="rs-empty">Нет добавленных сайтов</div>';
            document.getElementById('rsContentSection').style.display = 'none';
            return;
        }
        
        list.innerHTML = domains.map(domain => `
            <div class="rs-domain-item">
                <input type="checkbox" class="rs-domain-checkbox" data-domain="${domain.url}">
                <span class="rs-domain-name">${domain.url}</span>
                <span class="rs-domain-status ${domain.active ? 'active' : 'inactive'}"></span>
                <button class="rs-domain-remove" data-domain="${domain.url}">×</button>
            </div>
        `).join('');
        
        // Обработчики
        list.querySelectorAll('.rs-domain-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelectedDomains);
        });
        
        list.querySelectorAll('.rs-domain-remove').forEach(btn => {
            btn.addEventListener('click', () => removeDomain(btn.dataset.domain));
        });
        
        checkAllConnections();
    }
    
    function updateSelectedDomains() {
        selectedDomains = [];
        document.querySelectorAll('.rs-domain-checkbox:checked').forEach(cb => {
            selectedDomains.push(cb.dataset.domain);
        });
        
        if (selectedDomains.length > 0) {
            document.getElementById('rsContentSection').style.display = 'block';
            loadContent();
        } else {
            document.getElementById('rsContentSection').style.display = 'none';
        }
    }
    
    async function checkConnection() {
        const url = document.getElementById('rsNewDomain').value.trim();
        if (!url) {
            showStatus('Введите URL сайта', 'error');
            return;
        }
        
        showStatus('Проверка соединения...', 'info');
        
        try {
            const response = await fetch('/ui/remote-sites/remote-api.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: `action=check&url=${encodeURIComponent(url)}`
            });
            
            const data = await response.json();
            
            if (data.ok) {
                showStatus('✅ Соединение установлено', 'success');
            } else {
                showStatus('❌ ' + (data.error || 'Не удалось подключиться'), 'error');
            }
        } catch (error) {
            showStatus('❌ Ошибка: ' + error.message, 'error');
        }
    }
    
    async function checkAllConnections() {
        for (let domain of domains) {
            try {
                const response = await fetch('/ui/remote-sites/remote-api.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: `action=check&url=${encodeURIComponent(domain.url)}`
                });
                
                const data = await response.json();
                domain.active = data.ok;
                
                // Обновляем индикатор
                const statusElements = document.querySelectorAll('.rs-domain-item');
                statusElements.forEach(el => {
                    const domainName = el.querySelector('.rs-domain-name');
                    if (domainName && domainName.textContent === domain.url) {
                        const status = el.querySelector('.rs-domain-status');
                        if (status) {
                            status.className = `rs-domain-status ${domain.active ? 'active' : 'inactive'}`;
                        }
                    }
                });
            } catch (error) {
                domain.active = false;
            }
        }
        
        saveDomains();
    }
    
    function addDomain() {
        const url = document.getElementById('rsNewDomain').value.trim();
        if (!url) {
            showStatus('Введите URL сайта', 'error');
            return;
        }
        
        if (domains.find(d => d.url === url)) {
            showStatus('Этот сайт уже добавлен', 'error');
            return;
        }
        
        domains.push({url, active: false});
        saveDomains();
        
        document.getElementById('rsNewDomain').value = '';
        renderDomains();
        showStatus('Сайт добавлен', 'success');
    }
    
    function removeDomain(url) {
        if (!confirm(`Удалить сайт ${url}?`)) return;
        
        domains = domains.filter(d => d.url !== url);
        saveDomains();
        renderDomains();
    }
    
    function saveDomains() {
        localStorage.setItem('rs_domains', JSON.stringify(domains));
    }
    
    function switchTab(tab) {
        currentTab = tab;
        
        document.querySelectorAll('.rs-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        document.querySelectorAll('.rs-content-panel').forEach(p => {
            p.classList.toggle('active', p.dataset.panel === tab);
        });
        
        loadContent();
    }
    
    async function loadContent() {
        if (selectedDomains.length === 0) return;
        
        const listEl = currentTab === 'files' 
            ? document.getElementById('rsFilesList')
            : document.getElementById('rsLinksList');
        
        listEl.innerHTML = '<div class="rs-loading">Загрузка...</div>';
        
        const items = new Map();
        
        for (let domainUrl of selectedDomains) {
            try {
                const response = await fetch('/ui/remote-sites/remote-api.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: `action=list&url=${encodeURIComponent(domainUrl)}&type=${currentTab}`
                });
                
                const data = await response.json();
                
                if (data.ok && data.items) {
                    data.items.forEach(item => {
                        const key = currentTab === 'files' ? item.url : item.url;
                        if (!items.has(key)) {
                            items.set(key, {...item, domains: [domainUrl]});
                        } else {
                            items.get(key).domains.push(domainUrl);
                        }
                    });
                }
            } catch (error) {
                console.error('Ошибка загрузки с', domainUrl, error);
            }
        }
        
        if (items.size === 0) {
            listEl.innerHTML = '<div class="rs-empty">Нет ' + (currentTab === 'files' ? 'файлов' : 'ссылок') + '</div>';
            return;
        }
        
        listEl.innerHTML = Array.from(items.values()).map(item => {
            const icon = currentTab === 'files' ? getFileIcon(item.name) : '🔗';
            const name = currentTab === 'files' ? item.name : item.url;
            
            return `
                <div class="rs-item" data-url="${item.url}">
                    <input type="checkbox" class="rs-item-checkbox" data-url="${item.url}">
                    <span class="rs-item-icon">${icon}</span>
                    <span class="rs-item-name" title="${name}">${name}</span>
                    <small style="color:#6b7280; margin-left:auto">${item.url}</small>
                </div>
            `;
        }).join('');
        
        listEl.querySelectorAll('.rs-item-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelectedItems);
        });
    }
    
    function updateSelectedItems() {
        selectedItems = [];
        document.querySelectorAll('.rs-item-checkbox:checked').forEach(cb => {
            selectedItems.push(cb.dataset.url);
        });
        
        // Обновляем debug информацию
        updateDebugInfo('Selected items: ' + JSON.stringify(selectedItems));
    }
    
    async function replaceFiles() {
        const fileInput = document.getElementById('rsNewFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showStatus('Выберите файл для загрузки', 'error');
            return;
        }
        
        if (selectedItems.length === 0) {
            showStatus('Выберите файлы для замены', 'error');
            return;
        }
        
        if (selectedDomains.length === 0) {
            showStatus('Выберите домены', 'error');
            return;
        }
        
        showStatus('Загрузка файла...', 'info');
        updateDebugInfo('Starting file upload: ' + file.name);
        
        // Сначала загружаем файл локально
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'file');
        
        try {
            const uploadResp = await fetch('/editor/api.php?action=uploadAsset&type=file', {
                method: 'POST',
                body: fd
            });
            
            const uploadData = await uploadResp.json();
            updateDebugInfo('Upload response: ' + JSON.stringify(uploadData));
            
            if (!uploadData.ok) {
                showStatus('Ошибка загрузки: ' + (uploadData.error || 'неизвестная'), 'error');
                return;
            }
            
            // Теперь отправляем на удаленные домены
            let successCount = 0;
            let failCount = 0;
            let debugResponses = [];
            
            for (let domainUrl of selectedDomains) {
                for (let oldUrl of selectedItems) {
                    try {
                        updateDebugInfo(`Replacing ${oldUrl} on ${domainUrl}...`);
                        
                        const response = await fetch('/ui/remote-sites/remote-api.php', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                            body: `action=replace_file&domain=${encodeURIComponent(domainUrl)}&old_url=${encodeURIComponent(oldUrl)}&new_url=${encodeURIComponent(uploadData.url)}&file_name=${encodeURIComponent(file.name)}`
                        });
                        
                        const data = await response.json();
                        debugResponses.push({
                            domain: domainUrl,
                            oldUrl: oldUrl,
                            response: data
                        });
                        
                        updateDebugInfo(`Response from ${domainUrl}: ` + JSON.stringify(data));
                        
                        if (data.ok) {
                            if (data.replaced && data.replaced > 0) {
                                successCount++;
                            } else {
                                failCount++;
                                updateDebugInfo(`⚠️ No replacements made on ${domainUrl} for ${oldUrl}`);
                            }
                        } else {
                            failCount++;
                        }
                    } catch (error) {
                        failCount++;
                        console.error('Ошибка замены на', domainUrl, error);
                        updateDebugInfo(`Error on ${domainUrl}: ${error.message}`);
                    }
                }
            }
            
            // Показываем детальный результат
            let statusMessage = '';
            if (successCount > 0) {
                statusMessage += `✅ Успешно заменено: ${successCount}`;
            }
            if (failCount > 0) {
                statusMessage += (statusMessage ? ', ' : '') + `❌ Не удалось заменить: ${failCount}`;
            }
            
            showStatus(statusMessage || 'Операция завершена', successCount > 0 ? 'success' : 'error');
            
            // Показываем debug информацию в консоли
            console.log('Debug responses:', debugResponses);
            
            // Перезагружаем содержимое
            loadContent();
            
        } catch (error) {
            showStatus('Ошибка: ' + error.message, 'error');
            updateDebugInfo('Fatal error: ' + error.message);
        }
    }
    
    async function replaceLinks() {
        const newLink = document.getElementById('rsNewLink').value.trim();
        
        if (!newLink) {
            showStatus('Введите новую ссылку', 'error');
            return;
        }
        
        if (selectedItems.length === 0) {
            showStatus('Выберите ссылки для замены', 'error');
            return;
        }
        
        if (selectedDomains.length === 0) {
            showStatus('Выберите домены', 'error');
            return;
        }
        
        showStatus('Замена ссылок...', 'info');
        updateDebugInfo('Starting link replacement: ' + newLink);
        
        let successCount = 0;
        let failCount = 0;
        
        for (let domainUrl of selectedDomains) {
            for (let oldUrl of selectedItems) {
                try {
                    updateDebugInfo(`Replacing ${oldUrl} with ${newLink} on ${domainUrl}...`);
                    
                    const response = await fetch('/ui/remote-sites/remote-api.php', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: `action=replace_link&domain=${encodeURIComponent(domainUrl)}&old_url=${encodeURIComponent(oldUrl)}&new_url=${encodeURIComponent(newLink)}`
                    });
                    
                    const data = await response.json();
                    updateDebugInfo(`Response from ${domainUrl}: ` + JSON.stringify(data));
                    
                    if (data.ok && data.replaced > 0) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    failCount++;
                    console.error('Ошибка замены на', domainUrl, error);
                    updateDebugInfo(`Error on ${domainUrl}: ${error.message}`);
                }
            }
        }
        
        let statusMessage = '';
        if (successCount > 0) {
            statusMessage += `✅ Успешно заменено: ${successCount}`;
        }
        if (failCount > 0) {
            statusMessage += (statusMessage ? ', ' : '') + `❌ Не удалось заменить: ${failCount}`;
        }
        
        showStatus(statusMessage || 'Операция завершена', successCount > 0 ? 'success' : 'error');
        loadContent();
    }
    
    function getFileIcon(fileName) {
        if (!fileName) return '📄';
        const ext = fileName.split('.').pop().toLowerCase();
        
        const icons = {
            'zip': '📦', 'rar': '📦', '7z': '📦',
            'pdf': '📕',
            'doc': '📘', 'docx': '📘',
            'xls': '📗', 'xlsx': '📗',
            'ppt': '📙', 'pptx': '📙',
            'mp3': '🎵', 'mp4': '🎬',
            'jpg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
            'txt': '📝'
        };
        
        return icons[ext] || '📄';
    }
    
    function showStatus(message, type = 'info') {
        const status = document.getElementById('rsStatus');
        status.className = 'rs-status ' + (type === 'info' ? '' : type);
        status.textContent = message;
        
        if (type !== 'info') {
            setTimeout(() => {
                status.textContent = '';
                status.className = '';
            }, 5000);
        }
    }
    
    function updateDebugInfo(message) {
        const debugContent = document.getElementById('rsDebugContent');
        if (debugContent) {
            const timestamp = new Date().toLocaleTimeString();
            debugContent.textContent += `[${timestamp}] ${message}\n`;
            debugContent.scrollTop = debugContent.scrollHeight;
        }
        console.log('[RS Debug]', message);
    }
    
    // Инициализация
    document.addEventListener('DOMContentLoaded', function() {
        addRemoteSitesButton();
    });
})();