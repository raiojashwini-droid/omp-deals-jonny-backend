const fs = require('fs');
let content = fs.readFileSync('schema.prisma', 'utf8');

// Strip out the UTF-16 nonsense by removing anything after the PoliceSafeSpot model
const idx = content.indexOf('model PoliceSafeSpot');
if (idx !== -1) {
    const endIdx = content.indexOf('}', idx);
    if (endIdx !== -1) {
        let cleanContent = content.substring(0, endIdx + 1) + '\n\n';
        
        const newModels = `model TrackingEvent {
  id               String   @id @default(uuid())
  storeId          String
  store            Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  userId           String?  
  user             User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  vehicleId        String?  
  vehicle          Vehicle? @relation(fields: [vehicleId], references: [id], onDelete: SetNull)
  
  duration_seconds Int
  createdAt        DateTime @default(now())

  @@index([storeId, createdAt])
}

model LeadAssignmentLog {
  id           String           @id @default(uuid())
  leadId       String
  lead         Lead             @relation(fields: [leadId], references: [id], onDelete: Cascade)
  
  assignedToId String?
  assignedTo   User?            @relation("AssignedToUser", fields: [assignedToId], references: [id], onDelete: SetNull)
  
  assignedById String
  assignedBy   User             @relation("AssignedByUser", fields: [assignedById], references: [id], onDelete: Restrict)
  
  action       AssignmentAction
  createdAt    DateTime         @default(now())

  @@index([leadId])
}

model LeadNotification {
  id        String   @id @default(uuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  read      Boolean  @default(false)
  expiresAt DateTime 
  createdAt DateTime @default(now())

  @@index([userId, read])
  @@index([expiresAt])
}
`;
        // Handle utf-16 characters if they sneaked inside PoliceSafeSpot
        // The safest way is to regex out the null bytes if there are any
        cleanContent = cleanContent.replace(/\x00/g, '');

        cleanContent += newModels;
        fs.writeFileSync('schema.prisma', cleanContent, 'utf8');
        console.log('Fixed schema.prisma');
    }
}
