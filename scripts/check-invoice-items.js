const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTable() {
  const client = await pool.connect();
  try {
    console.log('Checking invoice_items table structure...');
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_items';
    `);
    
    console.log('invoice_items columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
  } catch (error) {
    console.error('Error checking table structure:', error);
  } finally {
    await client.release();
    await pool.end();
  }
}

checkTable();
