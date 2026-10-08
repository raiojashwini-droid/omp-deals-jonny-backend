const prisma = require('../config/prisma');
const ompEmitter = require('./eventEmitter');

class NotificationService {
  constructor() {
    this.registerListeners();
  }

  registerListeners() {
    ompEmitter.on('new_lead', async (lead) => {
      await this.notifyStoreRoles(lead.storeId, lead, ['LIAISON', 'SALES_MGR']);
    });

    ompEmitter.on('lead_assigned', async ({ lead, assigneeId }) => {
      await this.createNotification(assigneeId, lead);
    });
  }

  async notifyStoreRoles(storeId, lead, roles) {
    if (!storeId) return;
    try {
      const users = await prisma.user.findMany({
        where: {
          storeId,
          role: { in: roles }
        }
      });
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      for (const user of users) {
        await prisma.leadNotification.create({
          data: {
            leadId: lead.id,
            userId: user.id,
            expiresAt
          }
        });
      }
    } catch (err) {
      console.error('Failed to notify store roles:', err);
    }
  }

  async createNotification(userId, lead) {
    if (!userId) return;
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      await prisma.leadNotification.create({
        data: {
          leadId: lead.id,
          userId: userId,
          expiresAt
        }
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }
}

module.exports = new NotificationService();
