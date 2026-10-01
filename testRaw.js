const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', database: 'omp_deals' });
  const [rows] = await conn.query('SELECT COUNT(*) as count FROM vehicle');
  console.log('Vehicles:', rows[0].count);
  const [rows2] = await conn.query('SELECT COUNT(*) as count FROM Store');
  console.log('Stores:', rows2[0].count);
  await conn.end();
}
run().catch(console.error);
