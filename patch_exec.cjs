const fs = require('fs');
let file = 'c:/kiaan project/jonny/OMP Deals project 2/backend/src/controllers/executiveController.js';
let content = fs.readFileSync(file, 'utf8');

// The function getReports, getExpenses, getBhphLedgers, etc all parse storeIds similarly
content = content.replace(
  /requestedStoreIds = storeIds\.split\(\',\('\)\.map\(id => id\.trim\(\)\)\.filter\(id => id\);/g,
  "requestedStoreIds = storeIds.split(',').map(id => id.trim()).filter(id => id && id !== 'all');"
);

// Better regex for all controllers parsing storeIds:
content = content.replace(/filter\(id => id\)/g, "filter(id => id && id !== 'all')");

fs.writeFileSync(file, content);
console.log('Patched executiveController.js to ignore all');
