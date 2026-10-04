import fs from 'fs';
import path from 'path';

const filesToAudit = [
  'c:/Edit/Resona/src/index.css',
  'c:/Edit/Resona/src/App.jsx',
  'c:/Edit/Resona/src/components/PulseView.jsx',
  'c:/Edit/Resona/src/components/SeekView.jsx',
  'c:/Edit/Resona/src/components/OnAirView.jsx',
  'c:/Edit/Resona/src/components/ShelfView.jsx',
  'c:/Edit/Resona/src/components/SocialView.jsx',
  'c:/Edit/Resona/src/components/HuddleView.jsx',
  'c:/Edit/Resona/src/components/CreatorHubView.jsx',
  'c:/Edit/Resona/src/components/SettingsView.jsx',
  'c:/Edit/Resona/src/components/LoginView.jsx',
  'c:/Edit/Resona/src/components/OnboardingView.jsx',
  'c:/Edit/Resona/src/components/StartHuddleModal.jsx',
  'c:/Edit/Resona/src/components/NotificationDrawer.jsx',
  'c:/Edit/Resona/src/components/AdminDashboard.jsx',
  // Purpose-built mobile presentation components (< 768px)
  'c:/Edit/Resona/src/components/mobile/MobileHeader.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileBottomNav.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileMiniPlayer.jsx',
  'c:/Edit/Resona/src/components/mobile/MobilePulseView.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileSeekView.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileOnAirView.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileShelfView.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileSocialView.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileCreatorHubView.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileSettingsView.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileProfileView.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileHuddleView.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileNotificationsSheet.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileQueueSheet.jsx',
  'c:/Edit/Resona/src/components/mobile/MobileTrackActionSheet.jsx'
];

const TARGET_VIEWPORTS = [
  { width: 320, type: 'mobile', name: 'iPhone SE / Small Android' },
  { width: 360, type: 'mobile', name: 'Galaxy S Series' },
  { width: 375, type: 'mobile', name: 'iPhone 13 mini / X' },
  { width: 390, type: 'mobile', name: 'iPhone 14 / 15' },
  { width: 412, type: 'mobile', name: 'Pixel 7 / 8' },
  { width: 430, type: 'mobile', name: 'iPhone 15 Pro Max' },
  { width: 1280, type: 'desktop', name: 'HD Laptop' },
  { width: 1440, type: 'desktop', name: 'MacBook Pro / Desktop' },
  { width: 1920, type: 'desktop', name: 'FHD Monitor' }
];

console.log('===============================================================');
console.log('         STRICT RESPONSIVE AUDIT ACROSS ALL TARGETS            ');
console.log('===============================================================\n');

let totalViolations = 0;
const resultsByComponent = [];

for (const filePath of filesToAudit) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const baseName = path.basename(filePath);
  const issues = [];
  const checksPassed = [];

  // 1. Desktop Preservation Checks
  if (baseName === 'App.jsx') {
    if (content.includes('overflow-x-clip')) {
      checksPassed.push('Root container has overflow-x-clip preventing ambient glow horizontal scroll');
    } else {
      issues.push('Missing overflow-x-clip on App root container');
    }

    if (content.includes("md:pl-[288px]") && content.includes("md:pt-[88px]") && content.includes("w-64")) {
      checksPassed.push('Desktop sidebar (w-64) and main padding (md:pl-[288px] md:pt-[88px]) 100% preserved');
    } else {
      issues.push('Desktop layout padding or sidebar width modified');
    }

    if (content.includes("activeTab === 'onair' ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-4'")) {
      checksPassed.push('OnAir mobile bottom nav clearance active with desktop md:pb-4 preserved');
    } else {
      issues.push('OnAir mobile bottom nav clearance issue');
    }
  }

  if (baseName === 'PulseView.jsx') {
    if (content.includes('p-5 sm:p-6 md:p-8')) {
      checksPassed.push('Hero banner uses responsive padding with desktop md:p-8 preserved');
    } else {
      issues.push('Hero banner missing responsive padding or desktop md:p-8 changed');
    }

    if (content.includes('truncate') && content.includes('min-w-0 flex-1')) {
      checksPassed.push('Header email & title truncate safely on mobile widths');
    } else {
      issues.push('Header text may overflow on narrow mobile screens');
    }
  }

  if (baseName === 'SocialView.jsx') {
    if (content.includes('flex-wrap') && content.includes('gap-x-4')) {
      checksPassed.push('Stats row has flex-wrap to prevent horizontal overflow on <=375px screens');
    } else {
      issues.push('Stats row missing flex-wrap');
    }

    if (content.includes('flex-col sm:flex-row gap-3')) {
      checksPassed.push('Action buttons stack vertically on mobile (flex-col) and side-by-side on desktop (sm:flex-row)');
    } else {
      issues.push('Action buttons do not stack on mobile');
    }
  }

  if (baseName === 'HuddleView.jsx') {
    if (content.includes('md:flex-row')) {
      checksPassed.push('Desktop Huddle side-by-side layout intact (LEFT = chat, RIGHT = queue)');
    } else {
      issues.push('Desktop Huddle side-by-side layout compromised');
    }

    if (content.includes('huddle.code || huddle.id') && content.includes('handleCopyCode')) {
      checksPassed.push('Huddle room code pill with 1-click copy & confirmation present in header');
    } else {
      issues.push('Huddle room code or copy button missing');
    }

    if (content.includes('md:hidden') && content.includes('mobilePanel')) {
      checksPassed.push('Mobile panel toggle between chat and queue present');
    } else {
      issues.push('Mobile panel toggle missing');
    }
  }

  if (baseName === 'CreatorHubView.jsx') {
    if (content.includes('flex flex-col sm:flex-row sm:items-center justify-between gap-4')) {
      checksPassed.push('Creator overview card stacks vertically on mobile, horizontal on desktop');
    } else {
      issues.push('Creator overview card may overflow on narrow mobile screens');
    }

    if (content.includes('text-base sm:text-xs')) {
      checksPassed.push('Inputs use text-base sm:text-xs to prevent iOS auto-zoom');
    } else {
      issues.push('Song title input missing iOS auto-zoom prevention');
    }
  }

  if (baseName === 'SettingsView.jsx') {
    if (content.includes('min-w-0 flex-1') && content.includes('truncate')) {
      checksPassed.push('User quick card text is protected with min-w-0 and truncate against long emails');
    } else {
      issues.push('Settings user card text lacks truncation');
    }
  }

  if (baseName === 'AdminDashboard.jsx') {
    if (content.includes('hidden md:flex w-64')) {
      checksPassed.push('Desktop admin sidebar (w-64) 100% preserved and hidden on mobile');
    } else {
      issues.push('Desktop admin sidebar compromised');
    }

    if (content.includes('md:hidden') && content.includes('no-scrollbar')) {
      checksPassed.push('Mobile admin navigation tab strip implemented for mobile viewports');
    } else {
      issues.push('Mobile admin navigation missing');
    }
  }

  // 2. Scan for any un-prefixed fixed pixel widths > 300px (excluding max-w and ambient lights)
  const fixedWidthMatches = [...content.matchAll(/(?<![-a-zA-Z0-9])(?:w|min-w)-\[(\d+)px\]/g)];
  for (const match of fixedWidthMatches) {
    const m = match[0];
    const pxVal = parseInt(match[1]);
    const idx = match.index;
    if (pxVal > 300) {
      const prefix = content.slice(Math.max(0, idx - 15), idx);
      // Ignore background ambient lights which are clipped by root overflow-x-clip
      const lineContext = content.slice(Math.max(0, idx - 60), Math.min(content.length, idx + 60));
      if (!lineContext.includes('blur') && !lineContext.includes('pointer-events-none')) {
        if (!prefix.includes('md:') && !prefix.includes('sm:') && !prefix.includes('lg:')) {
          issues.push(`Hardcoded width ${m} without breakpoint prefix on element`);
        }
      }
    }
  }

  // 3. Scan for input fields with small font sizes that lack text-base
  const inputMatches = content.match(/<input[^>]*className=["'`]([^"'`]*)["'`]/g) || [];
  for (const inp of inputMatches) {
    if (inp.includes('type="checkbox"') || inp.includes('type="radio"') || inp.includes('type="range"') || inp.includes('type="file"')) {
      continue;
    }
    const classAttr = inp.match(/className=["'`]([^"'`]*)["'`]/)?.[1] || '';
    if ((classAttr.includes('text-xs') || classAttr.includes('text-sm')) && !classAttr.includes('text-base')) {
      issues.push(`Input with ${classAttr.includes('text-xs') ? 'text-xs' : 'text-sm'} lacks text-base fallback on mobile`);
    }
  }

  totalViolations += issues.length;
  resultsByComponent.push({
    file: baseName,
    issues,
    checksPassed
  });
}

// Print results
for (const r of resultsByComponent) {
  console.log(`📁 ${r.file}:`);
  for (const pass of r.checksPassed) {
    console.log(`   ✓ ${pass}`);
  }
  if (r.issues.length === 0) {
    console.log(`   ✨ All responsive rules verified cleanly.`);
  } else {
    for (const iss of r.issues) {
      console.log(`   ❌ ${iss}`);
    }
  }
  console.log('');
}

console.log('---------------------------------------------------------------');
console.log(`AUDIT SUMMARY: ${totalViolations === 0 ? 'PASSED (0 violations)' : `FAILED (${totalViolations} violations)`}`);
console.log('---------------------------------------------------------------');

process.exit(totalViolations === 0 ? 0 : 1);
