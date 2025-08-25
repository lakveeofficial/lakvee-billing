// Simple script to remove due_date column from invoices table
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function removeDueDateColumn() {
  const client = await pool.connect();
  try {
    console.log('Checking if due_date column exists in invoices table...');
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' AND column_name = 'due_date';
    `);

    if (checkResult.rows.length > 0) {
      console.log('Dropping due_date column from invoices table...');
      await client.query('ALTER TABLE invoices DROP COLUMN due_date');
      console.log('✅ Successfully removed due_date column');
    } else {
      console.log('ℹ️ due_date column does not exist in invoices table');
    }
  } catch (error) {
    console.error('❌ Error removing due_date column:', error);
  } finally {
    await client.release();
    await pool.end();
  }
}

removeDueDateColumn();
