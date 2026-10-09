const fs = require('fs');
const file = 'c:/kiaan project/jonny/OMP Deals project 2/backend/prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/model Store \{\\n  reconditioningOrders ReconditioningOrder\[\]/g, 'model Store {\n  reconditioningOrders ReconditioningOrder[]');
content = content.replace(/model Organization \{\\n  reconditioningOrders ReconditioningOrder\[\]/g, 'model Organization {\n  reconditioningOrders ReconditioningOrder[]');

fs.writeFileSync(file, content);
console.log('Fixed schema');
