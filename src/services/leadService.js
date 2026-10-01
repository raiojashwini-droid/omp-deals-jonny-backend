const prisma = require('../config/prisma');
const ompEmitter = require('./eventEmitter');

class LeadService {
  // caller: req.user (may be null for unauthenticated marketplace consumers)
  async createIntentLead(data, caller = null) {
    const { 
      vehicleId, 
      dealerId, 
      customerName, 
      phone, 
      buyingTimeline, 
      phoneConsent, 
      sourceRef, 
      dwellDurationSeconds 
    } = data;

    if (!customerName || !buyingTimeline) {
      throw { status: 400, message: 'Customer name and buying timeline are required.' };
    }

    if (phone && !phoneConsent) {
      throw { status: 400, message: 'TCPA Phone consent is required when a phone number is provided.' };
    }

    // VULN-08 FIX: Validate that the dealerId actually exists in our database.
    // This prevents lead-flooding attacks against arbitrary storeIds.
    if (dealerId) {
      const store = await prisma.store.findUnique({ where: { id: dealerId }, select: { id: true } });
      if (!store) {
        throw { status: 400, message: 'Invalid dealerId: store not found.' };
      }
    }

    // VULN-01-RESIDUAL FIX: When an authenticated user submits a lead, their storeId
    // must match the target dealerId.  Rules:
    //   • caller === null → unauthenticated marketplace consumer → allowed (End User flow)
    //   • caller.role === 'EXECUTIVE_ADMIN' → cross-store access allowed by design
    //   • all other authenticated callers → MUST own the dealership they are submitting to
    //     A null storeId on an authenticated user also fails this check (cannot own any store).
    if (caller !== null && caller.role !== 'EXECUTIVE_ADMIN' && dealerId) {
      if (!caller.storeId || caller.storeId !== dealerId) {
        throw { status: 403, message: 'Access denied: You may only submit leads for your own dealership.' };
      }
    }

    // VULN-09 FIX: Validate that vehicleId belongs to the stated dealerId.
    // Prevents leads from being attached to competitor inventory.
    if (vehicleId && dealerId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, storeId: dealerId },
        select: { id: true }
      });
      if (!vehicle) {
        throw { status: 400, message: 'Invalid vehicleId: vehicle does not belong to this dealership.' };
      }
    }

    const isBuyNow = data.qualification === 'BUY_NOW' || buyingTimeline === 'NOW or 24 hours';
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiration SLA

    // Handle AMP Affiliate Referral (if sourceRef looks like AMP-XXXX)
    let ampAffiliateId = null;
    if (sourceRef && sourceRef.startsWith('AMP-')) {
      const affiliate = await prisma.affiliateLink.findUnique({
        where: { ref_code: sourceRef }
      });
      if (affiliate) {
        ampAffiliateId = affiliate.userId;
      }
    }

    const leadData = {
      customerName,
      customerPhone: phone || null,
      buying_timeline: buyingTimeline,
      qualification: data.qualification || null,
      is_buy_now: isBuyNow,
      phone_consent: Boolean(phoneConsent),
      dwell_duration_seconds: dwellDurationSeconds || 10,
      status: 'New',
      expires_at: expiresAt,
      source: sourceRef || 'Marketplace Intent Modal'
    };

    if (vehicleId) leadData.vehicleId = vehicleId;
    if (dealerId) leadData.storeId = dealerId;
    if (ampAffiliateId) leadData.amp_affiliate_id = ampAffiliateId;

    // Save lead to database
    const lead = await prisma.lead.create({
      data: leadData,
      include: {
        vehicle: { select: { title: true, selling_price: true } }
      }
    });

    ompEmitter.emit('new_lead', lead);

    return {
      leadId: lead.id,
      isBuyNowHot: isBuyNow,
      assignedLiaison: null, // Will be picked up by liaison triage
      status: lead.status,
      message: isBuyNow 
        ? 'Qualified BUY NOW lead created. Red blinking alert broadcasted to Liaison Desk.' 
        : 'Lead successfully captured and routed to Standard Priority queue.'
    };
  }
}

module.exports = new LeadService();
