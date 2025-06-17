const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { scrapeWebsite } = require('./scraper');
const { generateAudit } = require('./generateAudit');
const { generatePPT, generateAIPoweredReport, GammaPPTGenerator } = require('./generatePPT');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Create directories if they don't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
const reportsDir = path.join(__dirname, 'reports');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// In-memory storage for audit data (in production, use a database)
const auditStorage = new Map();

// Routes
app.post('/api/submit-audit', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Starting audit for: ${url}`);

    // Step 1: Scrape the website
    const scrapedData = await scrapeWebsite(url);
    
    // Step 2: Generate AI audit
    const auditResults = await generateAudit(scrapedData);
    
    // Store the audit data
    const auditId = Date.now().toString();
    auditStorage.set(auditId, {
      url,
      scrapedData,
      auditResults,
      createdAt: new Date()
    });

    res.json({
      success: true,
      auditId,
      auditResults,
      screenshots: scrapedData.screenshots
    });

  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ 
      error: 'Failed to generate audit',
      details: error.message 
    });
  }
});

app.post('/api/generate-ppt', async (req, res) => {
  try {
    const { auditId } = req.body;
    
    if (!auditId || !auditStorage.has(auditId)) {
      return res.status(400).json({ error: 'Invalid audit ID' });
    }

    const auditData = auditStorage.get(auditId);
    
    // Generate PowerPoint report
    const pptPath = await generatePPT(auditData, { useGamma: true });
    console.log("Ppt gebrated=====;;",pptPath)
    
    
    res.json({
      success: true,
      downloadUrl: `https://cro-auditor-ai.vercel.app/${path.basename(pptPath?.filename)}`
    });

  } catch (error) {
    console.error('PPT generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PowerPoint',
      details: error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
//   console.log(`Make sure to set OPENAI_API_KEY in your .env file`);
});