const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  content = content.replace(/src={([^{}]+)}/g, (match, expr) => {
    // Only wrap variables related to track covers/artworks
    if ((expr.includes('.cover') || expr.includes('.artwork') || expr.includes('coverUrl') || expr.includes('catalog[')) && !expr.includes('resolveMediaUrl') && !expr.includes('formCoverPreview')) {
      changed = true;
      
      // If there is a fallback string, e.g. track.cover || '/assets/default-cover.png'
      // resolveMediaUrl won't hurt it because it passes through strings that don't match rules, but to be safe, wrap the whole thing.
      return `src={resolveMediaUrl(${expr})}`;
    }
    return match;
  });

  if (changed) {
    const relPath = path.relative(path.dirname(file), path.join(srcDir, 'services/api')).replace(/\\/g, '/');
    const importPath = relPath.startsWith('.') ? relPath : './' + relPath;
    
    // Check if resolveMediaUrl is already imported
    const alreadyImported = /import\s+{[^}]*resolveMediaUrl[^}]*}\s+from\s+['"][^'"]+api['"]/.test(content);
    if (!alreadyImported) {
      // Is there already an import from api?
      const apiImportRegex = new RegExp(`import\\s+{([^}]*)}\\s+from\\s+['"]${importPath}['"]`);
      const apiImportMatch = content.match(apiImportRegex);
      
      if (apiImportMatch) {
         const newImport = apiImportMatch[0].replace('{', '{ resolveMediaUrl, ');
         content = content.replace(apiImportMatch[0], newImport);
      } else {
         const imports = content.match(/^import\s+.*?;?\s*$/gm);
         if (imports && imports.length > 0) {
             const lastImport = imports[imports.length - 1];
             content = content.replace(lastImport, `${lastImport}\nimport { resolveMediaUrl } from '${importPath}';`);
         } else {
             content = `import { resolveMediaUrl } from '${importPath}';\n` + content;
         }
      }
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log("Updated", file);
  }
});
