const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'components');

const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.jsx'));
const allFiles = [...files.map(f => path.join(directoryPath, f))];

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.startsWith("import React from 'react';\nimport { useAuth } from '../context/AuthContext';\nimport React")) {
    content = content.replace("import React from 'react';\n", "");
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});
