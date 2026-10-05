const fs = require('fs');
const p = 'src/context/AuthContext.jsx';
let content = fs.readFileSync(p, 'utf8');
content = content.replace(
  /if \(!import\.meta\.env\?\.PROD && user\?\.role === 'admin'\)/g,
  "if (user?.role === 'admin')"
);
fs.writeFileSync(p, content);
console.log('Successfully updated AuthContext.jsx logout');
