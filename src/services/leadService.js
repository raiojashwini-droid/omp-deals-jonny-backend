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
      dwellDurationSeconds,
      notes
    } = data;

    if (!customerName || !buyingTimeline) {
      throw { status: 400, message: 'Customer name and buying timeline are required.' };
    }

    if (phone && !phoneConsent) {
      throw { status: 400, message: 'TCPA Phone consent is required when a phone number is provided.' };
    }

    let validStore = null;
    if (dealerId) {
      validStore = await prisma.store.findUnique({ where: { id: dealerId }, select: { id: true, organizationId: true } });
      if (!validStore) {
        // Fallback: look up default store
        validStore = await prisma.store.findFirst({ select: { id: true, organizationId: true } });
      }
    } else {
      validStore = await prisma.store.findFirst({ select: { id: true, organizationId: true } });
    }

    // VULN-01-RESIDUAL FIX: When an authenticated user submits a lead, their storeId
    // must match the target dealerId.  Rules:
    //   • caller === null → unauthenticated marketplace consumer → allowed (End User flow)
    //   • caller.role === 'EXECUTIVE_ADMIN' → cross-store access allowed if dealerId belongs to their organization
    //   • all other authenticated callers → MUST own the dealership they are submitting to
    if (caller !== null && dealerId && validStore) {
      if (caller.role === 'EXECUTIVE_ADMIN') {
        if (!caller.organizationId || validStore.organizationId !== caller.organizationId) {
          throw { status: 403, message: 'Access denied: You may only submit leads for dealerships in your organization.' };
        }
      } else {
        if (!caller.storeId || caller.storeId !== dealerId) {
          throw { status: 403, message: 'Access denied: You may only submit leads for your own dealership.' };
        }
      }
    }

    let validVehicle = null;
    if (vehicleId) {
      validVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { id: true, storeId: true }
      });
      if (validVehicle && dealerId && validVehicle.storeId && validVehicle.storeId !== dealerId) {
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

    // Determine exact LeadQualification Enum based on requirements
    // Allowed Prisma Enum values: BUY_NOW, BUYER_SHOPPING_AROUND, TAKING_TIME, SHOPPING_AROUND, NEW_LEAD
    let mappedQualification = 'SHOPPING_AROUND';
    
    // Normalize string input from client
    const rawTimeline = String(buyingTimeline || '').toUpperCase();
    const rawQual = String(data.qualification || '').toUpperCase();

    if (rawQual === 'HOT' || rawQual === 'BUY_NOW' || rawTimeline === 'BUY_NOW' || rawTimeline.includes('NOW') || rawTimeline.includes('24 HOUR')) {
      mappedQualification = 'BUY_NOW';
    } else if (rawQual === 'WARM' || rawQual === 'BUYER_SHOPPING_AROUND' || rawTimeline === 'THIS_WEEK' || rawTimeline.includes('2-5 DAYS') || rawTimeline.includes('7')) {
      mappedQualification = 'BUYER_SHOPPING_AROUND';
    } else if (rawQual === 'TAKING_TIME' || rawTimeline === 'THIS_MONTH' || rawTimeline.includes('1 WEEK') || rawTimeline.includes('30')) {
      mappedQualification = 'TAKING_TIME';
    } else if (rawQual === 'NEW_LEAD') {
      mappedQualification = 'NEW_LEAD';
    } else {
      mappedQualification = 'SHOPPING_AROUND';
    }

    // NEW LEAD Check (Created within last 24 hours)
    if (caller && caller.createdAt) {
      const hoursSinceCreation = (new Date() - new Date(caller.createdAt)) / (1000 * 60 * 60);
      if (hoursSinceCreation <= 24 && mappedQualification !== 'BUY_NOW') {
        mappedQualification = 'NEW_LEAD';
      }
    }

    const leadData = {
      customerName,
      customerPhone: phone || null,
      customerEmail: data.email || data.customerEmail || null,
      notes: notes || data.notes || null,
      buying_timeline: buyingTimeline,
      qualification: mappedQualification,
      is_buy_now: isBuyNow,
      phone_consent: Boolean(phoneConsent),
      dwell_duration_seconds: dwellDurationSeconds || 10,
      status: 'New',
      expires_at: expiresAt,
      source: sourceRef || 'Marketplace Intent Modal'
    };

    if (validVehicle) leadData.vehicleId = validVehicle.id;
    if (validStore) leadData.storeId = validStore.id;
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
