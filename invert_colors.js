const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, 'src'), function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Flatten any remaining rgba alpha shades into solid grays
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.2\)/g, '#e5e7eb');
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.1\)/g, '#f3f4f6');
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.05\)/g, '#f9fafb');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
