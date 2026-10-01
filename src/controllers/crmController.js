const prisma = require('../config/prisma');
const crmService = require('../services/crmService');
const ompEmitter = require('../services/eventEmitter');

class CrmController {
  async getLeads(req, res) {
    try {
      const filters = req.query;
      const user = req.user;
      
      const data = await crmService.getLeads(filters, user);
      
      res.status(200).json({ success: true, ...data });
    } catch (error) {
      console.error('Get Leads Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'FETCH_LEADS_FAILED', message: error.message || 'An error occurred while fetching leads' }
      });
    }
  }

  async getStaff(req, res) {
    try {
      const user = req.user;
      const staff = await crmService.getStaff(user);
      res.status(200).json({ success: true, staff });
    } catch (error) {
      console.error('Get Staff Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'FETCH_STAFF_FAILED', message: error.message || 'An error occurred while fetching staff' }
      });
    }
  }

  async assignLead(req, res) {
    try {
      const { id } = req.params;
      const assignmentData = req.body;
      const user = req.user;

      const result = await crmService.assignLead(id, assignmentData, user);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error('Assign Lead Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: error.status === 404 ? 'NOT_FOUND' : error.status === 403 ? 'FORBIDDEN' : 'ASSIGNMENT_FAILED', message: error.message || 'An error occurred while assigning the lead' }
      });
    }
  }

  async logCall(req, res) {
    try {
      const callData = req.body;
      const user = req.user;

      const result = await crmService.logCall(callData, user);
      res.status(201).json(result);
    } catch (error) {
      console.error('Log Call Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'CALL_LOG_FAILED', message: error.message || 'An error occurred while logging the call' }
      });
    }
  }

  async addNote(req, res) {
    try {
      const { id } = req.params;
      const noteData = req.body;
      const user = req.user;

      const result = await crmService.addNote(id, noteData, user);
      res.status(201).json(result);
    } catch (error) {
      console.error('Add Note Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'ADD_NOTE_FAILED', message: error.message || 'An error occurred while adding the note' }
      });
    }
  }

  async getLeadMessages(req, res) {
    try {
      const { id } = req.params;
      const result = await crmService.getLeadMessages(id, req.user);
      res.status(200).json(result);
    } catch (error) {
      console.error('Get Lead Messages Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'GET_MESSAGES_FAILED', message: error.message || 'An error occurred while fetching messages' }
      });
    }
  }

  async sendLeadMessage(req, res) {
    try {
      const { id } = req.params;
      const messageData = req.body;
      const user = req.user;

      const result = await crmService.sendLeadMessage(id, messageData, user);
      res.status(201).json(result);
    } catch (error) {
      console.error('Send Lead Message Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'SEND_MESSAGE_FAILED', message: error.message || 'An error occurred while sending the message' }
      });
    }
  }

  async streamNotifications(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const user = req.user;

    const onNewLead = (lead) => {
      // VULN-05 FIX: Previously `!user.storeId` caused unscoped users (GUEST, MEMBER,
      // unassigned BROKERs/AMPs) to receive every new lead from every store.
      // Now only EXECUTIVE_ADMIN (cross-store by design) or exact storeId match receive events.
      const isExecAdmin = user.role === 'EXECUTIVE_ADMIN';
      const isSameStore = user.storeId && user.storeId === lead.storeId;

      if (!isExecAdmin && !isSameStore) return;

      const labels = {
        'BUY_NOW': 'BUY NOW (Within 24hrs)',
        'BUYER_SHOPPING_AROUND': 'Buyer Shopping Around',
        'TAKING_TIME': 'Taking Time',
        'SHOPPING_AROUND': 'Shopping Around',
        'NEW_LEAD': 'New Lead'
      };
      const qualLabel = lead.qualification ? labels[lead.qualification] : lead.buying_timeline;

      const safeLead = {
        ...lead,
        qualificationLabel: qualLabel,
        customerPhone: lead.phone_consent ? lead.customerPhone : 'XXX-XXX-XXXX',
        phone: lead.phone_consent ? (lead.phone || lead.customerPhone) : 'XXX-XXX-XXXX',
      };
      res.write(`data: ${JSON.stringify(safeLead)}\n\n`);
    };

    ompEmitter.on('new_lead', onNewLead);

    req.on('close', () => {
      ompEmitter.off('new_lead', onNewLead);
    });
  }
  async getNotifications(req, res) {
    try {
      const user = req.user;
      
      const notifications = await prisma.leadNotification.findMany({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() }
        },
        include: {
          lead: {
            select: {
              customerName: true,
              qualification: true,
              vehicle: {
                select: {
                  title: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      res.status(200).json({ success: true, notifications });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
  }

  async markNotificationRead(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const notification = await prisma.leadNotification.findFirst({
        where: { id, userId: user.id }
      });

      if (!notification) {
        return res.status(404).json({ success: false, error: 'Notification not found' });
      }

      await prisma.leadNotification.update({
        where: { id },
        data: { read: true }
      });

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error marking notification read:', err);
      res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
  }

  async updateLeadStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;

      const result = await crmService.updateLeadStatus(id, status, user);
      res.status(200).json(result);
    } catch (error) {
      console.error('Update Lead Status Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: { code: 'UPDATE_STATUS_FAILED', message: error.message || 'An error occurred while updating the status' }
      });
    }
  }
}

module.exports = new CrmController();
