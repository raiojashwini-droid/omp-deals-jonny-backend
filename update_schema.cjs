const fs = require('fs');
const schemaPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('model OrganizationVerification')) {
  const newModel = `
model OrganizationVerification {
  id              String   @id @default(uuid())
  organizationId  String   @unique
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  status          String   @default("DRAFT") // DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
  
  legalName       String?
  businessType    String?
  registrationNo  String?
  taxId           String?
  
  addressStreet   String?
  addressCity     String?
  addressState    String?
  addressZip      String?
  
  primaryContact  String?
  contactEmail    String?
  contactPhone    String?
  
  reviewerId      String?
  reviewedAt      DateTime?
  rejectionReason String?  @db.Text
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("organization_verification")
}
`;

  // Insert before the last model or just append to end
  schema += newModel;
  
  // Need to also add relation to Organization model
  schema = schema.replace(
    'users     User[]',
    'users     User[]\n  verification OrganizationVerification?'
  );

  fs.writeFileSync(schemaPath, schema);
  console.log('Schema updated with OrganizationVerification model.');
} else {
  console.log('Model already exists.');
}
