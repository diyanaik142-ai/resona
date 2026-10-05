const fs = require('fs');
const p = 'src/context/AuthContext.jsx';
let content = fs.readFileSync(p, 'utf8');
content = content.replace(
  /if \(import\.meta\.env\?\.PROD\) \{\s*await signOut\(firebaseAuth\);\s*\} else if \(user\?\.role === 'admin'\) \{/g,
  "if (user?.role === 'admin') {\n        localStorage.removeItem('adminToken');\n      } else if (import.meta.env?.PROD) {\n        await signOut(firebaseAuth);\n      } else {"
);
fs.writeFileSync(p, content);
console.log('Successfully updated AuthContext.jsx logout');
