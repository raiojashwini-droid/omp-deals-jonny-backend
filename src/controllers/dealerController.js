const dealerService = require('../services/dealerService');

class DealerController {
  async getDealerInventory(req, res) {
    try {
      const { dealerId } = req.params;
      const { dealer, inventory } = await dealerService.getDealerInventory(dealerId);
      
      res.status(200).json({
        success: true,
        dealer,
        total: inventory.length,
        data: inventory
      });
    } catch (error) {
      console.error('Get Dealer Inventory Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 404 ? 'DEALER_NOT_FOUND' : 'FETCH_INVENTORY_FAILED',
          message: error.message || 'An error occurred while fetching dealer inventory'
        }
      });
    }
  }

  async recordTrackingEvent(req, res) {
    try {
      const { dealerId } = req.params;
      const trackingData = req.body;
      const user = req.user;
      
      const result = await dealerService.recordTrackingEvent(dealerId, trackingData, user);
      res.status(201).json(result);
    } catch (error) {
      console.error('Record Tracking Event Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: 'TRACKING_FAILED',
          message: error.message || 'An error occurred while recording the tracking event'
        }
      });
    }
  }

  async getDmsFeedData(req, res) {
    try {
      const storeId = req.user?.storeId || req.params.storeId || 'auto-money-fl';
      const data = await dealerService.getDmsFeedData(storeId);
      res.status(200).json({ success: true, ...data });
    } catch (error) {
      console.error('Get DMS Feed Data Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'DMS_FEED_FAILED', message: error.message || 'Failed to fetch DMS feed data' }
      });
    }
  }

  async forceSyncNow(req, res) {
    try {
      const storeId = req.user?.storeId || req.params.storeId || 'auto-money-fl';
      const result = await dealerService.forceSyncNow(storeId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Force Sync Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'SYNC_FAILED', message: error.message || 'Failed to force sync' }
      });
    }
  }

  async updateVerifiedSettings(req, res) {
    try {
      const storeId = req.user?.storeId || req.params.storeId || 'auto-money-fl';
      const settings = req.body;
      const result = await dealerService.updateVerifiedSettings(storeId, settings);
      res.status(200).json(result);
    } catch (error) {
      console.error('Update Settings Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'SETTINGS_UPDATE_FAILED', message: error.message || 'Failed to update dealer settings' }
      });
    }
  }
}

module.exports = new DealerController();
