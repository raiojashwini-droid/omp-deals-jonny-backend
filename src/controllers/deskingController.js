const deskingService = require('../services/deskingService');

class DeskingController {
  calculateDeal(req, res) {
    try {
      const data = req.body;
      const result = deskingService.calculateDeal(data);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Desking Calculate Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 400 ? 'VALIDATION_ERROR' : 'CALCULATION_FAILED',
          message: error.message || 'An error occurred during deal calculation'
        }
      });
    }
  }

  async getDeal(req, res) {
    try {
      const { id } = req.params;
      const deal = await deskingService.getDeal(id);
      res.status(200).json({ success: true, deal });
    } catch (error) {
      console.error('Get Deal Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: 'FETCH_DEAL_FAILED',
          message: error.message || 'An error occurred fetching the deal'
        }
      });
    }
  }

  async signDeal(req, res) {
    try {
      const { id } = req.params;
      const deal = await deskingService.signDeal(id);
      res.status(200).json({ success: true, deal });
    } catch (error) {
      console.error('Sign Deal Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: 'SIGN_DEAL_FAILED',
          message: error.message || 'An error occurred signing the deal'
        }
      });
    }
  }
}

module.exports = new DeskingController();
