/**
 * BIBI Cars Parser - bid.cars Content Script
 * Runs on bid.cars pages - syncs cookies automatically
 */

(function() {
  'use strict';
  
  if (window.__bibi_bidcars_injected) return;
  window.__bibi_bidcars_injected = true;
  
  const API_URL = 'https://car-dealer-pro-7.preview.emergentagent.com';
  
  console.log('[BIBI] bid.cars content script loaded');
  
  // Get all cookies including httpOnly via chrome.cookies API
  async function getAllCookies() {
    return new Promise((resolve) => {
      // Try to get cookies via background script
      chrome.runtime.sendMessage({ action: 'getCookiesForDomain', domain: 'bid.cars' }, (response) => {
        if (response && response.cookies) {
          resolve(response.cookies);
        } else {
          // Fallback to document.cookie (won't include httpOnly)
          const cookies = document.cookie.split(';').map(c => {
            const [name, ...valueParts] = c.trim().split('=');
            return { name: name.trim(), value: valueParts.join('=') };
          }).filter(c => c.name);
          resolve(cookies);
        }
      });
    });
  }
  
  // Sync cookies to backend
  async function syncCookies() {
    try {
      const cookies = await getAllCookies();
      console.log('[BIBI] Cookies to sync:', cookies.length);
      
      if (!cookies.length) {
        console.warn('[BIBI] No cookies found');
        return { success: false, error: 'No cookies found' };
      }
      
      const response = await fetch(`${API_URL}/api/bidcars/session/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookies: cookies,
          userAgent: navigator.userAgent,
          pageUrl: window.location.href,
          timestamp: new Date().toISOString()
        })
      });
      
      const data = await response.json();
      console.log('[BIBI] Sync result:', data);
      
      // Notify background script
      chrome.runtime.sendMessage({ 
        action: 'syncComplete', 
        success: data.success,
        source: 'BIDCARS'
      });
      
      return data;
    } catch (error) {
      console.error('[BIBI] Sync error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Parse current page
  async function parsePage() {
    try {
      const response = await fetch(`${API_URL}/api/bidcars/proxy/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: window.location.href })
      });
      
      const data = await response.json();
      console.log('[BIBI] Parse result:', data);
      return data;
    } catch (error) {
      console.error('[BIBI] Parse error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Create floating button
  function createFloatingButton() {
    const btn = document.createElement('div');
    btn.id = 'bibi-floating-btn';
    btn.innerHTML = `
      <style>
        #bibi-floating-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #bibi-main-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #000 0%, #333 100%);
          color: #fff;
          border: 2px solid #444;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          transition: all 0.3s;
        }
        #bibi-main-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(0,0,0,0.5);
          border-color: #22c55e;
        }
        #bibi-main-btn.synced {
          border-color: #22c55e;
          background: linear-gradient(135deg, #14532d 0%, #166534 100%);
        }
        #bibi-menu {
          position: absolute;
          bottom: 75px;
          right: 0;
          background: #1a1a1a;
          border-radius: 16px;
          padding: 12px;
          min-width: 240px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          display: none;
          border: 1px solid #333;
        }
        #bibi-menu.show {
          display: block;
          animation: bibi-fade-in 0.2s ease;
        }
        @keyframes bibi-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bibi-menu-item {
          padding: 14px 16px;
          border-radius: 12px;
          cursor: pointer;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: background 0.2s;
          margin-bottom: 4px;
        }
        .bibi-menu-item:hover {
          background: #333;
        }
        .bibi-menu-item:last-child {
          margin-bottom: 0;
        }
        .bibi-menu-item svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
        .bibi-status {
          padding: 10px 16px;
          font-size: 11px;
          color: #888;
          border-top: 1px solid #333;
          margin-top: 8px;
          text-align: center;
        }
        .bibi-status.success {
          color: #22c55e;
        }
        .bibi-status.error {
          color: #ef4444;
        }
        .bibi-toast {
          position: fixed;
          bottom: 100px;
          right: 20px;
          background: #22c55e;
          color: #fff;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          z-index: 999999;
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
          animation: bibi-slide-in 0.3s ease;
        }
        .bibi-toast.error {
          background: #ef4444;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
        }
        @keyframes bibi-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .bibi-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff40;
          border-top-color: #fff;
          border-radius: 50%;
          animation: bibi-spin 0.8s linear infinite;
        }
        @keyframes bibi-spin {
          to { transform: rotate(360deg); }
        }
      </style>
      <div id="bibi-menu">
        <div class="bibi-menu-item" id="bibi-sync">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          Синхронізувати Cookies
        </div>
        <div class="bibi-menu-item" id="bibi-parse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="2"/>
          </svg>
          Парсити цю сторінку
        </div>
        <div class="bibi-status" id="bibi-status">BIBI Cars Parser v2.0</div>
      </div>
      <button id="bibi-main-btn" title="BIBI Cars Parser">🚗</button>
    `;
    document.body.appendChild(btn);
    
    const mainBtn = document.getElementById('bibi-main-btn');
    const menu = document.getElementById('bibi-menu');
    const statusEl = document.getElementById('bibi-status');
    
    // Toggle menu
    mainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });
    
    document.addEventListener('click', () => {
      menu.classList.remove('show');
    });
    
    // Sync cookies
    document.getElementById('bibi-sync').addEventListener('click', async () => {
      menu.classList.remove('show');
      showToast('Синхронізація...');
      statusEl.textContent = 'Синхронізація...';
      statusEl.className = 'bibi-status';
      
      const result = await syncCookies();
      
      if (result.success) {
        mainBtn.classList.add('synced');
        statusEl.textContent = '✓ Cookies синхронізовано!';
        statusEl.className = 'bibi-status success';
        showToast('✓ Cookies синхронізовано!');
      } else {
        statusEl.textContent = '✗ ' + (result.error || 'Помилка');
        statusEl.className = 'bibi-status error';
        showToast('✗ ' + (result.error || 'Помилка'), true);
      }
    });
    
    // Parse page
    document.getElementById('bibi-parse').addEventListener('click', async () => {
      menu.classList.remove('show');
      showToast('Парсинг сторінки...');
      
      const result = await parsePage();
      
      if (result.success) {
        const vin = result.vin || result.data?.vin;
        showToast(`✓ Спарсено: ${vin || 'OK'}`);
      } else {
        showToast('✗ ' + (result.error || 'Помилка'), true);
      }
    });
    
    return { mainBtn, statusEl };
  }
  
  // Show toast
  function showToast(message, isError = false) {
    const existing = document.querySelector('.bibi-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'bibi-toast' + (isError ? ' error' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3500);
  }
  
  // Initialize
  function init() {
    const { mainBtn, statusEl } = createFloatingButton();
    
    // Auto-sync on load
    setTimeout(async () => {
      console.log('[BIBI] Auto-syncing cookies...');
      const result = await syncCookies();
      
      if (result.success) {
        mainBtn.classList.add('synced');
        statusEl.textContent = '✓ Авто-синхронізація OK';
        statusEl.className = 'bibi-status success';
        console.log('[BIBI] Auto-sync successful');
      } else {
        statusEl.textContent = 'Натисніть для синхронізації';
        console.log('[BIBI] Auto-sync failed:', result.error);
      }
    }, 2000);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
