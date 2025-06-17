const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function scrapeWebsite(url) {
  console.log(`Scraping website: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1200, height: 800 });
    
    // Start timing
    const startTime = Date.now();
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
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
    
    // Take screenshots
    const screenshots = await takeScreenshots(page, url);
    
    // Check mobile responsiveness
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE size
    const mobileScreenshot = await takeScreenshot(page, 'mobile-view', sanitizeFilename(new URL(url).hostname));
    screenshots.push(mobileScreenshot);
    
    // Reset viewport
    await page.setViewport({ width: 1200, height: 800 });
    
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
    await browser.close();
  }
}

async function takeScreenshots(page, url) {
  const screenshots = [];
  const domain = sanitizeFilename(new URL(url).hostname);
  
  // Full page screenshot
  const fullPageScreenshot = await takeScreenshot(page, 'full-page', domain);
  screenshots.push(fullPageScreenshot);
  
  // Hero section screenshot (top 600px)
  const heroFilename = `${domain}-hero-${Date.now()}.png`;
  const heroPath = path.join(__dirname, 'screenshots', heroFilename);
  
  await page.screenshot({
    path: heroPath,
    clip: { x: 0, y: 0, width: 1200, height: 600 }
  });
  
  screenshots.push({
    type: 'hero',
    filename: heroFilename,
    description: 'Hero section and above-the-fold content'
  });
  
  return screenshots;
}

async function takeScreenshot(page, type, domain) {
  const filename = `${domain}-${type}-${Date.now()}.png`;
  const filepath = path.join(__dirname, 'screenshots', filename);
  
  if (type === 'full-page') {
    await page.screenshot({
      path: filepath,
      fullPage: true
    });
  } else {
    await page.screenshot({
      path: filepath
    });
  }
  
  return {
    type,
    filename,
    description: `${type} screenshot`
  };
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