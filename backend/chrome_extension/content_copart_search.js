/**
 * BIBI Cars - Copart VIN Search Automation
 * Автоматизация поиска VIN на Copart и переход на lot page
 */

(function() {
  'use strict';
  
  console.log('[BIBI Copart Search] Script loaded');
  
  // Listen for search commands from background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'executeVinSearch') {
      console.log('[BIBI Copart Search] Executing VIN search:', message.vin);
      
      executeVinSearch(message.vin, message.searchId)
        .then(sendResponse)
        .catch((error) => {
          console.error('[BIBI Copart Search] Error:', error);
          sendResponse({
            status: 'FAILED',
            error: error.message
          });
        });
      
      return true; // Keep channel open for async response
    }
  });
  
  /**
   * Execute VIN search on Copart
   */
  async function executeVinSearch(vin, searchId) {
    try {
      // Step 1: Find and fill search input
      console.log('[BIBI] Step 1: Finding search input...');
      
      const searchInput = await waitForElement(
        'input[name="searchCriteria"], input#input-search, input[type="text"][placeholder*="VIN"], input[type="text"][placeholder*="Lot"]',
        10000
      );
      
      if (!searchInput) {
        throw new Error('Search input not found');
      }
      
      // Clear and fill input
      searchInput.value = '';
      searchInput.focus();
      searchInput.value = vin;
      
      // Trigger input events
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log(`[BIBI] Step 2: Filled search input with VIN: ${vin}`);
      
      // Step 2: Find and click search button
      await wait(500);
      
      const searchButton = document.querySelector(
        'button[type="submit"], button.search-button, button[aria-label*="Search"], button:has(svg)'
      );
      
      if (!searchButton) {
        // Try form submit
        const form = searchInput.closest('form');
        if (form) {
          form.submit();
          console.log('[BIBI] Step 3: Submitted form');
        } else {
          // Fallback: press Enter
          searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          console.log('[BIBI] Step 3: Pressed Enter on input');
        }
      } else {
        searchButton.click();
        console.log('[BIBI] Step 3: Clicked search button');
      }
      
      // Step 3: Wait for results page to load
      console.log('[BIBI] Step 4: Waiting for results...');
      await wait(3000);
      
      // Step 4: Check if results exist
      const noResultsMsg = document.querySelector('.no-results, .no-data, [data-uname="noResults"]');
      
      if (noResultsMsg) {
        console.log('[BIBI] No results found');
        return {
          status: 'NOT_FOUND',
          error: 'VIN not found on Copart'
        };
      }
      
      // Step 5: Find first result link
      const firstResultLink = document.querySelector(
        'a[href*="/lot/"], .result-row a, .vehicle-card a, [data-uname="lotsearchLotimage"] a'
      );
      
      if (!firstResultLink) {
        console.log('[BIBI] No result links found');
        return {
          status: 'NOT_FOUND',
          error: 'No lots found in search results'
        };
      }
      
      const lotUrl = firstResultLink.href;
      console.log('[BIBI] Step 5: Found lot URL:', lotUrl);
      
      // Step 6: Navigate to lot page
      window.location.href = lotUrl;
      
      // Step 7: Wait for lot page to load and parse
      console.log('[BIBI] Step 6: Waiting for lot page to load...');
      await wait(3000);
      
      // Step 8: Parse lot page using existing parser logic
      const lotData = parseCopartLot();
      
      if (!lotData || !isValidLotData(lotData)) {
        throw new Error('Failed to parse lot data');
      }
      
      console.log('[BIBI] Step 7: Lot data parsed successfully');
      
      return {
        status: 'FOUND',
        vehicleData: lotData
      };
      
    } catch (error) {
      console.error('[BIBI] Search automation error:', error);
      return {
        status: 'FAILED',
        error: error.message
      };
    }
  }
  
  /**
   * Wait for element to appear
   */
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }
  
  /**
   * Wait helper
   */
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // LOT PAGE PARSER (from existing content_copart_dom.js)
  // ═══════════════════════════════════════════════════════════════════
  
  function text(selector) {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : null;
  }
  
  function firstText(selectors) {
    for (const selector of selectors) {
      const value = text(selector);
      if (value) return value;
    }
    return null;
  }
  
  function extractByLabel(labelText) {
    const nodes = Array.from(document.querySelectorAll('div, span, li, td, dt, dd'));
    const labelNode = nodes.find((n) =>
      n.textContent && n.textContent.trim().toLowerCase().includes(labelText.toLowerCase())
    );
    
    if (!labelNode) return null;
    
    const next = labelNode.nextElementSibling;
    if (next && next.textContent) {
      return next.textContent.trim();
    }
    
    return labelNode.textContent.trim();
  }
  
  function collectImages() {
    const urls = Array.from(document.querySelectorAll('img'))
      .map((img) => img.src)
      .filter((src) => {
        if (!src || !src.startsWith('http')) return false;
        const url = src.toLowerCase();
        if (url.includes('logo') || url.includes('icon')) return false;
        if (url.includes('thumbnail')) return false;
        if (url.match(/\d+x\d+/) && parseInt(url.match(/(\d+)x/)[1]) < 200) return false;
        return true;
      });
    
    return [...new Set(urls)];
  }
  
  function getLotNumberFromUrl() {
    const match = window.location.pathname.match(/\/lot\/(\d+)/);
    return match ? match[1] : null;
  }
  
  function parseCopartLot() {
    const lotNumber = getLotNumberFromUrl();
    
    const data = {
      source: 'copart',
      lotNumber: lotNumber,
      sourceUrl: window.location.href,
      title: document.title || firstText(['h1', '.lot-title', '[data-uname="lotdetailTitle"]']) || null,
      vin: firstText(['[data-uname="lotdetailVin"]', '[data-uname="lotdetail-VIN"]', '.vin-number']) || extractByLabel('vin'),
      currentBid: firstText(['[data-uname="lotdetailCurrentBid"]', '[data-uname="lotdetailSaleInfoCurrentBid"]', '.current-bid']) || extractByLabel('current bid'),
      buyItNowPrice: firstText(['[data-uname="lotdetailBuyItNowPrice"]', '.buy-now-price']) || extractByLabel('buy it now'),
      year: extractByLabel('year'),
      make: extractByLabel('make'),
      model: extractByLabel('model'),
      odometer: firstText(['[data-uname="lotdetailOdometer"]', '.odometer']) || extractByLabel('odometer'),
      primaryDamage: firstText(['[data-uname="lotdetailPrimaryDamage"]', '.primary-damage']) || extractByLabel('primary damage'),
      secondaryDamage: firstText(['[data-uname="lotdetailSecondaryDamage"]', '.secondary-damage']) || extractByLabel('secondary damage'),
      saleDate: firstText(['[data-uname="lotdetailSaleInfoDate"]', '[data-uname="lotdetailSaleDate"]', '.sale-date']) || extractByLabel('sale date'),
      location: firstText(['[data-uname="lotdetailSaleInfoLocation"]', '[data-uname="lotdetailLocation"]', '.location']) || extractByLabel('location'),
      titleStatus: firstText(['[data-uname="lotdetailTitleStatus"]', '[data-uname="lotdetailTitle"]', '.title-status']) || extractByLabel('title'),
      titleState: extractByLabel('title state'),
      engine: extractByLabel('engine'),
      transmission: extractByLabel('transmission'),
      fuelType: extractByLabel('fuel'),
      color: extractByLabel('color'),
      bodyStyle: extractByLabel('body style'),
      driveType: extractByLabel('drive'),
      cylinders: extractByLabel('cylinders'),
      keys: extractByLabel('keys'),
      seller: extractByLabel('seller'),
      images: collectImages(),
      scrapedAt: new Date().toISOString()
    };
    
    return data;
  }
  
  function isValidLotData(data) {
    return !!(data.lotNumber || data.vin || (data.images && data.images.length > 0));
  }
  
})();
