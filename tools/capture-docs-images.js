#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'docs', 'assets');

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const target = path.resolve(ROOT, relative);
    if (target !== ROOT && !target.startsWith(`${ROOT}${path.sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    fs.readFile(target, (error, data) => {
      if (error) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': target.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
      response.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

async function dismissIfVisible(page, selector, action) {
  const visible = await page.locator(selector).isVisible().catch(() => false);
  if (visible) await page.locator(action).click();
}

async function reachPlay(page, url) {
  await page.goto(url, { waitUntil: 'load', timeout: 15000 });
  await page.waitForFunction(() => window.CR && window.BUILD_ID === 'farfieldsmooth1' && typeof CR.startRun === 'function', null, { timeout: 10000 });
  await dismissIfVisible(page, '#porthint', '#portplay');
  await page.evaluate(() => CR.startRun(42));
  await page.waitForFunction(() => window.CR && CR.state === CR.STATE.PLAY, null, { timeout: 10000 });
  await dismissIfVisible(page, '#cronboard.show', '#cronboardok');
  await page.waitForFunction(() => CR.state === CR.STATE.PLAY && !CR.paused && !CR.onboardingOpen, null, { timeout: 5000 });
  await page.waitForTimeout(750);
}

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const local = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const socialContext = await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
    const socialPage = await socialContext.newPage();
    await socialPage.goto(local.url, { waitUntil: 'load', timeout: 15000 });
    await socialPage.waitForFunction(() => window.CR && window.BUILD_ID === 'farfieldsmooth1', null, { timeout: 10000 });
    await socialPage.waitForTimeout(750);
    await socialPage.screenshot({ path: path.join(OUTPUT, 'social-preview.png') });
    await socialContext.close();

    const heroContext = await browser.newContext({ viewport: { width: 1152, height: 640 }, deviceScaleFactor: 1 });
    const heroPage = await heroContext.newPage();
    await reachPlay(heroPage, local.url);
    await heroPage.screenshot({ path: path.join(OUTPUT, 'readme-hero.png') });
    await heroContext.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await reachPlay(mobilePage, `${local.url}?mobile=on&portraitlayout=1`);
    await mobilePage.screenshot({ path: path.join(OUTPUT, 'mobile-interface.png') });
    await mobileContext.close();
  } finally {
    await browser.close();
    await new Promise(resolve => local.server.close(resolve));
  }

  for (const name of ['readme-hero.png', 'mobile-interface.png', 'social-preview.png']) {
    const file = path.join(OUTPUT, name);
    const stat = fs.statSync(file);
    if (stat.size < 10000) throw new Error(`capture is unexpectedly small: ${name} (${stat.size} bytes)`);
    console.log(`${name}: ${stat.size} bytes`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
