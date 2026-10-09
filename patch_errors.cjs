const fs = require('fs');
let file = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/catch\s*\(error\)\s*\{\s*res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*\{\s*message:\s*'Internal server error'\s*\}\s*\}\);\s*\}/g, "catch(error) { res.status(500).json({ success: false, error: { message: error.message, stack: error.stack } }); }");

fs.writeFileSync(file, content);
console.log('Patched errors');
