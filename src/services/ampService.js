const prisma = require('../config/prisma');

class AmpService {
  async trackClick(clickData) {
    const { refCode } = clickData;

    if (!refCode) {
      throw { status: 400, message: 'refCode is required' };
    }

    const affiliateLink = await prisma.affiliateLink.findUnique({
      where: { ref_code: refCode }
    });

    if (!affiliateLink) {
      throw { status: 404, message: 'Invalid or expired referral code' };
    }

    await prisma.affiliateLink.update({
      where: { id: affiliateLink.id },
      data: {
        total_clicks: { increment: 1 }
      }
    });

    return { success: true, message: 'Click tracked successfully' };
  }

  async getDashboardStats(user) {
    // Allow EXECUTIVE_ADMIN to view any affiliate's stats
    if (user.role !== 'AMP_AFFILIATE' && user.role !== 'EXECUTIVE_ADMIN') {
      throw { status: 403, message: 'Only AMP Affiliates can access these stats' };
    }

    const affiliateLink = await prisma.affiliateLink.findFirst({
      where: { userId: user.id }
    });

    // Get leads referred by this affiliate
    const leads = await prisma.lead.findMany({
      where: { amp_affiliate_id: user.id },
      include: {
        vehicle: {
          select: {
            id: true,
            title: true,
            selling_price: true,
            year: true,
            make: true,
            model: true,
            vin: true,
          }
        }
      },
      orderBy: [
        { is_buy_now: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const qualifiedLeads = leads.length;

    // Count deals sourced from this affiliate's leads
    const leadIds = leads.map(l => l.id);
    const closedDeals = leadIds.length > 0 ? await prisma.deal.count({
      where: {
        leadId: { in: leadIds },
        status: 'CLOSED'
      }
    }) : 0;

    // Pending commissions: sum of PENDING commissions for this user
    const pendingCommissions = await prisma.commission.aggregate({
      where: { userId: user.id, status: 'PENDING' },
      _sum: { amount: true },
      _count: { id: true }
    });

    const commissionRate = affiliateLink?.commission_rate || 250;
    const totalCommissionEarned = affiliateLink?.total_commission_paid || 0;
    const pendingAmount = pendingCommissions._sum.amount || 0;
    const pendingCount = pendingCommissions._count.id || 0;

    // Format leads for frontend consumption
    const labels = {
      'BUY_NOW': 'BUY NOW (Within 24hrs)',
      'BUYER_SHOPPING_AROUND': 'Buyer Shopping Around',
      'TAKING_TIME': 'Taking Time',
      'SHOPPING_AROUND': 'Shopping Around',
      'NEW_LEAD': 'New Lead'
    };
    const colors = {
      'BUY_NOW': '#ef4444',
      'BUYER_SHOPPING_AROUND': '#f59e0b',
      'TAKING_TIME': '#3b82f6',
      'SHOPPING_AROUND': '#64748b',
      'NEW_LEAD': '#10b981'
    };

    const formattedLeads = leads.map(l => {
      const ageHours = (Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
      const isNewLead = ageHours < 24;
      const qualLabel = isNewLead ? 'New Lead' : (l.qualification ? labels[l.qualification] : l.buying_timeline || 'New Lead');
      const qualColor = isNewLead ? '#10b981' : (l.qualification ? colors[l.qualification] : '#64748b');

      return {
        id: l.id,
        customerName: l.customerName,
        customerPhone: l.phone_consent ? l.customerPhone : 'XXX-XXX-XXXX',
        customerEmail: l.customerEmail,
        phoneConsent: l.phone_consent,
        vehicleInterest: l.vehicle ? l.vehicle.title : 'N/A',
        vehiclePrice: l.vehicle ? `$${l.vehicle.selling_price?.toLocaleString() || 0}` : '$0',
        vehicleStock: l.vehicle ? (l.vehicle.stock_number || l.vehicle.id.substring(0, 6).toUpperCase()) : 'N/A',
        status: l.status,
        qualification: l.qualification,
        qualificationLabel: qualLabel,
        qualificationColor: qualColor,
        isNewLead,
        isBuyNow: l.is_buy_now,
        commissionValue: commissionRate,
        createdAt: l.createdAt,
      };
    });

    return {
      affiliateName: user.full_name,
      campaignCode: affiliateLink?.ref_code || `amp_${user.full_name?.toLowerCase().replace(/\s+/g, '_') || 'affiliate'}`,
      totalClicks: affiliateLink?.total_clicks || 0,
      totalSales: affiliateLink?.total_sales || 0,
      qualifiedLeads,
      carsSold: closedDeals,
      commissionPerSale: commissionRate,
      totalCommissionEarned,
      pendingCommissions: pendingAmount,
      pendingDealsCount: pendingCount,
      payoutStatus: affiliateLink ? 'Active' : 'No active campaign',
      leads: formattedLeads,
    };
  }
}

module.exports = new AmpService();
