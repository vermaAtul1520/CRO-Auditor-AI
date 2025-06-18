const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function scrapeWebsite(url) {
  console.log(`Scraping website: ${url}`);
  
  let browser;
  
  try {
    // Detect environment - Vercel vs local
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    
    if (isLocal) {
      // Local development - use regular puppeteer
      try {
        const puppeteerFull = require('puppeteer');
        browser = await puppeteerFull.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      } catch (error) {
        console.log('Puppeteer not found, using puppeteer-core with local chromium');
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }
    } else {
      // Production/Vercel - use optimized chromium
      console.log('Using @sparticuz/chromium for production');
      
      // Optimized chrome args for Vercel serverless
      const chromeArgs = [
        ...chromium.args,
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-background-networking',
        '--disable-background-sync',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Speed up by not loading images
        '--disable-javascript', // We don't need JS execution for basic scraping
        '--font-render-hinting=none'
      ];

      browser = await puppeteer.launch({
        args: chromeArgs,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    }
    
    const page = await browser.newPage();
    
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1200, height: 800 });
    
    // Set request interception to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block unnecessary resources to speed up loading
      if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Start timing
    const startTime = Date.now();
    
    // Navigate to the page with shorter timeout for Vercel
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', // Faster than networkidle2
      timeout: 15000 // Reduced timeout for Vercel limits
    });
    
    const loadTime = Date.now() - startTime;
    
    // Extract basic page data
    const pageData = await page.evaluate(() => {
      // Get meta information
      const title = document.title;
      const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
      const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
      
      // Get headings
      const headings = {
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
        h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim())
      };
      
      // Get CTA buttons and links
      const ctas = Array.from(document.querySelectorAll('button, a[href], input[type="submit"]'))
        .map(el => ({
          text: el.textContent.trim(),
          type: el.tagName.toLowerCase(),
          href: el.href || null,
          classes: el.className
        }))
        .filter(cta => cta.text.length > 0)
        .slice(0, 20); // Limit to first 20 CTAs
      
      // Get form elements
      const forms = Array.from(document.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          required: input.required
        }))
      }));
      
      // Get images
      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height
      })).slice(0, 10); // Limit to first 10 images
      
      // Get page text content (first 2000 characters)
      const textContent = document.body.textContent.trim().substring(0, 2000);
      
      // Check for trust signals
      const trustSignals = {
        testimonials: document.querySelectorAll('[class*="testimonial"], [class*="review"]').length,
        certifications: document.querySelectorAll('[class*="cert"], [class*="badge"], [class*="award"]').length,
        socialProof: document.querySelectorAll('[class*="social"], [href*="facebook"], [href*="twitter"], [href*="linkedin"]').length,
        securityBadges: document.querySelectorAll('[class*="secure"], [class*="ssl"], [class*="trust"]').length
      };
      
      return {
        title,
        metaDescription,
        metaKeywords,
        headings,
        ctas,
        forms,
        images,
        textContent,
        trustSignals,
        url: window.location.href
      };
    });
    
    // Take screenshots with optimization for Vercel
    const screenshots = await takeScreenshots(page, url);
    
    // Check mobile responsiveness
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE size
    const mobileScreenshot = await takeScreenshot(page, 'mobile-view', sanitizeFilename(new URL(url).hostname));
    screenshots.push(mobileScreenshot);
    
    const scrapedData = {
      ...pageData,
      loadTime,
      screenshots,
      scrapedAt: new Date().toISOString()
    };
    
    console.log(`Scraping completed for ${url}`);
    return scrapedData;
    
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function takeScreenshots(page, url) {
  const screenshots = [];
  const domain = sanitizeFilename(new URL(url).hostname);
  
  try {
    // Full page screenshot as base64 with compression
    const fullPageBuffer = await page.screenshot({
      fullPage: true,
      type: 'jpeg', // Use JPEG for smaller file size
      quality: 70,   // Reduce quality for smaller size
      encoding: 'binary'
    });
    
    screenshots.push({
      type: 'full-page',
      data: fullPageBuffer.toString('base64'),
      description: 'Full page screenshot'
    });
    
    // Hero section screenshot (top 600px) as base64
    const heroBuffer = await page.screenshot({
      clip: { x: 0, y: 0, width: 1200, height: 600 },
      type: 'jpeg',
      quality: 70,
      encoding: 'binary'
    });
    
    screenshots.push({
      type: 'hero',
      data: heroBuffer.toString('base64'),
      description: 'Hero section and above-the-fold content'
    });
    
  } catch (error) {
    console.error('Screenshot error:', error);
    // Return empty array if screenshots fail
    screenshots.push({
      type: 'error',
      data: null,
      description: 'Screenshot failed: ' + error.message
    });
  }
  
  return screenshots;
}

async function takeScreenshot(page, type, domain) {
  try {
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: 70,
      encoding: 'binary'
    });
    
    return {
      type,
      data: buffer.toString('base64'),
      description: `${type} screenshot`
    };
  } catch (error) {
    console.error(`${type} screenshot error:`, error);
    return {
      type,
      data: null,
      description: `${type} screenshot failed: ${error.message}`
    };
  }
}

// Helper function to sanitize filenames for cross-platform compatibility
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9\-_.]/gi, '-')  // Replace invalid chars with dash
    .replace(/-+/g, '-')              // Replace multiple dashes with single dash
    .replace(/^-|-$/g, '')            // Remove leading/trailing dashes
    .toLowerCase();
}

module.exports = { scrapeWebsite };