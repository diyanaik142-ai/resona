const fs = require('fs');
const p = 'src/context/AuthContext.jsx';
let content = fs.readFileSync(p, 'utf8');
content = content.replace(
  /if \(email === 'admin' && !import\.meta\.env\?\.PROD\) \{/,
  "if (email === 'admin') {"
);
fs.writeFileSync(p, content);
console.log('Successfully updated AuthContext.jsx');
