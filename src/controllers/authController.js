const authService = require('../services/authService');

class AuthController {
  async login(req, res) {
    try {
      const { email, password, roleId } = req.body;
      const { token, user } = await authService.login(email, password, roleId);
      
      res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          role: user.role,
          name: user.full_name,
          email: user.email,
          dealershipId: user.storeId,
          defaultRoute: user.defaultRoute
        }
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.status === 401 ? 'UNAUTHORIZED' : 'LOGIN_FAILED',
          message: error.message || 'An error occurred during login'
        }
      });
    }
  }

  async quickDemo(req, res) {
    try {
      const { roleId } = req.body;
      const { token, user } = await authService.quickDemo(roleId);
      
      res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          role: user.role,
          name: user.full_name,
          email: user.email,
          dealershipId: user.storeId,
          defaultRoute: user.defaultRoute
        }
      });
    } catch (error) {
      console.error('Quick Demo Login Error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: 'DEMO_LOGIN_FAILED',
          message: error.message || 'An error occurred during demo login'
        }
      });
    }
  }
}

module.exports = new AuthController();
