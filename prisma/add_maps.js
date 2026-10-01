const fs = require('fs');

let content = fs.readFileSync('schema.prisma', 'utf8');

const lines = content.split('\n');
const mappedLines = [];
let currentModel = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const modelMatch = line.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
  
  if (modelMatch) {
    currentModel = modelMatch[1];
    mappedLines.push(line);
    continue;
  }
  
  if (line.trim() === '}' && currentModel) {
    // Remove the previous @@map if it exists in mappedLines
    for (let j = mappedLines.length - 1; j >= 0; j--) {
      if (mappedLines[j].match(/^model\s+/)) break;
      if (mappedLines[j].includes('@@map')) {
        mappedLines.splice(j, 1);
      }
    }
    
    // The user wants strict lowercase with no underscores
    const tableName = currentModel.toLowerCase();
    
    mappedLines.push(`  @@map("${tableName}")`);
    currentModel = null;
  }
  
  mappedLines.push(line);
}

fs.writeFileSync('schema.prisma', mappedLines.join('\n'), 'utf8');
console.log('Fixed @@map to use strict lowercase contiguous table names.');
