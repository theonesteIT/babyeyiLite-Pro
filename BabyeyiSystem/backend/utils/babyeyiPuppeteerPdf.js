/**
 * Render Babyeyi HTML to PDF via Puppeteer (Chromium print).
 */
const fs = require("fs");
const path = require("path");

function resolveChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  }
  if (process.platform === "darwin") {
    const mac = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
    for (const c of mac) {
      if (fs.existsSync(c)) return c;
    }
  }
  const linux = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const c of linux) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function fileToDataUrl(storedPath) {
  if (!storedPath) return null;
  const rel = String(storedPath).replace(/\\/g, "/").replace(/^\//, "");
  const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  if (!fs.existsSync(abs)) return null;
  const ext = path.extname(abs).slice(1).toLowerCase() || "png";
  const mime = ext === "jpg" ? "jpeg" : ext === "svg" ? "svg+xml" : ext;
  return `data:image/${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
}

async function launchBrowser() {
  const executablePath = resolveChromeExecutable();
  if (!executablePath) {
    throw new Error("Chrome/Chromium not found — set PUPPETEER_EXECUTABLE_PATH or install Google Chrome / Edge");
  }
  const puppeteer = require("puppeteer-core");
  return puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
}

async function renderPageToPdfBuffer(page) {
  await page.emulateMediaType("print");
  return page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
}

/** Render HTML string to PDF bytes (matches on-screen / print view). */
async function renderHtmlToPdfBuffer(html) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // data: URLs only — avoid networkidle0 (hangs / times out with inline images)
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(async () => {
      const imgs = [...document.images];
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                }),
        ),
      );
    });
    return await renderPageToPdfBuffer(page);
  } finally {
    await browser.close();
  }
}

async function renderHtmlToPdfFile(html, pdfDir, docId) {
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const filename = `babyeyi-${docId}-${Date.now()}.pdf`;
  const fullPath = path.join(pdfDir, filename);
  const webPath = `/${String(pdfDir).replace(/\\/g, "/").replace(/^\/?/, "")}${filename}`;

  const buffer = await renderHtmlToPdfBuffer(html);
  fs.writeFileSync(fullPath, buffer);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`PDF file not created at ${fullPath}`);
  }

  return { filePath: webPath, fileName: filename, fullPath };
}

function puppeteerAvailable() {
  return !!resolveChromeExecutable();
}

module.exports = {
  fileToDataUrl,
  renderHtmlToPdfBuffer,
  renderHtmlToPdfFile,
  puppeteerAvailable,
  resolveChromeExecutable,
};
