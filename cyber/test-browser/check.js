const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
    
    if (errors.length > 0) {
      console.log('--- CONSOLE ERRORS FOUND ---');
      errors.forEach(e => console.log(e));
    } else {
      console.log('--- NO CONSOLE ERRORS ---');
    }
    
    // Check if the root element has content
    const rootHtml = await page.$eval('#root', el => el.innerHTML).catch(() => 'No #root element found');
    console.log('Root element HTML snippet:', rootHtml.substring(0, 100));

  } catch (err) {
    console.error('Failed to load page:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
