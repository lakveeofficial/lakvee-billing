const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkDatabase() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');
    
    // Check if csv_invoices table exists
    const tableExists = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'csv_invoices')"
    );
    
    if (!tableExists.rows[0].exists) {
      console.error('Error: csv_invoices table does not exist');
      return;
    }
    
    console.log('csv_invoices table exists');
    
    // Get table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'csv_invoices'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nTable structure:');
    console.table(tableInfo.rows);
    
    // Check if any rows exist
    const rowCount = await client.query('SELECT COUNT(*) FROM csv_invoices');
    console.log(`\nTotal rows in csv_invoices: ${rowCount.rows[0].count}`);
    
  } catch (err) {
    console.error('Error checking database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase();
