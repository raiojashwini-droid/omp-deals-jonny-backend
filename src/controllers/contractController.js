const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads/contracts');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Generate PDF
function createAgreementPdf(filePath, store, user) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(filePath));
      
      doc.fontSize(20).text('OMP DEALS - DEALERSHIP LIAISON AGREEMENT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();
      doc.text(`This Agreement is made between OMP Deals and:`);
      doc.moveDown();
      doc.text(`Dealership Name: ${store.name}`);
      doc.text(`Dealership Address: ${store.street_address || ''}, ${store.city}, ${store.state}`);
      doc.text(`Liaison Name: ${user.full_name || user.email}`);
      doc.text(`Liaison Email: ${user.email}`);
      doc.moveDown();
      doc.text('Terms and Conditions:');
      doc.text('1. The Dealership agrees to participate in the OMP Deals pilot program.');
      doc.text('2. The Liaison represents the Dealership in all transactions on the platform.');
      doc.text('3. Both parties agree to abide by the platform rules and regulations.');
      doc.moveDown();
      doc.text('Signatures:', { underline: true });
      doc.moveDown(4);
      doc.text('_________________________________');
      doc.text(`${user.full_name || 'Liaison'} (Authorized Representative)`);
      
      doc.end();
      
      doc.on('end', () => resolve(true));
    } catch (err) {
      reject(err);
    }
  });
}

function createSignedAgreementPdf(filePath, store, user, signatureDataUrl) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(filePath));
      
      doc.fontSize(20).text('OMP DEALS - DEALERSHIP LIAISON AGREEMENT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();
      doc.text(`This Agreement is made between OMP Deals and:`);
      doc.moveDown();
      doc.text(`Dealership Name: ${store.name}`);
      doc.text(`Dealership Address: ${store.street_address || ''}, ${store.city}, ${store.state}`);
      doc.text(`Liaison Name: ${user.full_name || user.email}`);
      doc.text(`Liaison Email: ${user.email}`);
      doc.moveDown();
      doc.text('Terms and Conditions:');
      doc.text('1. The Dealership agrees to participate in the OMP Deals pilot program.');
      doc.text('2. The Liaison represents the Dealership in all transactions on the platform.');
      doc.text('3. Both parties agree to abide by the platform rules and regulations.');
      doc.moveDown();
      doc.text('Signatures:', { underline: true });
      doc.moveDown();
      
      if (signatureDataUrl && signatureDataUrl.startsWith('data:image/png;base64,')) {
        const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, { width: 150 });
      }
      
      doc.moveDown();
      doc.text(`${user.full_name || 'Liaison'} (Authorized Representative)`);
      doc.text(`Digitally Signed on: ${new Date().toISOString()}`);
      
      doc.end();
      doc.on('end', () => resolve(true));
    } catch (err) {
      reject(err);
    }
  });
}

exports.getContracts = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const isReviewer = ['EXECUTIVE_ADMIN', 'DEALER_PRO'].includes(user.role);
    const where = {};
    if (!isReviewer) {
      if (!user.storeId) return res.status(403).json({ success: false, message: 'No store associated' });
      where.storeId = user.storeId;
    }

    const contracts = await prisma.dealershipContract.findMany({
      where,
      include: {
        liaison: { select: { id: true, full_name: true, email: true } },
        store: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, contracts });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.generateContract = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.storeId) {
      return res.status(401).json({ success: false, message: 'Unauthorized or missing store' });
    }
    
    // Check if ID docs are approved (simulated check based on business logic)
    const approvedDocs = await prisma.dealerDocument.findMany({
      where: { storeId: user.storeId, status: 'APPROVED' }
    });
    
    if (approvedDocs.length === 0 && process.env.NODE_ENV !== 'development') {
      return res.status(400).json({ success: false, message: 'Cannot generate contract until documents are approved' });
    }

    const store = await prisma.store.findUnique({ where: { id: user.storeId } });
    
    const uniqueSuffix = crypto.randomBytes(8).toString('hex') + '-' + Date.now();
    const filename = `agreement_${uniqueSuffix}.pdf`;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    await createAgreementPdf(filePath, store, user);

    const contract = await prisma.dealershipContract.create({
      data: {
        storeId: user.storeId,
        liaisonId: user.id,
        templateName: 'Liaison Onboarding Agreement v1',
        status: 'PENDING_SIGNATURE',
        unsignedPdfUrl: `/uploads/contracts/${filename}`
      }
    });

    res.json({ success: true, contract });
  } catch (error) {
    console.error('Error generating contract:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getContract = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    const contract = await prisma.dealershipContract.findUnique({
      where: { id },
      include: {
        liaison: { select: { id: true, full_name: true, email: true } },
        store: { select: { id: true, name: true, city: true, state: true } }
      }
    });

    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    
    const isReviewer = ['EXECUTIVE_ADMIN', 'DEALER_PRO'].includes(user.role);
    if (!isReviewer && contract.storeId !== user.storeId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, contract });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getContractDocument = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { type } = req.query; // 'signed' or 'unsigned'
    
    const contract = await prisma.dealershipContract.findUnique({ where: { id } });
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    
    const isReviewer = ['EXECUTIVE_ADMIN', 'DEALER_PRO'].includes(user.role);
    if (!isReviewer && contract.storeId !== user.storeId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const fileUrl = (type === 'signed' && contract.signedPdfUrl) ? contract.signedPdfUrl : contract.unsignedPdfUrl;
    if (!fileUrl) return res.status(404).json({ success: false, message: 'Document not generated yet' });
    
    const fileName = path.basename(fileUrl);
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    if (fs.existsSync(filePath)) {
      res.contentType('application/pdf');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ success: false, message: 'File not found on server' });
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.signContract = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { signatureDataUrl } = req.body;
    
    if (!signatureDataUrl) {
      return res.status(400).json({ success: false, message: 'Signature is required' });
    }

    const contract = await prisma.dealershipContract.findUnique({ where: { id } });
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    
    if (contract.liaisonId !== user.id) {
      return res.status(403).json({ success: false, message: 'Only the designated liaison can sign this contract' });
    }
    
    if (contract.status !== 'PENDING_SIGNATURE') {
      return res.status(400).json({ success: false, message: 'Contract is not in a signable state' });
    }

    const store = await prisma.store.findUnique({ where: { id: user.storeId } });
    
    const uniqueSuffix = crypto.randomBytes(8).toString('hex') + '-' + Date.now();
    const filename = `signed_agreement_${uniqueSuffix}.pdf`;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    await createSignedAgreementPdf(filePath, store, user, signatureDataUrl);

    const updatedContract = await prisma.dealershipContract.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signatureDataUrl,
        signedPdfUrl: `/uploads/contracts/${filename}`
      }
    });

    res.json({ success: true, contract: updatedContract });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.reviewContract = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    const isReviewer = ['EXECUTIVE_ADMIN', 'DEALER_PRO'].includes(user.role);
    if (!isReviewer) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason required' });
    }

    const contract = await prisma.dealershipContract.findUnique({ where: { id } });
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    
    if (contract.liaisonId === user.id) {
      return res.status(403).json({ success: false, message: 'Cannot review your own contract' });
    }

    const updatedContract = await prisma.dealershipContract.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        reviewerId: user.id,
        reviewedAt: new Date()
      }
    });

    res.json({ success: true, contract: updatedContract });
  } catch (error) {
    console.error('Error reviewing contract:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
