const fs = require('fs');
let file = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/status:\s*'WON'/g, "status: 'CLOSED'");
fs.writeFileSync(file, content);
console.log('Fixed WON to CLOSED');
