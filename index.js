const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { scrapeWebsite } = require('./scraper');
const { generateAudit } = require('./generateAudit');
// Fix: Import the correct function name from your AI-enhanced generator
const { generatePPT } = require('./ai-enhanced-ppt'); // Use the file we created earlier
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (this works on Vercel with some limitations)
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Create directories if they don't exist (only in development)
if (process.env.NODE_ENV !== 'production') {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const reportsDir = path.join(__dirname, 'reports');

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
}

// In-memory storage for audit data
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
    const auditData = {
      url,
      scrapedData,
      auditResults,
      createdAt: new Date()
    };
    
    auditStorage.set(auditId, auditData);

    res.json({
      success: true,
      auditId,
      auditResults,
      screenshots: scrapedData.screenshots || []
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
    const { auditId, useAI = false, aiProvider = 'openai' } = req.body;
    
    if (!auditId || !auditStorage.has(auditId)) {
      return res.status(400).json({ error: 'Invalid audit ID' });
    }

    const auditData = auditStorage.get(auditId);
    
    console.log('Generating PPT for audit:', auditId);
    
    // Generate PowerPoint report with proper options
    const pptResult = await generatePPT(auditData, { 
      useAI: useAI,
      aiProvider: aiProvider 
    });
    
    console.log("PPT generated:", pptResult);
    
    if (!pptResult || !pptResult.filename) {
      throw new Error('Failed to generate PPT file');
    }
    
    // Fix: Construct proper download URL
    const downloadUrl = `/reports/${pptResult.filename}`;
    
    res.json({
      success: true,
      downloadUrl: downloadUrl,
      filename: pptResult.filename,
      type: pptResult.type || 'standard',
      aiEnhanced: pptResult.aiEnhanced || false
    });

  } catch (error) {
    console.error('PPT generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PowerPoint',
      details: error.message 
    });
  }
});

// Add a route to download files directly
app.get('/api/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, 'reports', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
    
  } catch (error) {
    console.error('Download route error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Add route to list generated reports
app.get('/api/reports', (req, res) => {
  try {
    const reportsDir = path.join(__dirname, 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      return res.json({ reports: [] });
    }
    
    const files = fs.readdirSync(reportsDir)
      .filter(file => file.endsWith('.pptx'))
      .map(file => ({
        filename: file,
        downloadUrl: `/api/download/${file}`,
        created: fs.statSync(path.join(reportsDir, file)).mtime
      }))
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ reports: files });
    
  } catch (error) {
    console.error('Reports list error:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'CRO Audit API Server',
    version: '1.0.0',
    endpoints: [
      'POST /api/submit-audit',
      'POST /api/generate-ppt', 
      'GET /api/download/:filename',
      'GET /api/reports',
      'GET /api/health'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set'}`);
});