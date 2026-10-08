
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const marketplaceRoutes = require('./routes/marketplace');
const dealersRoutes = require('./routes/dealers');
const leadsRoutes = require('./routes/leads');
const crmRoutes = require('./routes/crm');
const deskingRoutes = require('./routes/desking');
const ampRoutes = require('./routes/amp');
const safetyRoutes = require('./routes/safety');
const aiRoutes = require('./routes/ai');
const subscriptionsRoutes = require('./routes/subscriptions');
const permissionsRoutes = require('./routes/permissions');
const loansRoutes = require('./routes/loans');
const documentsRoutes = require('./routes/documents');
const contractsRoutes = require('./routes/contracts');
const executiveRoutes = require('./routes/executive');

const app = express();

// Initialize Services
require('./services/notificationService');

// Middleware

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/dealers', dealersRoutes);
app.use('/api/v1/leads', leadsRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/desking', deskingRoutes);
app.use('/api/v1/amp', ampRoutes);
app.use('/api/v1/safety', safetyRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/subscriptions', subscriptionsRoutes);
app.use('/api/v1/permissions', permissionsRoutes);
app.use('/api/v1/loans', loansRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/contracts', contractsRoutes);
app.use('/api/v1/executive', executiveRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  const status = err.status || 500;

  res.status(status).json({
    success: false,
    message:
      err.type === 'entity.too.large'
        ? 'Payload too large (images exceed limit)'
        : (err.message || 'Internal Server Error'),
    stack: err.stack
  });
});

module.exports = app;

