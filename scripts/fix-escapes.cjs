const fs = require('fs');
const path = 'c:/Edit/Resona/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// The file currently has literal backslashes escaping backticks and dollar signs
// e.g. className={\`w-full ... \${isActive ... }\`}
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed escaped chars in App.jsx');
