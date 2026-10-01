const leadService = require('../services/leadService');

class LeadController {
  async createIntentLead(req, res) {
    try {
      const result = await leadService.createIntentLead(req.body, req.user || null);
      
      res.status(201).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Create Intent Lead Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 400 ? 'VALIDATION_ERROR' : error.status === 403 ? 'FORBIDDEN' : 'LEAD_CREATION_FAILED',
          message: error.message || 'An error occurred while creating the lead'
        }
      });
    }
  }
}

module.exports = new LeadController();
