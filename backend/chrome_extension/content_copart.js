/**
 * BIBI Cars — Copart Cookie Bridge (Content Script)
 * 
 * Runs on copart.com — auto-syncs session cookies to backend.
 * Does NOT parse DOM. Backend fetches data via Copart API using cookies.
 */

(function() {
  'use strict';
  
  if (window.__bibi_copart_injected) return;
  window.__bibi_copart_injected = true;
  
  let API_URL = 'https://car-dealer-pro-7.preview.emergentagent.com';
  
  // Load URL from storage
  try {
    chrome.storage.local.get('bibi_server_url', (result) => {
      if (result.bibi_server_url) API_URL = result.bibi_server_url;
    });
  } catch(e) {}
  
  console.log('[BIBI] Copart Cookie Bridge loaded');
  
  // Send cookies to backend
  async function syncCookies() {
    try {
      // Get cookies via background service worker (includes httpOnly)
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'getCookiesForDomain', domain: '.copart.com' },
          resolve
        );
      });
      
      const cookies = response?.cookies || [];
      console.log('[BIBI] Copart cookies to sync:', cookies.length);
      
      if (!cookies.length) {
        console.warn('[BIBI] No Copart cookies found');
        return { success: false, error: 'No cookies found' };
      }
      
      const res = await fetch(`${API_URL}/api/copart/session/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
          userAgent: navigator.userAgent,
        })
      });
      
      const data = await res.json();
      console.log('[BIBI] Copart sync result:', data);
      
      chrome.runtime.sendMessage({ 
        action: 'syncComplete', 
        success: data.success,
        source: 'COPART'
      });
      
      return data;
    } catch (error) {
      console.error('[BIBI] Copart sync error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Floating status indicator
  function createIndicator() {
    const el = document.createElement('div');
    el.id = 'bibi-copart-indicator';
    el.innerHTML = `
      <style>
        #bibi-copart-indicator {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        #bibi-copart-dot {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #1a1a1a;
          color: #fff;
          border: 2px solid #444;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          transition: all 0.3s;
        }
        #bibi-copart-dot:hover {
          transform: scale(1.1);
          border-color: #22c55e;
        }
        #bibi-copart-dot.ok {
          border-color: #22c55e;
          background: #14532d;
        }
        #bibi-copart-dot.syncing {
          border-color: #f59e0b;
          animation: bibi-blink 1s infinite;
        }
        @keyframes bibi-blink {
          0%,100% { opacity:1; } 50% { opacity:0.5; }
        }
        .bibi-copart-toast {
          position: fixed;
          bottom: 80px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          z-index: 999999;
          color: #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          animation: bibi-slide 0.3s ease;
        }
        .bibi-copart-toast.ok { background: #22c55e; }
        .bibi-copart-toast.err { background: #ef4444; }
        .bibi-copart-toast.info { background: #3b82f6; }
        @keyframes bibi-slide {
          from { opacity:0; transform:translateX(20px); }
          to { opacity:1; transform:translateX(0); }
        }
      </style>
      <div id="bibi-copart-dot" title="BIBI Copart Session">C</div>
    `;
    document.body.appendChild(el);
    return document.getElementById('bibi-copart-dot');
  }
  
  function toast(msg, type = 'info') {
    const old = document.querySelector('.bibi-copart-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = `bibi-copart-toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }
  
  // Init
  function init() {
    const dot = createIndicator();
    
    // Manual sync on click
    dot.addEventListener('click', async () => {
      dot.classList.add('syncing');
      dot.classList.remove('ok');
      toast('Синхронізація cookies...', 'info');
      
      const result = await syncCookies();
      dot.classList.remove('syncing');
      
      if (result.success) {
        dot.classList.add('ok');
        toast(`Session synced! ${result.cookies_stored} cookies`, 'ok');
      } else {
        toast(result.error || 'Sync failed', 'err');
      }
    });
    
    // Auto-sync after page loads
    setTimeout(async () => {
      dot.classList.add('syncing');
      const result = await syncCookies();
      dot.classList.remove('syncing');
      
      if (result.success) {
        dot.classList.add('ok');
        console.log('[BIBI] Copart auto-sync OK:', result.cookies_stored, 'cookies');
      } else {
        console.log('[BIBI] Copart auto-sync failed:', result.error);
      }
    }, 2000);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
