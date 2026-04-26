/**
 * BIBI Cars Parser - Popup Script
 */

const DEFAULT_API_URL = 'https://car-dealer-pro-7.preview.emergentagent.com';
let API_URL = DEFAULT_API_URL;

const messageEl = document.getElementById('message');
const currentPageEl = document.getElementById('currentPage');
const currentUrlEl = document.getElementById('currentUrl');

// bid.cars elements
const bidcarsStatus = document.getElementById('bidcars-status');
const bidcarsInfo = document.getElementById('bidcars-info');
const bidcarsSyncBtn = document.getElementById('bidcars-sync');
const bidcarsParseBtn = document.getElementById('bidcars-parse');

// Copart elements
const copartStatus = document.getElementById('copart-status');
const copartInfo = document.getElementById('copart-info');
const copartSyncBtn = document.getElementById('copart-sync');

// Server URL
const serverUrlInput = document.getElementById('server-url');
const saveUrlBtn = document.getElementById('save-url');

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message message-${type}`;
  messageEl.classList.remove('hidden');
  setTimeout(() => messageEl.classList.add('hidden'), 5000);
}

function setLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Зачекайте...';
  } else {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Check current tab
async function checkCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    if (tab.url.includes('bid.cars') || tab.url.includes('carfast.express') || tab.url.includes('copart.com')) {
      currentPageEl.classList.remove('hidden');
      const shortUrl = tab.url.length > 50 ? tab.url.substring(0, 50) + '...' : tab.url;
      currentUrlEl.textContent = shortUrl;
      return tab.url;
    }
  }
  return null;
}

// ═══════════════════════════════════════
// COPART
// ═══════════════════════════════════════

async function checkCopartStatus() {
  try {
    const response = await fetch(`${API_URL}/api/copart/session/status`);
    const data = await response.json();
    
    if (data.active) {
      copartStatus.textContent = 'Активний';
      copartStatus.className = 'status-badge status-active';
      copartInfo.textContent = `Cookies: ${data.cookies_count} | Запитів: ${data.requests_count} (OK: ${data.success_count})`;
    } else {
      copartStatus.textContent = 'Не синхронізовано';
      copartStatus.className = 'status-badge status-inactive';
      copartInfo.textContent = 'Відкрийте copart.com, залогіньтесь, натисніть "Синхронізувати"';
    }
  } catch (error) {
    copartStatus.textContent = 'Офлайн';
    copartStatus.className = 'status-badge status-inactive';
    copartInfo.textContent = error.message;
  }
}

async function syncCopart() {
  setLoading(copartSyncBtn, true, 'Синхронізувати Session');
  
  try {
    // Get cookies via background script
    const cookieResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCookiesForDomain', domain: '.copart.com' }, resolve);
    });
    
    const cookies = cookieResponse?.cookies || [];
    
    if (!cookies.length) {
      // Try without dot prefix
      const cookieResponse2 = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getCookiesForDomain', domain: 'copart.com' }, resolve);
      });
      cookies.push(...(cookieResponse2?.cookies || []));
    }
    
    if (!cookies.length) {
      showMessage('Cookies не знайдено. Відкрийте copart.com та залогіньтесь.', 'error');
      setLoading(copartSyncBtn, false, 'Синхронізувати Session');
      return;
    }
    
    const response = await fetch(`${API_URL}/api/copart/session/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
        userAgent: navigator.userAgent
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showMessage(`Session synced! ${data.cookies_stored} cookies. Backend ready.`, 'success');
      await checkCopartStatus();
    } else {
      showMessage(data.error || 'Помилка', 'error');
    }
  } catch (error) {
    showMessage('Помилка: ' + error.message, 'error');
  }
  
  setLoading(copartSyncBtn, false, 'Синхронізувати Session');
}

// ═══════════════════════════════════════
// BID.CARS
// ═══════════════════════════════════════

async function checkBidcarsStatus() {
  try {
    const response = await fetch(`${API_URL}/api/bidcars/session/status`);
    const data = await response.json();
    
    if (data.active) {
      bidcarsStatus.textContent = 'Активний';
      bidcarsStatus.className = 'status-badge status-active';
      bidcarsInfo.textContent = `Запитів: ${data.requests_count || 0}`;
    } else {
      bidcarsStatus.textContent = 'Неактивний';
      bidcarsStatus.className = 'status-badge status-inactive';
      bidcarsInfo.textContent = 'Відкрийте bid.cars та натисніть кнопку';
    }
  } catch (error) {
    bidcarsStatus.textContent = 'Помилка';
    bidcarsStatus.className = 'status-badge status-inactive';
    bidcarsInfo.textContent = error.message;
  }
}

async function syncBidcars() {
  setLoading(bidcarsSyncBtn, true, 'Синхронізувати Cookies');
  
  try {
    const cookieResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCookiesForDomain', domain: 'bid.cars' }, resolve);
    });
    
    const cookies = cookieResponse?.cookies || [];
    
    if (!cookies.length) {
      showMessage('Cookies не знайдено. Відкрийте bid.cars спочатку.', 'error');
      setLoading(bidcarsSyncBtn, false, 'Синхронізувати Cookies');
      return;
    }
    
    const response = await fetch(`${API_URL}/api/bidcars/session/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
        userAgent: navigator.userAgent
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showMessage('Cookies синхронізовано!', 'success');
      await checkBidcarsStatus();
    } else {
      showMessage(data.error || 'Помилка', 'error');
    }
  } catch (error) {
    showMessage(error.message, 'error');
  }
  
  setLoading(bidcarsSyncBtn, false, 'Синхронізувати Cookies');
}

async function parseBidcars() {
  const currentUrl = await checkCurrentTab();
  
  if (!currentUrl || !currentUrl.includes('bid.cars')) {
    showMessage('Відкрийте сторінку лота на bid.cars', 'error');
    return;
  }
  
  setLoading(bidcarsParseBtn, true, 'Парсити поточну сторінку');
  
  try {
    const response = await fetch(`${API_URL}/api/bidcars/proxy/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const vin = data.vin || data.data?.vin;
      showMessage(`Спарсено: ${vin || 'OK'}`, 'success');
    } else {
      showMessage(data.error || 'Помилка. Спробуйте синхронізувати cookies.', 'error');
    }
  } catch (error) {
    showMessage(error.message, 'error');
  }
  
  setLoading(bidcarsParseBtn, false, 'Парсити поточну сторінку');
}

// Event listeners
bidcarsSyncBtn.addEventListener('click', syncBidcars);
bidcarsParseBtn.addEventListener('click', parseBidcars);
copartSyncBtn.addEventListener('click', syncCopart);

// Save URL
saveUrlBtn.addEventListener('click', async () => {
  const url = serverUrlInput.value.trim().replace(/\/+$/, '');
  if (!url) return;
  API_URL = url;
  await chrome.storage.local.set({ bibi_server_url: url });
  showMessage(`Server URL saved: ${url}`, 'success');
  // Re-check statuses with new URL
  await Promise.all([checkCopartStatus(), checkBidcarsStatus()]);
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Restore server URL from storage
  const stored = await chrome.storage.local.get('bibi_server_url');
  if (stored.bibi_server_url) {
    API_URL = stored.bibi_server_url;
    serverUrlInput.value = API_URL;
  }
  
  await checkCurrentTab();
  await Promise.all([
    checkCopartStatus(),
    checkBidcarsStatus(),
  ]);
});
