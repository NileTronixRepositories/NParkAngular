const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const ptp = require('pdf-to-printer');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');

const app = express();
const PORT = Number(process.env.PORT || 9100);

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const TEMP_DIR = path.join(__dirname, 'temp_prints');
fs.ensureDirSync(TEMP_DIR);
const LOG_PATH = path.join(__dirname, 'print-service.log');

function writeLog(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.join(' ')}\n`;
  fs.appendFileSync(LOG_PATH, line);
  console.log(...parts);
}

function errorToPayload(error) {
  return {
    error: error?.message || String(error),
    code: error?.code,
    stack: error?.stack,
  };
}

/**
 * Finds the local path to Chrome or Edge on Windows
 */
function findBrowserPath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

app.get('/api/Health', (req, res) => {
  res.send('OK');
});

app.post('/api/Print/html', async (req, res) => {
  const { printerName, htmlContent, jobName } = req.body;

  if (!htmlContent || !printerName) {
    return res.status(400).send('Missing htmlContent or printerName');
  }

  writeLog(`[PrintRequest] Job: ${jobName || 'unnamed'}, Printer: ${printerName}`);

  let browser;
  try {
    const timestamp = Date.now();
    const pdfPath = path.join(TEMP_DIR, `print_${timestamp}.pdf`);

    const executablePath = findBrowserPath();
    if (!executablePath) {
      throw new Error('Chrome or Edge not found on this system. Please install a browser.');
    }
    writeLog(`[Browser] Using executable: ${executablePath}`);

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const bodyHeight = await page.evaluate(() => {
      return document.documentElement.offsetHeight;
    });

    const heightInMm = Math.ceil(bodyHeight * 0.264583);

    await page.pdf({
      path: pdfPath,
      width: '80mm',
      height: `${heightInMm + 10}mm`,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });

    await browser.close();
    browser = null;

    writeLog(`[Print] Sending to printer: ${printerName}`);

    await ptp.print(pdfPath, {
      printer: printerName,
    });

    // Cleanup
    await fs.remove(pdfPath);

    writeLog(`[PrintSuccess] Job: ${jobName || 'unnamed'}`);
    res.json({ success: true });
  } catch (error) {
    writeLog('[PrintError]', JSON.stringify(errorToPayload(error)));
    if (browser) await browser.close();
    res.status(500).json(errorToPayload(error));
  }
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  NPark Local Print Service Running      `);
  console.log(`  URL: http://localhost:${PORT}          `);
  console.log(`  Target Port for Angular: 9100          `);
  console.log(`=========================================`);
});
