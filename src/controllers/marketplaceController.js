const marketplaceService = require('../services/marketplaceService');

class MarketplaceController {
  async getListings(req, res) {
    try {
      const filters = req.query;
      let { total, data } = await marketplaceService.getListings(filters);
      
      data = data.map(v => ({
        ...v,
        price: v.price || v.selling_price || 35000,
        image_urls: (v.image_urls && v.image_urls.length > 0 && v.image_urls !== '[]') ? v.image_urls : JSON.stringify(['https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800'])
      }));

      if (!data || data.length === 0) {
        data = [{
            id: "veh-001",
            year: 2024,
            make: "BMW",
            model: "M4",
            trim: "Competition",
            price: 86400,
            mileage: 3200,
            lot_status: "AVAILABLE"
        },
        {
            id: "veh-002",
            year: 2023,
            make: "Tesla",
            model: "Model S",
            trim: "Plaid",
            price: 89500,
            mileage: 8120,
            lot_status: "AVAILABLE"
        }];
        total = 2;
      }
      
      res.status(200).json({
        success: true,
        total,
        data
      });
    } catch (error) {
      console.error('Get Listings Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_LISTINGS_FAILED',
          message: 'An error occurred while fetching listings'
        }
      });
    }
  }

  async createListing(req, res) {
    try {
      const data = req.body;
      const user = req.user;
      
      const newListing = await marketplaceService.createListing(data, user);
      
      res.status(201).json({
        success: true,
        data: newListing
      });
    } catch (error) {
      console.error('Create Listing Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 400 ? 'VALIDATION_ERROR' : 'CREATE_LISTING_FAILED',
          message: error.message || 'An error occurred while creating listing'
        }
      });
    }
  }

  async updateListing(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      const user = req.user;

      const updatedListing = await marketplaceService.updateListing(id, data, user);
      
      res.status(200).json({
        success: true,
        data: updatedListing
      });
    } catch (error) {
      console.error('Update Listing Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 403 ? 'FORBIDDEN' : 'UPDATE_LISTING_FAILED',
          message: error.message || 'An error occurred while updating the listing'
        }
      });
    }
  }

  async deleteListing(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      await marketplaceService.deleteListing(id, user);
      
      res.status(200).json({
        success: true,
        message: 'Listing deleted successfully'
      });
    } catch (error) {
      console.error('Delete Listing Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 403 ? 'FORBIDDEN' : 'DELETE_LISTING_FAILED',
          message: error.message || 'An error occurred while deleting the listing'
        }
      });
    }
  }

  async getListingById(req, res) {
    try {
      const { id } = req.params;
      const listing = await marketplaceService.getListingById(id);
      
      res.status(200).json({
        success: true,
        data: listing
      });
    } catch (error) {
      console.error('Get Listing by ID Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 404 ? 'NOT_FOUND' : 'FETCH_LISTING_FAILED',
          message: error.message || 'An error occurred while fetching the listing'
        }
      });
    }
  }
  async decodeVin(req, res) {
    try {
      const { vin } = req.params;
      const data = await marketplaceService.decodeVin(vin);
      
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Decode VIN Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 404 ? 'NOT_FOUND' : 'DECODE_VIN_FAILED',
          message: error.message || 'An error occurred while decoding the VIN'
        }
      });
    }
  }
  async getStats(req, res) {
    try {
      const stats = await marketplaceService.getGlobalStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error('Stats Error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch global stats' });
    }
  }
}

module.exports = new MarketplaceController();
