const fs = require('fs');
const schemaPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const newModels = `
model PhoneSetting {
  id              String   @id @default(uuid())
  organizationId  String   @unique
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  isEnabled       Boolean  @default(false)
  timezone        String   @default("America/New_York")
  greeting        String?
  fallbackPhone   String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
`;

if (!schema.includes('model PhoneSetting')) {
  schema += newModels;

  // Add opposite relation to Organization
  if (!schema.match(/model Organization \{[\s\S]*?phoneSetting PhoneSetting\?/)) {
    schema = schema.replace('model Organization {', 'model Organization {\n  phoneSetting PhoneSetting?');
  }

  fs.writeFileSync(schemaPath, schema);
  console.log('Schema updated with Phase G models.');
} else {
  console.log('Phase G models already exist.');
}
