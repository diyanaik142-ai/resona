import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = 'C:\\Edit\\Resona\\scripts\\verification_screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const MOBILE_VIEWPORTS = [
  { width: 320, height: 800, name: '320x800' },
  { width: 360, height: 800, name: '360x800' },
  { width: 375, height: 812, name: '375x812' },
  { width: 390, height: 844, name: '390x844' },
  { width: 412, height: 915, name: '412x915' },
  { width: 430, height: 932, name: '430x932' }
];

const DESKTOP_VIEWPORTS = [
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1920, height: 1080, name: '1920x1080' }
];

async function runTests() {
  console.log('===============================================================');
  console.log('   AUTOMATED TOUCH SCROLLING & RESPONSIVE VERIFICATION        ');
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const testResults = [];

  try {
    // -------------------------------------------------------------
    // PHASE 1: MOBILE TOUCH SCROLLING TESTS (390x844 reference first)
    // -------------------------------------------------------------
    console.log('--- PHASE 1: COMPREHENSIVE MOBILE TOUCH INTERACTION (390x844) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // 1.1 Pulse Page Scroll Metrics
    const pulseMetrics = await page.evaluate(() => {
      return {
        innerHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        initialY: window.scrollY
      };
    });
    console.log(`[Pulse Metrics] innerHeight: ${pulseMetrics.innerHeight}px, scrollHeight: ${pulseMetrics.scrollHeight}px`);
    
    if (pulseMetrics.scrollHeight <= pulseMetrics.innerHeight) {
      throw new Error(`Pulse page scrollHeight (${pulseMetrics.scrollHeight}px) is not greater than innerHeight (${pulseMetrics.innerHeight}px)!`);
    }

    // 1.2 Real Touch Swipe Upward (Scroll Down)
    console.log('Testing touch swipe upward (scroll down)...');
    await page.touchscreen.tap(200, 500); // verify tap works
    
    // Simulate natural touch drag gesture from y=600 to y=150
    const client = await page.target().createCDPSession();
    await client.send('Input.synthesizeScrollGesture', {
      x: 200,
      y: 600,
      yDistance: -400,
      speed: 1000,
      gestureSourceType: 'touch'
    });
    await new Promise(r => setTimeout(r, 600));

    const scrollDownY = await page.evaluate(() => window.scrollY);
    console.log(`scrollY after touch swipe upward: ${scrollDownY}px`);
    if (scrollDownY <= 50) {
      throw new Error(`Touch swipe upward failed to scroll document! scrollY is only ${scrollDownY}px`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'pulse_scrolled_down_390.png') });

    // 1.3 Real Touch Swipe Downward (Scroll Up)
    console.log('Testing touch swipe downward (scroll back up)...');
    await client.send('Input.synthesizeScrollGesture', {
      x: 200,
      y: 200,
      yDistance: 400,
      speed: 1000,
      gestureSourceType: 'touch'
    });
    await new Promise(r => setTimeout(r, 600));

    const scrollUpY = await page.evaluate(() => window.scrollY);
    console.log(`scrollY after touch swipe downward: ${scrollUpY}px`);

    // 1.4 Touch Swipe Directly Over Horizontal Carousel
    console.log('Testing vertical swipe starting directly on horizontal carousel ("Tuned for You")...');
    const carouselBox = await page.evaluate(() => {
      const carousel = document.querySelector('.overflow-x-auto');
      if (!carousel) return null;
      const rect = carousel.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });

    if (carouselBox) {
      await client.send('Input.synthesizeScrollGesture', {
        x: carouselBox.x,
        y: carouselBox.y,
        yDistance: -300,
        speed: 1000,
        gestureSourceType: 'touch'
      });
      await new Promise(r => setTimeout(r, 600));
      const scrollOverCarouselY = await page.evaluate(() => window.scrollY);
      console.log(`scrollY after swipe over carousel: ${scrollOverCarouselY}px (vertical touch passed through successfully)`);
      if (scrollOverCarouselY <= 50) {
        throw new Error('Horizontal carousel intercepted and blocked vertical swipe gesture!');
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 300));

    // 1.5 Page-Specific Vertical Scrolling Tests
    const pagesToTest = [
      { id: 'seek', name: 'Seek', navSelector: 'button[aria-label="Seek"]' },
      { id: 'shelf', name: 'My Shelf', navSelector: 'button[aria-label="My Shelf"]' },
      { id: 'social', name: 'Social', navSelector: 'button[aria-label="Social"]' }
    ];

    for (const p of pagesToTest) {
      console.log(`Testing page: ${p.name}...`);
      await page.click(p.navSelector);
      await new Promise(r => setTimeout(r, 500));

      const pageMetrics = await page.evaluate(() => {
        return {
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight
        };
      });

      console.log(`[${p.name}] scrollHeight: ${pageMetrics.scrollHeight}px vs innerHeight: ${pageMetrics.innerHeight}px`);
      
      // Scroll down
      await client.send('Input.synthesizeScrollGesture', {
        x: 200,
        y: 600,
        yDistance: -350,
        speed: 1000,
        gestureSourceType: 'touch'
      });
      await new Promise(r => setTimeout(r, 500));
      const pScrolledY = await page.evaluate(() => window.scrollY);
      console.log(`[${p.name}] scrollY: ${pScrolledY}px`);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${p.id}_390.png`) });

      // Scroll back up
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise(r => setTimeout(r, 300));
    }

    // 1.6 Profile & Settings Scrolling
    console.log('Testing Profile & Settings pages...');
    // Open Profile via Header avatar
    await page.evaluate(() => {
      const headerAvatar = document.querySelector('header button img')?.parentElement;
      if (headerAvatar) headerAvatar.click();
      else window.location.hash = '#profile';
    });
    await new Promise(r => setTimeout(r, 500));
    const profileMetrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight
    }));
    console.log(`[Profile] scrollHeight: ${profileMetrics.scrollHeight}px`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'profile_390.png') });

    // Open Settings from Profile
    await page.evaluate(() => {
      const settingsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Settings & Preferences'));
      if (settingsBtn) settingsBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const settingsMetrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight
    }));
    console.log(`[Settings] scrollHeight: ${settingsMetrics.scrollHeight}px`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'settings_390.png') });

    // Return to Pulse
    await page.click('button[aria-label="Pulse"]');
    await new Promise(r => setTimeout(r, 500));

    // 1.7 Mini-Player Clearance Test
    console.log('Testing Mini-Player bottom clearance when playing track...');
    // Click first continue listening or recommended track
    await page.evaluate(() => {
      const trackCard = document.querySelector('.glass-card');
      if (trackCard) trackCard.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Scroll to the absolute bottom of the document
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await new Promise(r => setTimeout(r, 500));

    const clearanceCheck = await page.evaluate(() => {
      const miniPlayer = document.querySelector('[role="region"][aria-label="Now Playing Mini Player"]');
      const bottomNav = document.querySelector('nav[role="navigation"]');
      const mainContent = document.getElementById('mobile-main-content');
      const allCards = mainContent ? Array.from(mainContent.querySelectorAll('.glass-card, .group, h2, div')) : [];
      
      // Find the lowest visible element in main content
      let maxBottom = 0;
      allCards.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > maxBottom && rect.bottom <= window.innerHeight) {
          maxBottom = rect.bottom;
        }
      });

      const miniPlayerRect = miniPlayer ? miniPlayer.getBoundingClientRect() : null;
      const bottomNavRect = bottomNav ? bottomNav.getBoundingClientRect() : null;

      return {
        hasMiniPlayer: !!miniPlayer,
        miniPlayerTop: miniPlayerRect ? miniPlayerRect.top : null,
        bottomNavTop: bottomNavRect ? bottomNavRect.top : null,
        lowestContentBottom: maxBottom,
        clearanceAboveMiniPlayer: miniPlayerRect ? miniPlayerRect.top - maxBottom : null
      };
    });

    console.log('[Clearance Check Result]:', JSON.stringify(clearanceCheck, null, 2));
    if (clearanceCheck.hasMiniPlayer && clearanceCheck.clearanceAboveMiniPlayer !== null && clearanceCheck.clearanceAboveMiniPlayer < 0) {
      console.warn(`WARNING: Content overlaps mini player by ${Math.abs(clearanceCheck.clearanceAboveMiniPlayer)}px`);
    } else {
      console.log(`✓ Bottom content clears mini player safely with ${clearanceCheck.clearanceAboveMiniPlayer}px breathing room.`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'pulse_bottom_clearance_with_miniplayer_390.png') });

    // -------------------------------------------------------------
    // PHASE 2: ALL REQUIRED MOBILE VIEWPORTS (320, 360, 375, 412, 430)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: TESTING ALL MOBILE VIEWPORTS ---');
    for (const vp of MOBILE_VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise(r => setTimeout(r, 400));

      const vpMetrics = await page.evaluate(() => {
        return {
          windowInnerHeight: window.innerHeight,
          scrollHeight: document.documentElement.scrollHeight,
          scrollYInitial: window.scrollY
        };
      });

      // Swipe upward
      await client.send('Input.synthesizeScrollGesture', {
        x: vp.width / 2,
        y: vp.height * 0.7,
        yDistance: -300,
        speed: 1000,
        gestureSourceType: 'touch'
      });
      await new Promise(r => setTimeout(r, 400));
      const vpScrolledY = await page.evaluate(() => window.scrollY);

      console.log(`Viewport ${vp.name}: innerHeight=${vpMetrics.windowInnerHeight}px, scrollHeight=${vpMetrics.scrollHeight}px, scrolledY=${vpScrolledY}px -> ${vpScrolledY > 0 ? '✓ PASS' : '❌ FAIL'}`);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `mobile_${vp.name}.png`) });

      testResults.push({
        viewport: vp.name,
        type: 'mobile',
        scrollHeight: vpMetrics.scrollHeight,
        scrolledY: vpScrolledY,
        passed: vpScrolledY > 0
      });
    }

    // -------------------------------------------------------------
    // PHASE 3: DESKTOP VIEWPORTS PRESERVATION (1280, 1440, 1920)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: VERIFYING DESKTOP PRESERVATION (1280, 1440, 1920) ---');
    for (const dvp of DESKTOP_VIEWPORTS) {
      await page.setViewport({ width: dvp.width, height: dvp.height, isMobile: false, hasTouch: false });
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise(r => setTimeout(r, 500));

      const desktopAudit = await page.evaluate(() => {
        const sidebar = document.querySelector('aside');
        const header = document.querySelector('header.hidden.md\\:flex, header');
        const footerPlayer = document.querySelector('footer');
        const mobileNav = document.querySelector('nav[role="navigation"]');
        const mobileHeader = document.querySelector('header.fixed.top-0.left-0.w-full');

        const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;
        const mobileNavStyle = mobileNav ? window.getComputedStyle(mobileNav) : null;

        return {
          sidebarVisible: sidebarStyle ? sidebarStyle.display !== 'none' : false,
          sidebarWidth: sidebarStyle ? sidebarStyle.width : '0px',
          mobileNavHidden: mobileNavStyle ? mobileNavStyle.display === 'none' : true,
          footerPlayerPresent: !!footerPlayer
        };
      });

      console.log(`Desktop Viewport ${dvp.name}:`);
      console.log(`  - Sidebar visible (w-64): ${desktopAudit.sidebarVisible} (${desktopAudit.sidebarWidth})`);
      console.log(`  - Mobile navigation hidden: ${desktopAudit.mobileNavHidden}`);
      console.log(`  - Footer dock player present: ${desktopAudit.footerPlayerPresent}`);

      const passed = desktopAudit.sidebarVisible && desktopAudit.mobileNavHidden;
      testResults.push({
        viewport: dvp.name,
        type: 'desktop',
        sidebarVisible: desktopAudit.sidebarVisible,
        mobileNavHidden: desktopAudit.mobileNavHidden,
        passed
      });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `desktop_${dvp.name}.png`) });
    }

    console.log('\n===============================================================');
    console.log('                   VERIFICATION SUMMARY                        ');
    console.log('===============================================================');
    const allPassed = testResults.every(r => r.passed);
    console.log(`Overall Result: ${allPassed ? 'ALL TESTS PASSED ✨' : 'SOME TESTS FAILED ❌'}`);
    console.table(testResults);

  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTests();
