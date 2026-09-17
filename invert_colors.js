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
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace light text colors with black
    content = content.replace(/#fff(fff)?/gi, '#000');
    content = content.replace(/rgba\(255,\s*255,\s*255,/gi, 'rgba(0, 0, 0,');
    
    // Replace subtle dark backgrounds (used on dark mode) to subtle dark backgrounds (used on light mode)
    // Wait, on dark mode they used rgba(255,255,255,0.1) for subtle hover. So we just mapped it to rgba(0,0,0,0.1) which is correct for light mode.
    
    // There are some backgrounds like 'rgba(0,0,0,0.2)' which were used to darken elements. 
    // On a white background, they might still work as a gray background, so leave them.
    // Replace text colors that were light pastel with darker variants (like #fca5a5 -> #ef4444) 
    content = content.replace(/#fca5a5/gi, '#ef4444');
    content = content.replace(/#86efac/gi, '#16a34a'); // green
    content = content.replace(/#93c5fd/gi, '#2563eb'); // blue
    content = content.replace(/#f8fafc/gi, '#000000'); 
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
