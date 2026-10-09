const fs = require('fs');
const schemaPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const newModels = `
model PaymentInstallment {
  id              String   @id @default(uuid())
  dealId          String
  deal            Deal     @relation(fields: [dealId], references: [id], onDelete: Cascade)
  
  amountDue       Float
  dueDate         DateTime
  status          String   @default("SCHEDULED") // SCHEDULED, PAID, OVERDUE
  paidDate        DateTime?
  reference       String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model IntegrationSetting {
  id              String   @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  provider        String   // QUICKBOOKS, DESKMANAGER
  isConnected     Boolean  @default(false)
  lastSyncAt      DateTime?
  syncStatus      String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([organizationId, provider])
}

model TeamInvitation {
  id              String   @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  email           String
  role            String
  tokenHash       String   @unique
  expiresAt       DateTime
  status          String   @default("PENDING") // PENDING, ACCEPTED, REVOKED
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
`;

if (!schema.includes('model PaymentInstallment')) {
  schema += newModels;

  // Add opposite relations
  if (!schema.match(/model Deal \{[\s\S]*?paymentInstallments PaymentInstallment\[\]/)) {
    schema = schema.replace('model Deal {', 'model Deal {\n  paymentInstallments PaymentInstallment[]');
  }
  
  if (!schema.match(/model Organization \{[\s\S]*?integrationSettings IntegrationSetting\[\]/)) {
    schema = schema.replace('model Organization {', 'model Organization {\n  integrationSettings IntegrationSetting[]\n  teamInvitations TeamInvitation[]');
  }

  // Update Expense model to include receiptUrl and description
  // It's safe to add optional fields
  if (!schema.match(/receiptUrl\s+String\?/)) {
    schema = schema.replace('amount   Float\n  date', 'amount   Float\n  description String?\n  receiptUrl String?\n  date');
  }

  fs.writeFileSync(schemaPath, schema);
  console.log('Schema updated with Phase H models.');
} else {
  console.log('Phase H models already exist.');
}
