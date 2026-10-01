const ampService = require('../services/ampService');

class AmpController {
  async trackClick(req, res) {
    try {
      const clickData = req.body;
      const result = await ampService.trackClick(clickData);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Track Click Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 404 ? 'INVALID_REF' : 'TRACKING_FAILED',
          message: error.message || 'An error occurred while tracking the click'
        }
      });
    }
  }

  async getDashboardStats(req, res) {
    try {
      const user = req.user;
      const stats = await ampService.getDashboardStats(user);
      
      res.status(200).json({
        success: true,
        ...stats
      });
    } catch (error) {
      console.error('Get Stats Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: 'FETCH_STATS_FAILED',
          message: error.message || 'An error occurred while fetching affiliate stats'
        }
      });
    }
  }
}

module.exports = new AmpController();
