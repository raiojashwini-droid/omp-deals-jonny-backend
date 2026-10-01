const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/jwt');

class AuthService {
  async login(email, password, roleId) {
    if (!email || !password) {
      throw { status: 400, message: 'Email and password are required' };
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { store: true }
    });

    if (!user) {
      throw { status: 401, message: 'Invalid credentials — email not found' };
    }

    // Optional role check: if roleId provided and doesn't match, warn
    // We allow login as long as password matches (role is set on the user record)
    if (!user.is_active) {
      throw { status: 403, message: 'Account is inactive. Contact support.' };
    }

    // Verify password if hash exists
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw { status: 401, message: 'Invalid password' };
      }
    }

    const token = generateToken(user);
    
    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        full_name: user.full_name,
        badge: user.badge,
        defaultRoute: user.defaultRoute,
        storeId: user.storeId,
        storeName: user.store?.name || null,
      }
    };
  }

  async quickDemo(roleId) {
    if (!roleId) {
      throw { status: 400, message: 'roleId is required' };
    }

    const user = await prisma.user.findFirst({
      where: { role: roleId, is_active: true },
      include: { store: true }
    });

    if (!user) {
      throw { status: 404, message: `No user found with role ${roleId}. Please run the seed script first.` };
    }

    const token = generateToken(user);
    
    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        full_name: user.full_name,
        badge: user.badge,
        defaultRoute: user.defaultRoute,
        storeId: user.storeId,
        storeName: user.store?.name || null,
      }
    };
  }
}

module.exports = new AuthService();
