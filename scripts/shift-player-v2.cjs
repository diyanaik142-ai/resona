const fs = require('fs');
const path = 'c:/Edit/Resona/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

const footerStartStr = '{/* DESKTOP MASTER AUDIO PLAYER DOCK (Hidden on mobile) */}';
const switchAccountStr = '{/* Switch Account Modal */}';

const footerStart = content.indexOf(footerStartStr);
const footerEnd = content.indexOf(switchAccountStr);

if (footerStart !== -1 && footerEnd !== -1) {
  // Extract the footer
  let footerStr = content.substring(footerStart, footerEnd);
  // Remove the footer from the end
  content = content.replace(footerStr, '');

  // Now find where main ends
  const mainEndStr = '</main>';
  const mainEndIdx = content.indexOf(mainEndStr) + mainEndStr.length;

  // Insert the footer right after </main>
  content = content.substring(0, mainEndIdx) + '\n\n' + footerStr + content.substring(mainEndIdx);
  
  // Finally, add the closing `</div>` for the new flex-col wrapper right after the footer (before mobile mini player)
  // We added `<div className="flex-1 flex flex-col overflow-hidden relative">` earlier in the previous script.
  // We need to make sure we close it. Let's find `{/* MOBILE MINI PLAYER (Hidden on desktop) */}`
  
  const mobileMiniPlayerStr = '{/* MOBILE MINI PLAYER (Hidden on desktop) */}';
  content = content.replace(mobileMiniPlayerStr, '      </div>\n\n      ' + mobileMiniPlayerStr);

  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully shifted footer');
} else {
  console.log('Could not find bounds');
}
