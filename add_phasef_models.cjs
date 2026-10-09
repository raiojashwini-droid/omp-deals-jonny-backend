const fs = require('fs');
const schemaPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const newModels = `
model WebsiteSetting {
  id              String   @id @default(uuid())
  organizationId  String   @unique
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  siteName        String?
  contactEmail    String?
  contactPhone    String?
  theme           String   @default("light")
  primaryColor    String?
  domain          String?  @unique
  isPublished     Boolean  @default(false)
  
  seoTitle        String?
  seoDescription  String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model VehicleMedia {
  id              String   @id @default(uuid())
  vehicleId       String
  vehicle         Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  
  mediaType       String   // "IMAGE" or "VIDEO"
  url             String
  isAiEnhanced    Boolean  @default(false)
  isLiveStream    Boolean  @default(false)
  sortOrder       Int      @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model VehiclePublishing {
  id              String   @id @default(uuid())
  vehicleId       String   @unique
  vehicle         Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  
  status          String   @default("DRAFT") // DRAFT, PUBLISHED, FAILED
  providerId      String?  // External ID if published
  lastPublishedAt DateTime?
  errorLogs       String?  @db.Text
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
`;

if (!schema.includes('model WebsiteSetting')) {
  schema += newModels;

  // Add opposite relations to Organization
  if (!schema.match(/model Organization \{[\s\S]*?websiteSettings WebsiteSetting\?/)) {
    schema = schema.replace('model Organization {', 'model Organization {\n  websiteSettings WebsiteSetting?');
  }

  // Add opposite relations to Vehicle
  if (!schema.match(/model Vehicle \{[\s\S]*?vehicleMedia VehicleMedia\[\]/)) {
    schema = schema.replace('model Vehicle {', 'model Vehicle {\n  vehicleMedia VehicleMedia[]\n  publishing VehiclePublishing?');
  }

  fs.writeFileSync(schemaPath, schema);
  console.log('Schema updated with Phase F models.');
} else {
  console.log('Phase F models already exist.');
}
