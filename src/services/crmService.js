const prisma = require('../config/prisma');

class CrmService {
  async getLeads(filters, user) {
    const { status, dealerId } = filters;
    const where = {};

    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!user.organizationId) {
        return { totalLeads: 0, buyNowCount: 0, leads: [] };
      }
      where.store = { organizationId: user.organizationId };
      if (dealerId) {
        where.storeId = dealerId;
      }
    } else {
      if (!user.storeId) {
        // No store association — return empty (GUEST, MEMBER, unscoped users)
        return { totalLeads: 0, buyNowCount: 0, leads: [] };
      }
      where.storeId = user.storeId;
    }

    if (status) where.status = status;

    if (['SALES_REP', 'BROKER', 'AMP_AFFILIATE'].includes(user.role)) {
      where.assignedToId = user.id;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        vehicle: { select: { id: true, title: true, selling_price: true, year: true, make: true, model: true, vin: true, lot_status: true } },
        assignedTo: { select: { id: true, full_name: true, roleName: true } },
        callLogs: { orderBy: { createdAt: 'desc' } },
        salesNotes: {
          include: { author: { select: { full_name: true, roleName: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: [
        { is_buy_now: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const emails = [...new Set(leads.map(l => l.customerEmail).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, createdAt: true }
    });
    const userCreatedAtMap = new Map(users.map(u => [u.email, u.createdAt]));

    const formattedLeads = leads.map(l => {
      const remainingMs = l.expires_at ? l.expires_at.getTime() - Date.now() : 0;
      const expiresInHours = remainingMs > 0 ? (remainingMs / (1000 * 60 * 60)).toFixed(1) : 0;

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
      
      let qualLabel = l.qualification ? labels[l.qualification] : l.buying_timeline;
      let qualColor = l.qualification ? colors[l.qualification] : '#64748b';
      let isNewLead = false;

      const userCreatedAt = l.customerEmail ? userCreatedAtMap.get(l.customerEmail) : null;
      if (userCreatedAt) {
        const ageHours = (Date.now() - new Date(userCreatedAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) {
          isNewLead = true;
          qualLabel = 'New Lead';
          qualColor = '#10b981';
        }
      }

      // Calculate deterministic Intent Score & Signals
      let baseScore = l.score || 50;
      const signals = [];

      if (l.is_buy_now || l.qualification === 'BUY_NOW') {
        baseScore = Math.max(baseScore, 95);
        signals.push('Selected "Buy Now" on AI Modal');
      } else if (l.qualification === 'BUYER_SHOPPING_AROUND') {
        baseScore = Math.max(baseScore, 82);
      } else if (l.qualification === 'TAKING_TIME') {
        baseScore = Math.max(baseScore, 65);
      }

      if (l.phone_consent) {
        baseScore = Math.min(100, baseScore + 8);
        signals.push('Consented to immediate dealer contact');
      }
      
      if (l.dwell_duration_seconds > 60) {
        baseScore = Math.min(100, baseScore + 5);
        signals.push(`High engagement: viewed listing for ${Math.floor(l.dwell_duration_seconds / 60)} mins`);
      } else {
        signals.push('Viewed vehicle listing');
      }

      if (isNewLead) {
        signals.push('Active in last 24 hours');
      }

      const intentTier = baseScore >= 90 ? 'HOT_LEAD' : baseScore >= 80 ? 'HIGH_INTENT' : 'WARM';

      return {
        id: l.id,
        customerName: l.customerName,
        customerPhone: l.phone_consent ? l.customerPhone : 'XXX-XXX-XXXX',
        customerEmail: l.customerEmail,
        phoneConsent: l.phone_consent,
        phone: l.phone_consent ? l.customerPhone : 'XXX-XXX-XXXX',
        
        vehicleInterest: l.vehicle ? l.vehicle.title : 'N/A',
        vehiclePrice: l.vehicle ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(l.vehicle.selling_price) : '$0',
        vehicleStock: l.vehicle ? l.vehicle.id.substring(0, 6).toUpperCase() : 'N/A',

        vehicleTitle: l.vehicle ? l.vehicle.title : 'N/A',
        price: l.vehicle ? l.vehicle.selling_price : 0,
        buyingTimeline: l.buying_timeline,
        qualification: l.qualification,
        qualificationLabel: qualLabel,
        qualificationColor: qualColor,
        isNewLead: isNewLead,
        isBuyNow: l.is_buy_now,
        createdAt: l.createdAt,
        expiresInHours: Number(expiresInHours),
        assignedTo: l.assignedTo ? l.assignedTo.full_name : null,
        assignedToRole: l.assignedTo ? l.assignedTo.roleName : null,
        status: l.status,
        
        intentScore: baseScore,
        intentTier: intentTier,
        signals: signals,
        
        channel: l.source || 'OfferUp',
        vehicle: {
          year: l.vehicle?.year || new Date().getFullYear(),
          make: l.vehicle?.make || 'Unknown',
          model: l.vehicle?.model || 'Unknown',
          vin: l.vehicle?.vin || 'N/A',
          price: l.vehicle ? `$${l.vehicle.selling_price.toLocaleString()}` : 'N/A',
          stock: l.vehicle ? l.vehicle.id.substring(0, 6).toUpperCase() : 'N/A',
        },
        messages: (l.salesNotes || []).map(n => ({
          sender: n.author && n.author.roleName === 'Buyer' ? 'buyer' : 'dealer',
          text: n.content,
          time: new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        })),
        lastMessage: l.salesNotes && l.salesNotes.length > 0 ? l.salesNotes[0].content : 'No messages yet',
        timestamp: new Date(l.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        unread: isNewLead,

        calls: (l.callLogs || []).map(c => ({
          outcome: c.disposition,
          timestamp: new Date(c.createdAt).toLocaleDateString() + ' ' + new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        })),
        notes: (l.salesNotes || []).map(n => ({
          id: n.id,
          author: n.author ? n.author.full_name : 'Unknown',
          text: n.content,
          timestamp: new Date(n.createdAt).toLocaleDateString() + ' ' + new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }))
      };
    });

    return {
      totalLeads: formattedLeads.length,
      buyNowCount: formattedLeads.filter(l => l.isBuyNow).length,
      leads: formattedLeads
    };
  }

  async getStaff(user) {
    if (user.role === 'EXECUTIVE_ADMIN' && !user.organizationId) {
      throw { status: 403, message: 'Executive is not associated with an organization' };
    }
    if (user.role !== 'EXECUTIVE_ADMIN' && !user.storeId) {
      throw { status: 403, message: 'User is not associated with a dealership' };
    }

    const where = {};
    if (user.role === 'EXECUTIVE_ADMIN') {
      where.store = { organizationId: user.organizationId };
    } else {
      where.storeId = user.storeId;
    }

    const staff = await prisma.user.findMany({
      where: {
        ...where,
        role: { in: ['SALES_MGR', 'SALES_REP', 'BROKER', 'AMP_AFFILIATE', 'DEALER_PRO'] }
      },
      select: {
        id: true,
        full_name: true,
        role: true,
        roleName: true,
        badge: true,
        leadsAssigned: {
          select: { id: true },
          where: { status: { notIn: ['Closed_Won', 'Closed_Lost', 'Expired'] } }
        }
      }
    });

    return staff.map(s => ({
      id: s.id,
      name: s.full_name,
      role: s.role,
      roleName: s.roleName,
      badge: s.badge,
      leadsCount: s.leadsAssigned.length,
      avatar: s.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    }));
  }

  async assignLead(leadId, assignmentData, user) {
    const { assigneeUserId, liaisonNotes } = assignmentData;
    if (!assigneeUserId) throw { status: 400, message: 'assigneeUserId is required' };

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { store: { select: { organizationId: true } } } });
    if (!lead) throw { status: 404, message: 'Lead not found' };

    // VULN-03 FIX: Inverted guard — non-admin users MUST have a storeId AND it must match.
    // Previously `user.storeId &&` allowed null-storeId users to skip the check entirely.
    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!user.organizationId || lead.store?.organizationId !== user.organizationId) {
        throw { status: 403, message: 'Access denied: Lead does not belong to your organization' };
      }
    } else {
      if (!user.storeId || lead.storeId !== user.storeId) {
        throw { status: 403, message: 'Access denied: You cannot assign a lead outside your dealership' };
      }
    }

    const assignee = await prisma.user.findUnique({ where: { id: assigneeUserId }, include: { store: { select: { organizationId: true } } } });
    if (!assignee) throw { status: 404, message: 'Assignee user not found' };

    // Assignee must also belong to the same store (or exec admin can assign cross-store)
    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!assignee.store?.organizationId || assignee.store.organizationId !== user.organizationId) {
        throw { status: 403, message: 'Access denied: Assignee does not belong to your organization' };
      }
    } else {
      if (!assignee.storeId || assignee.storeId !== user.storeId) {
        throw { status: 403, message: 'Access denied: You cannot assign a lead to a representative outside your dealership' };
      }
    }

    const [updatedLead, note] = await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          assignedToId: assigneeUserId,
          status: 'Assigned'
        }
      }),
      prisma.salesNote.create({
        data: {
          leadId: leadId,
          authorId: user.id,
          content: liaisonNotes ? `Liaison assigned to ${assignee.full_name}: ${liaisonNotes}` : `Liaison assigned to ${assignee.full_name}`
        }
      })
    ]);

    const ompEmitter = require('./eventEmitter');
    ompEmitter.emit('lead_assigned', { lead: updatedLead, assigneeId: assigneeUserId });

    return {
      leadId: updatedLead.id,
      status: updatedLead.status,
      assignedTo: assignee.full_name,
      updatedAt: updatedLead.updatedAt
    };
  }

  async logCall(callData, user) {
    const { leadId, repUserId, callDisposition, durationSeconds, scheduledTestDrive } = callData;

    if (!leadId || !callDisposition) {
      throw { status: 400, message: 'leadId and callDisposition are required' };
    }

    // If repUserId is explicitly provided and is different from the caller, only a manager+ can do that
    if (repUserId && user.role === 'SALES_REP' && user.id !== repUserId) {
      throw { status: 403, message: 'Cannot log calls on behalf of another rep' };
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { store: { select: { organizationId: true } } } });
    if (!lead) throw { status: 404, message: 'Lead not found' };

    // VULN-04 FIX: Same inverted guard as assignLead — null storeId users cannot log calls.
    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!user.organizationId || lead.store?.organizationId !== user.organizationId) {
        throw { status: 403, message: 'Access denied: Lead does not belong to your organization' };
      }
    } else {
      if (!user.storeId || lead.storeId !== user.storeId) {
        throw { status: 403, message: 'Access denied: You cannot log calls for a lead outside your dealership' };
      }
    }

    const [callLog, updatedLead] = await prisma.$transaction([
      prisma.callLog.create({
        data: {
          leadId,
          repId: repUserId || user.id,
          disposition: callDisposition,
          duration_seconds: durationSeconds || 0,
          scheduled_test_drive: scheduledTestDrive ? new Date(scheduledTestDrive) : null
        }
      }),
      // Transition lead status if appropriate
      prisma.lead.update({
        where: { id: leadId },
        data: {
          status: callDisposition.includes('Test Drive') ? 'Test_Drive_Scheduled' : 'In_Progress'
        }
      })
    ]);

    return {
      success: true,
      callLogId: callLog.id,
      newLeadStatus: updatedLead.status
    };
  }

  async addNote(leadId, noteData, user) {
    const { content } = noteData;

    if (!content) {
      throw { status: 400, message: 'Note content is required' };
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { store: { select: { organizationId: true } } } });
    if (!lead) throw { status: 404, message: 'Lead not found' };

    // VULN-02 FIX: addNote was missing dealership scope enforcement.
    // Any CRM-role user could add notes to any lead by knowing the lead UUID.
    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!user.organizationId || lead.store?.organizationId !== user.organizationId) {
        throw { status: 403, message: 'Access denied: Lead does not belong to your organization' };
      }
    } else {
      if (!user.storeId || lead.storeId !== user.storeId) {
        throw { status: 403, message: 'Access denied: You cannot add notes to a lead outside your dealership' };
      }
    }

    const note = await prisma.salesNote.create({
      data: {
        leadId,
        authorId: user.id,
        content
      }
    });

    return {
      success: true,
      noteId: note.id,
      timestamp: note.createdAt
    };
  }

  async getLeadMessages(leadId, user) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { store: { select: { organizationId: true } } } });
    if (!lead) throw { status: 404, message: 'Lead not found' };

    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!user.organizationId || lead.store?.organizationId !== user.organizationId) {
        throw { status: 403, message: 'Access denied: Lead does not belong to your organization' };
      }
    } else if (user.role !== 'GUEST') {
      if (!user.storeId || lead.storeId !== user.storeId) {
        throw { status: 403, message: 'Access denied to this lead\'s messages' };
      }
    }

    const messages = await prisma.leadMessage.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, full_name: true, roleName: true } }
      }
    });

    return {
      success: true,
      messages
    };
  }

  async sendLeadMessage(leadId, messageData, user) {
    const { content } = messageData;
    if (!content) throw { status: 400, message: 'Message content is required' };

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { store: { select: { organizationId: true } } } });
    if (!lead) throw { status: 404, message: 'Lead not found' };

    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!user.organizationId || lead.store?.organizationId !== user.organizationId) {
        throw { status: 403, message: 'Access denied: Lead does not belong to your organization' };
      }
    } else if (user.role !== 'GUEST') {
      if (!user.storeId || lead.storeId !== user.storeId) {
        throw { status: 403, message: 'Access denied: You cannot send messages to a lead outside your dealership' };
      }
    }

    const message = await prisma.leadMessage.create({
      data: {
        leadId,
        userId: user.id,
        content,
        isFromLead: false,
        source: 'OMP_INBOX'
      },
      include: {
        user: { select: { id: true, full_name: true, roleName: true } }
      }
    });

    // We can trigger SSE for real-time inbox updates here in the future
    return {
      success: true,
      message
    };
  }

  async updateLeadStatus(leadId, status, user) {
    if (!status) {
      throw { status: 400, message: 'Status is required' };
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { store: { select: { organizationId: true } } } });
    if (!lead) throw { status: 404, message: 'Lead not found' };

    if (user.role === 'EXECUTIVE_ADMIN') {
      if (!user.organizationId || lead.store?.organizationId !== user.organizationId) {
        throw { status: 403, message: 'Access denied: Lead does not belong to your organization' };
      }
    } else {
      if (!user.storeId || lead.storeId !== user.storeId) {
        throw { status: 403, message: 'Access denied: You cannot update status of a lead outside your dealership' };
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { status }
    });

    return {
      success: true,
      leadId: updatedLead.id,
      status: updatedLead.status
    };
  }
}

module.exports = new CrmService();
