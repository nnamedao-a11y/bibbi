/**
 * BIBI Cars - Copart DOM Ingestion (Content Script)
 * Парсит страницу Copart lot и отправляет данные в backend
 */

(function() {
  'use strict';
  
  // Проверка что это lot page
  if (!window.location.pathname.includes('/lot/')) {
    console.log('[BIBI Copart] Not a lot page, skipping');
    return;
  }
  
  console.log('[BIBI Copart] DOM Ingestion activated');
  
  // Utility functions
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
    
    // Try next sibling
    const next = labelNode.nextElementSibling;
    if (next && next.textContent) {
      return next.textContent.trim();
    }
    
    return labelNode.textContent.trim();
  }
  
  function collectImages() {
    // Get high-res images, filter out icons and logos
    const urls = Array.from(document.querySelectorAll('img'))
      .map((img) => img.src)
      .filter((src) => {
        if (!src || !src.startsWith('http')) return false;
        
        // Filter out small images, logos, icons
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
    
    // Try multiple selectors for each field (Copart changes layout)
    const data = {
      source: 'copart',
      lotNumber: lotNumber,
      sourceUrl: window.location.href,
      
      // Title
      title: document.title || 
             firstText(['h1', '.lot-title', '[data-uname="lotdetailTitle"]']) || 
             null,
      
      // VIN
      vin: firstText([
        '[data-uname="lotdetailVin"]',
        '[data-uname="lotdetail-VIN"]',
        '.vin-number'
      ]) || extractByLabel('vin'),
      
      // Bid info
      currentBid: firstText([
        '[data-uname="lotdetailCurrentBid"]',
        '[data-uname="lotdetailSaleInfoCurrentBid"]',
        '.current-bid'
      ]) || extractByLabel('current bid'),
      
      buyItNowPrice: firstText([
        '[data-uname="lotdetailBuyItNowPrice"]',
        '.buy-now-price'
      ]) || extractByLabel('buy it now'),
      
      // Vehicle details
      year: extractByLabel('year'),
      make: extractByLabel('make'),
      model: extractByLabel('model'),
      
      odometer: firstText([
        '[data-uname="lotdetailOdometer"]',
        '.odometer'
      ]) || extractByLabel('odometer'),
      
      // Damage
      primaryDamage: firstText([
        '[data-uname="lotdetailPrimaryDamage"]',
        '.primary-damage'
      ]) || extractByLabel('primary damage'),
      
      secondaryDamage: firstText([
        '[data-uname="lotdetailSecondaryDamage"]',
        '.secondary-damage'
      ]) || extractByLabel('secondary damage'),
      
      // Sale info
      saleDate: firstText([
        '[data-uname="lotdetailSaleInfoDate"]',
        '[data-uname="lotdetailSaleDate"]',
        '.sale-date'
      ]) || extractByLabel('sale date'),
      
      location: firstText([
        '[data-uname="lotdetailSaleInfoLocation"]',
        '[data-uname="lotdetailLocation"]',
        '.location'
      ]) || extractByLabel('location'),
      
      // Title
      titleStatus: firstText([
        '[data-uname="lotdetailTitleStatus"]',
        '[data-uname="lotdetailTitle"]',
        '.title-status'
      ]) || extractByLabel('title'),
      
      titleState: extractByLabel('title state'),
      
      // Other
      engine: extractByLabel('engine'),
      transmission: extractByLabel('transmission'),
      fuelType: extractByLabel('fuel'),
      color: extractByLabel('color'),
      bodyStyle: extractByLabel('body style'),
      driveType: extractByLabel('drive'),
      cylinders: extractByLabel('cylinders'),
      keys: extractByLabel('keys'),
      
      // Seller
      seller: extractByLabel('seller'),
      
      // Images
      images: collectImages(),
      
      // Metadata
      scrapedAt: new Date().toISOString()
    };
    
    return data;
  }
  
  function isValidLotData(data) {
    // Must have at least lot number OR vin OR images
    return !!(data.lotNumber || data.vin || (data.images && data.images.length > 0));
  }
  
  function sendParsedLot(data) {
    console.log('[BIBI Copart] Sending parsed lot:', data);
    
    chrome.runtime.sendMessage({
      action: 'copartLotParsed',
      payload: data
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[BIBI Copart] Send error:', chrome.runtime.lastError);
      } else {
        console.log('[BIBI Copart] Send response:', response);
      }
    });
  }
  
  function runParser() {
    try {
      const data = parseCopartLot();
      console.log('[BIBI Copart] Parsed lot data:', data);
      
      if (isValidLotData(data)) {
        sendParsedLot(data);
      } else {
        console.warn('[BIBI Copart] Parsed data is incomplete, skipping send');
      }
    } catch (error) {
      console.error('[BIBI Copart] Parser error:', error);
    }
  }
  
  // Debounced parsing
  let parseTimer = null;
  function scheduleParse() {
    if (parseTimer) clearTimeout(parseTimer);
    parseTimer = setTimeout(runParser, 2500);
  }
  
  // Initial parse after page load
  if (document.readyState === 'complete') {
    scheduleParse();
  } else {
    window.addEventListener('load', scheduleParse);
  }
  
  // Re-parse on DOM changes (for dynamic content)
  const observer = new MutationObserver(() => {
    scheduleParse();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[BIBI Copart] Parser initialized, waiting for page load...');
})();
