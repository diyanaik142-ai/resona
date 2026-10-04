const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'components');
const appPath = path.join(__dirname, 'src', 'App.jsx');

const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.jsx'));
const allFiles = [...files.map(f => path.join(directoryPath, f)), appPath];

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('MOCK_TRACKS')) {
    // If it's a component, add useAuth if it's not there, or extract catalog from it
    if (!content.includes('useAuth')) {
       content = content.replace(/import React/, "import React from 'react';\nimport { useAuth } from '../context/AuthContext';\nimport React");
    }
    
    // Replace MOCK_TRACKS import
    content = content.replace(/import \{.*?MOCK_TRACKS.*?\} from '.*?mockData';?\r?\n?/g, '');
    
    // Check if the component already uses useAuth
    if (content.includes('const {')) {
      // Find the first instance of const { ... } = useAuth();
      if (content.match(/const\s+\{.*\}\s*=\s*useAuth\(\);/)) {
         content = content.replace(/(const\s+\{)(.*)(\}\s*=\s*useAuth\(\);)/, '$1$2, catalog$3');
      } else {
         // Insert it at the top of the function
         const funcMatch = content.match(/export default function \w+\(.*\) \{/);
         if (funcMatch) {
             content = content.replace(funcMatch[0], funcMatch[0] + '\n  const { catalog } = useAuth();');
         }
      }
    } else {
      const funcMatch = content.match(/export default function \w+\(.*\) \{/);
      if (funcMatch) {
         content = content.replace(funcMatch[0], funcMatch[0] + '\n  const { catalog } = useAuth();');
      }
    }

    // Replace all usages of MOCK_TRACKS with catalog
    content = content.replace(/MOCK_TRACKS/g, 'catalog');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
