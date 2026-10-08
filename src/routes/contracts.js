const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { requireAuth } = require('../middleware/authMiddleware');

// Get all contracts for user/store
router.get('/', requireAuth, contractController.getContracts);

// Generate a new contract
router.post('/generate', requireAuth, contractController.generateContract);

// Get a specific contract
router.get('/:id', requireAuth, contractController.getContract);

// Get a contract document (PDF)
router.get('/:id/document', requireAuth, contractController.getContractDocument);

// Sign a contract
router.post('/:id/sign', requireAuth, contractController.signContract);

// Review a contract (Approve/Reject)
router.patch('/:id/review', requireAuth, contractController.reviewContract);

module.exports = router;
