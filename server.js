require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

// Health check endpoint (no auth required)
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'OMP Deals Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✅ OMP Deals Backend running on http://localhost:${PORT}`);
  console.log(`📡 Connected to MySQL via Prisma`);
});
