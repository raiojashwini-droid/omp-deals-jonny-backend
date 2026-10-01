const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const prisma = require('../config/prisma');

// 1. Get Static Subscription Plans
router.get('/plans', (req, res) => {
  const plans = [
    {
      id: 'MARKETPLACE',
      name: 'Public Marketplace',
      price: '$0',
      period: 'Forever Free',
      badge: 'Core Platform',
      badgeColor: '#10b981',
      desc: 'Standard local & nationwide OfferUp classifieds for buyers & private sellers.',
      icon: 'ShoppingBag',
      features: [
        'Browse all 8 Marketplace Categories',
        'OMP AI Natural Language Search',
        'Post listings in 30 seconds',
        '1,600+ Police Safe Meetup Spots',
        'TruYou Seller Verification',
      ],
      isFree: true,
    },
    {
      id: 'CRM',
      name: 'OMP CRM & Sales Desking',
      price: '$149',
      period: 'per month / dealer',
      badge: 'Dealer Pro Add-on',
      badgeColor: '#0284c7',
      desc: 'Complete auto sales desking, omnichannel messaging, and AI voice call attendant.',
      icon: 'Inbox',
      features: [
        'Omnichannel Unified Inbox (SMS/Email/Chat)',
        '24/7 AI Phone Receptionist & Call Simulator',
        '60s Deal Structuring Calculator (BHPH/Finance)',
        'AI Top Lead Radar (Purchase-Intent Scoring)',
        'Stock The Lot (VIN Scanner & Carfax)',
      ],
    },
    {
      id: 'CENTRAL_OFFICE',
      name: 'Executive Central Office',
      price: '$299',
      period: 'per month / franchise',
      badge: 'Multi-Store HQ',
      badgeColor: '#8b5cf6',
      desc: 'Master umbrella oversight for franchise dealerships managing multiple store branches.',
      icon: 'Building2',
      features: [
        'Multi-Store Dealership Umbrella (Dallas, Houston, Austin)',
        'Consolidated Group P&L & Turn Days Telemetry',
        'Franchise Store License Allocations (3/5 Stores)',
        'DMV Audit Risk & Regulatory Safeguards',
        'Team Management & Granular RBAC Permissions',
      ],
    },
    {
      id: 'BUNDLE',
      name: 'Complete Enterprise Suite',
      price: '$399',
      period: 'per month (Save $49)',
      badge: 'Best Value Bundle',
      badgeColor: '#f59e0b',
      desc: 'Full-featured enterprise power including CRM, Desking, and Executive Central Office.',
      icon: 'Sparkles',
      features: [
        'All OMP CRM Pro & 24/7 AI Voice Receptionist',
        'All Executive Central Office Multi-Store Controls',
        'Unlimited Dealership Lot DMS Feed Syncs',
        'Priority Lender Marketplace Approvals',
        'Dedicated Enterprise Account Executive',
      ],
      isBundle: true,
    },
  ];

  res.json({ success: true, data: plans });
});

// 2. Get User's Active Subscriptions
router.get('/', requireAuth, async (req, res) => {
  try {
    const userSubs = await prisma.userSubscription.findMany({
      where: { userId: req.user.id, active: true }
    });
    
    // Always include MARKETPLACE for free
    const activeTiers = ['MARKETPLACE', ...userSubs.map(s => s.tier)];
    
    res.json({ success: true, data: [...new Set(activeTiers)] });
  } catch (err) {
    console.error('Failed to get subscriptions:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 3. Toggle Subscription
router.post('/toggle', requireAuth, async (req, res) => {
  try {
    const { tierId } = req.body;
    
    // Check if it already exists
    const existing = await prisma.userSubscription.findFirst({
      where: { userId: req.user.id, tier: tierId }
    });

    if (existing) {
      // Toggle active status
      await prisma.userSubscription.update({
        where: { id: existing.id },
        data: { active: !existing.active }
      });
    } else {
      // Create new
      await prisma.userSubscription.create({
        data: {
          userId: req.user.id,
          tier: tierId,
          active: true
        }
      });
    }

    const userSubs = await prisma.userSubscription.findMany({
      where: { userId: req.user.id, active: true }
    });
    
    const activeTiers = ['MARKETPLACE', ...userSubs.map(s => s.tier)];

    res.json({ success: true, data: [...new Set(activeTiers)] });
  } catch (err) {
    console.error('Failed to toggle subscription:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
