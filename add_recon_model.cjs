const fs = require('fs');
const schemaPath = 'c:/kiaan project/jonny/OMP Deals project 2/backend/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('model ReconditioningOrder')) {
  const newModel = `
model ReconditioningOrder {
  id              String   @id @default(uuid())
  vehicleId       String
  vehicle         Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  
  storeId         String
  store           Store    @relation(fields: [storeId], references: [id])
  
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId], references: [id])

  description     String   @db.Text
  vendor          String?
  estimatedCost   Float    @default(0)
  actualCost      Float    @default(0)
  status          String   @default("OPEN") // DRAFT, OPEN, IN_PROGRESS, COMPLETED, CANCELLED
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("reconditioning_order")
}
`;

  schema += newModel;
  
  schema = schema.replace(
    'media     Media[]',
    'media     Media[]\n  reconditioningOrders ReconditioningOrder[]'
  );
  
  schema = schema.replace(
    'expenses     Expense[]',
    'expenses     Expense[]\n  reconditioningOrders ReconditioningOrder[]'
  );
  
  schema = schema.replace(
    'stores       Store[]',
    'stores       Store[]\n  reconditioningOrders ReconditioningOrder[]'
  );

  fs.writeFileSync(schemaPath, schema);
  console.log('Schema updated with ReconditioningOrder model.');
} else {
  console.log('Model already exists.');
}
