const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Allowed roles to upload
const UPLOAD_ROLES = ['LIAISON', 'DEALER_PRO', 'SALES_MGR'];
// Allowed roles to review/approve
const REVIEWER_ROLES = ['EXECUTIVE_ADMIN', 'DEALER_PRO'];

exports.uploadDocument = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || !user.storeId) {
      return res.status(401).json({ success: false, message: 'User not associated with a dealership.' });
    }

    if (!UPLOAD_ROLES.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized role for document upload.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document uploaded.' });
    }

    const { documentType } = req.body;
    if (!documentType) {
      return res.status(400).json({ success: false, message: 'documentType is required.' });
    }

    // Path relative to public directory for serving
    const filePath = `/uploads/documents/${req.file.filename}`;

    const document = await prisma.dealerDocument.create({
      data: {
        storeId: user.storeId,
        uploadedById: user.id,
        documentType: documentType,
        filePath: filePath,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, document });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document.' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let whereClause = {};

    // Multi-tenant security: 
    // If not a global reviewer (like EXECUTIVE_ADMIN), they can only see their own store's documents
    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!user.organizationId) {
        return res.status(403).json({ success: false, message: 'No organization associated.' });
      }
      whereClause.store = { organizationId: user.organizationId };
    } else if (!REVIEWER_ROLES.includes(user.role)) {
      if (!user.storeId) {
        return res.status(403).json({ success: false, message: 'No store associated.' });
      }
      whereClause.storeId = user.storeId;
    }

    const documents = await prisma.dealerDocument.findMany({
      where: whereClause,
      include: {
        uploadedBy: {
          select: { id: true, full_name: true, role: true, email: true }
        },
        reviewer: {
          select: { id: true, full_name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents.' });
  }
};

exports.reviewDocument = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!user || !REVIEWER_ROLES.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to review documents.' });
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be APPROVED or REJECTED.' });
    }

    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }

    const document = await prisma.dealerDocument.findUnique({
      where: { id },
      include: { store: { select: { organizationId: true } } }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!user.organizationId || document.store?.organizationId !== user.organizationId) {
        return res.status(403).json({ success: false, message: 'Document does not belong to your organization.' });
      }
    }

    // A liaison should not be able to review their own document even if they somehow got reviewer privileges
    if (document.uploadedById === user.id) {
      return res.status(403).json({ success: false, message: 'Cannot review your own uploaded document.' });
    }

    const updatedDocument = await prisma.dealerDocument.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        reviewerId: user.id,
        reviewedAt: new Date()
      },
      include: {
        uploadedBy: {
          select: { id: true, full_name: true, role: true, email: true }
        },
        reviewer: {
          select: { id: true, full_name: true }
        }
      }
    });

    res.json({ success: true, document: updatedDocument });
  } catch (error) {
    console.error('Error reviewing document:', error);
    res.status(500).json({ success: false, message: 'Failed to review document.' });
  }
};
