import { db } from '../lib/db.js';

async function removeDueDateColumn() {
  const client = await db.getClient();
  try {
    // Check if column exists before trying to drop it
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='invoices' AND column_name='due_date';
    `);

    if (checkResult.rows.length > 0) {
      console.log('Dropping due_date column from invoices table...');
      await client.query('ALTER TABLE invoices DROP COLUMN due_date');
      console.log('Successfully removed due_date column');
    } else {
      console.log('due_date column does not exist in invoices table');
    }
  } catch (error) {
    console.error('Error removing due_date column:', error);
  } finally {
    client.release();
  }
}

removeDueDateColumn()
  .catch(console.error);
