// ==UserScript==
// @name         Hide Visited Grid Items
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Скрывает посещенные предложения в #gridholder
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'visited_grid_urls';
    const MAX_HISTORY = 1000; // Максимальное количество записей в истории

    // Получаем посещенные URL из localStorage
    function getVisitedUrls() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    // Сохраняем посещенные URL в localStorage
    function saveVisitedUrl(url) {
        const visited = getVisitedUrls();
        if (!visited.includes(url)) {
            visited.push(url);
            // Ограничиваем размер истории
            if (visited.length > MAX_HISTORY) {
                visited.shift();
            }
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
            } catch (e) {
                console.warn('Не удалось сохранить в localStorage:', e);
            }
        }
    }

    // Проверяем, был ли URL посещен
    function isVisited(url) {
        const visited = getVisitedUrls();
        return visited.includes(url);
    }

    // Скрываем посещенные элементы в #gridholder
    function hideVisitedItems() {
        const gridholder = document.getElementById('gridholder');
        if (!gridholder) return;

        const gridBoxes = gridholder.querySelectorAll('.gridbox');
        gridBoxes.forEach(box => {
            const link = box.querySelector('a[href]');
            if (link && link.href) {
                // Получаем путь из href (относительный URL)
                const urlPath = link.getAttribute('href');
                if (urlPath && isVisited(urlPath)) {
                    box.style.display = 'none';
                }
            }
        });
    }

    // Отмечаем текущую страницу как посещенную при клике на ссылки в gridholder
    function setupClickTracking() {
        const gridholder = document.getElementById('gridholder');
        if (!gridholder) return;

        gridholder.addEventListener('click', function(e) {
            const link = e.target.closest('a[href]');
            if (link) {
                const urlPath = link.getAttribute('href');
                if (urlPath) {
                    saveVisitedUrl(urlPath);
                }
            }
        }, true);
    }

    // Отмечаем текущую страницу как посещенную при уходе со страницы
    function markCurrentPageAsVisited() {
        // Сохраняем referrer если он есть и относится к этому сайту
        if (document.referrer) {
            try {
                const referrerUrl = new URL(document.referrer);
                const currentHost = window.location.host;
                if (referrerUrl.host === currentHost) {
                    const path = referrerUrl.pathname + referrerUrl.search;
                    saveVisitedUrl(path);
                }
            } catch (e) {
                // Невалидный URL реферера
            }
        }
    }

    // Инициализация
    function init() {
        // Ждем загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                hideVisitedItems();
                setupClickTracking();
                markCurrentPageAsVisited();
            });
        } else {
            hideVisitedItems();
            setupClickTracking();
            markCurrentPageAsVisited();
        }

        // Также отмечаем страницу при закрытии/навигации
        window.addEventListener('beforeunload', markCurrentPageAsVisited);

        // Отслеживаем навигацию через History API (для SPA)
        const originalPushState = history.pushState;
        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            markCurrentPageAsVisited();
            setTimeout(hideVisitedItems, 100);
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            markCurrentPageAsVisited();
            setTimeout(hideVisitedItems, 100);
        };

        window.addEventListener('popstate', function() {
            setTimeout(hideVisitedItems, 100);
        });
    }

    init();
})();
