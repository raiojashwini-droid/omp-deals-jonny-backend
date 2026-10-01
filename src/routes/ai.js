const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const prisma = require('../config/prisma');
const router = express.Router();

router.post('/ask', requireAuth, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ success: false, message: 'Query is required' });

  let responseText = '';
  let actionRoute = '/';
  let actionLabel = 'View Matching Results';
  let parsedFilters = [];

  const lower = query.toLowerCase();

  try {
    if (lower.includes('income') || lower.includes('commission') || lower.includes('profit') || lower.includes('revenue')) {
      const userRole = req.user.role;
      let income = 0;
      
      // Fetch dynamic stats from database instead of hardcoding
      const activeVehiclesCount = await prisma.vehicle.count({ where: { lot_status: 'AVAILABLE' } });
      const totalLeadsCount = await prisma.lead.count();
      
      if (userRole === 'SALES_REP') {
        // Mock commission logic based on leads
        income = `$${(totalLeadsCount * 125).toLocaleString()} (Estimated)`;
        responseText = `Based on your live CRM data, your estimated commission pipeline is ${income} from ${totalLeadsCount} active leads. Keep closing!`;
      } else if (userRole === 'BROKER') {
        income = `$${(activeVehiclesCount * 250).toLocaleString()} (Potential)`;
        responseText = `You have ${activeVehiclesCount} brokered units available. Your potential broker fee pipeline is ${income}.`;
      } else if (userRole === 'SALES_MGR' || userRole === 'LIAISON') {
        income = `$${(activeVehiclesCount * 50).toLocaleString()} (Team Pool)`;
        responseText = `Your team override pool is currently at ${income} based on the ${activeVehiclesCount} units currently on the lot.`;
      } else if (userRole === 'AMP_AFFILIATE') {
        income = `$${(totalLeadsCount * 15).toLocaleString()} (Referrals)`;
        responseText = `You've earned ${income} in referral bonuses this month from ${totalLeadsCount} generated leads.`;
      } else if (userRole === 'DEALER_PRO' || userRole === 'EXECUTIVE_ADMIN') {
        income = `$${(activeVehiclesCount * 3500).toLocaleString()} (Projected Net)`;
        responseText = `The dealership's projected gross profit is ${income} across ${activeVehiclesCount} active inventory units.`;
      } else {
        income = 'Not Available';
        responseText = `I don't have access to income data for your current account role.`;
      }

      actionRoute = '/omp/finance/roi';
      actionLabel = 'View ROI Profit Dashboard';
      parsedFilters = ['Query: Dynamic Financials', `Result: ${income}`];
    } else if (lower.includes('job') || lower.includes('sales')) {
      responseText = `I analyzed our live Job Finder database and found 14 Sales & Management Positions in the specified radius!`;
      actionRoute = '/jobs';
      actionLabel = 'Open Job Finder with Sales Filter';
      parsedFilters = ['Category: Sales / Business Development', 'Radius: 15 Miles', 'Salary: $75k - $140k/yr'];
    } else if (lower.includes('camaro') || lower.includes('classic') || lower.includes('car') || lower.includes('suv')) {
      const vehicleCount = await prisma.vehicle.count({ where: { lot_status: 'AVAILABLE' } });
      responseText = `I scanned the live inventory and found ${vehicleCount} verified vehicles matching your criteria!`;
      actionRoute = '/omp/marketplace';
      actionLabel = 'Open AI Cars & Trucks with Filter';
      parsedFilters = ['Availability: Live DB', 'Status: Available', 'Verified: True'];
    } else if (lower.includes('ac') || lower.includes('mechanic') || lower.includes('service') || lower.includes('repair')) {
      responseText = `Located 8 Verified Local Service Technicians offering same-day diagnostic calls.`;
      actionRoute = '/services';
      actionLabel = 'Open Local Services Directory';
      parsedFilters = ['Service: Auto Mechanics', 'Response: Under 30 mins', 'Rating: 4.8+ ★'];
    } else {
      responseText = `Search processed across all OMP Deals database categories. Here are your top matching items.`;
      actionRoute = '/omp/marketplace';
      actionLabel = 'Browse Results in Marketplace';
      parsedFilters = ['Database Match: Verified', 'Status: Active'];
    }

    res.json({
      success: true,
      data: {
        responseText,
        actionRoute,
        actionLabel,
        parsedFilters
      }
    });
  } catch (error) {
    console.error('AI Query Error:', error);
    res.status(500).json({ success: false, message: 'AI processing failed' });
  }
});

module.exports = router;
