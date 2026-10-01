const fs = require('fs');

function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

function pluralize(str) {
  if (str.endsWith('y')) return str.slice(0, -1) + 'ies';
  if (str.endsWith('s') || str.endsWith('x') || str.endsWith('z') || str.endsWith('ch') || str.endsWith('sh')) return str + 'es';
  return str + 's';
}

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
    // We are at the end of a model. Insert @@map.
    const snakeCase = camelToSnakeCase(currentModel);
    const tableName = pluralize(snakeCase);
    
    // Check if @@map already exists in previous lines for this model
    let hasMap = false;
    for (let j = mappedLines.length - 1; j >= 0; j--) {
      if (mappedLines[j].match(/^model\s+/)) break;
      if (mappedLines[j].includes('@@map')) {
        hasMap = true;
        break;
      }
    }
    
    if (!hasMap) {
      mappedLines.push(`  @@map("${tableName}")`);
    }
    
    currentModel = null;
  }
  
  mappedLines.push(line);
}

fs.writeFileSync('schema.prisma', mappedLines.join('\n'), 'utf8');
console.log('Added @@map to all models successfully.');
