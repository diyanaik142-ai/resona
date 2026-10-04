const fs = require('fs');
const path = 'c:/Edit/Resona/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// The goal is to wrap the `<main>` tag and the `<footer>` tag in a flex-col div, 
// so that the <footer> (Desktop Player) sits on the right side under the <main>, 
// and the <aside> (Sidebar) extends all the way down on the left.

// 1. Find <main> and replace it to add the wrapper
content = content.replace(
  '{/* MAIN CONTENT AREA */}\n        <main',
  '{/* MAIN CONTENT COLUMN */}\n        <div className="flex-1 flex flex-col overflow-hidden relative">\n          {/* MAIN CONTENT AREA */}\n          <main'
);

// 2. Find the end of <main> and remove its closing </div> wrapper (which was closing the original `flex-1 flex` wrapper)
// Wait, the original was:
/*
        <main className={`...`}>
          {renderCurrentView()}
        </main>
      </div>

      {/* MOBILE MINI PLAYER ...
*/
content = content.replace(
  '        </main>\n      </div>\n\n      {/* MOBILE MINI PLAYER',
  '        </main>\n\n        {/* MOBILE MINI PLAYER' // We keep the inner wrapper open
);

// 3. Find the footer and close the wrapper AFTER the footer
/*
      {/* DESKTOP MASTER AUDIO PLAYER DOCK (Hidden on mobile) *\/}
      {deviceSeen && isAuthenticated && (
        <footer ...>
           ...
        </footer>
      )}

      {/* Switch Account Modal *\/}
*/
const footerStr = '{/* DESKTOP MASTER AUDIO PLAYER DOCK (Hidden on mobile) */}';
const searchFooterRegex = new RegExp(`(      \\{/\\* DESKTOP MASTER AUDIO PLAYER DOCK.*?</footer>\\n      \\}\\))`, 's');

const footerMatch = content.match(searchFooterRegex);
if (footerMatch) {
  let footerBlock = footerMatch[1];
  
  // Remove the footer from its current position
  content = content.replace(footerBlock, '');

  // Insert the footer right after <main>
  content = content.replace(
    '        </main>\n\n        {/* MOBILE MINI PLAYER',
    '        </main>\n\n' + footerBlock.replace(/^      /gm, '        ') + '\n      </div>\n\n      {/* MOBILE MINI PLAYER'
  );
} else {
  console.log("Could not match footer");
}

fs.writeFileSync(path, content, 'utf8');
console.log('App.jsx modified successfully.');
