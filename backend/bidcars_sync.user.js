// ==UserScript==
// @name         BidCars Cookie Sync
// @namespace    bibi-cars
// @version      1.0
// @description  Automatically sync bid.cars cookies to BIBI CRM
// @match        https://bid.cars/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    
    const API_URL = 'https://car-dealer-pro-7.preview.emergentagent.com';
    
    // Get all cookies and send to backend
    function syncCookies() {
        const cookies = document.cookie.split(';').map(c => {
            const [name, value] = c.trim().split('=');
            return { name, value };
        });
        
        // Also get cf_clearance from visible cookies
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${API_URL}/api/bidcars/session/import`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                cookies: cookies,
                userAgent: navigator.userAgent
            }),
            onload: function(response) {
                console.log('[BIBI] Cookies synced:', response.responseText);
                alert('✅ Cookies синхронизированы с BIBI CRM!');
            },
            onerror: function(error) {
                console.error('[BIBI] Sync failed:', error);
            }
        });
    }
    
    // Add button to page
    const btn = document.createElement('button');
    btn.textContent = '🔄 Sync to BIBI';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:10px 20px;background:#000;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;';
    btn.onclick = syncCookies;
    document.body.appendChild(btn);
    
    console.log('[BIBI] Cookie sync ready');
})();
