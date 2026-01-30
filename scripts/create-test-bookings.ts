import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function inferSSLFromUrl(url?: string) {
  try {
    if (!url) return false
    const u = new URL(url)
    const host = (u.hostname || '').toLowerCase()
    return !(host === 'localhost' || host === '127.0.0.1')
  } catch {
    return process.env.NODE_ENV === 'production'
  }
}

const needsSSL = inferSSLFromUrl(process.env.DATABASE_URL)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});

async function createTestBookings() {
  const client = await pool.connect();
  try {
    console.log('Creating test bookings for October 2025...');

    // First, let's check if we have any parties
    const partiesResult = await client.query('SELECT id, party_name FROM parties LIMIT 5');
    console.log('Available parties:', partiesResult.rows);

    if (partiesResult.rows.length === 0) {
      console.log('Creating test party...');
      await client.query(`
        INSERT INTO parties (party_name, contact_person, phone, email, address, city, state)
        VALUES ('Test Company Ltd', 'John Doe', '9876543210', 'test@company.com', 'Test Address', 'Mumbai', 'Maharashtra')
        ON CONFLICT DO NOTHING
      `);
    }

    // Get a party to use for test bookings
    const partyResult = await client.query('SELECT id, party_name FROM parties LIMIT 1');
    const testParty = partyResult.rows[0];

    if (!testParty) {
      throw new Error('No parties found to create bookings for');
    }

    console.log('Using party:', testParty);

    // Create test bookings for October 2025
    const testBookings = [
      {
        date: '2025-10-01',
        sender: testParty.party_name,
        receiver: 'Customer A',
        mobile: '9876543210',
        carrier: 'Professional Courier',
        reference_number: 'REF001',
        package_type: 'DOCUMENT',
        weight: 0.5,
        number_of_boxes: 1,
        gross_amount: 150.00,
        other_charges: 10.00,
        insurance_amount: 5.00,
        net_amount: 165.00,
        remarks: 'Test booking 1'
      },
      {
        date: '2025-10-02',
        sender: testParty.party_name,
        receiver: 'Customer B',
        mobile: '9876543211',
        carrier: 'DTDC',
        reference_number: 'REF002',
        package_type: 'NON_DOCUMENT',
        weight: 2.0,
        number_of_boxes: 1,
        gross_amount: 250.00,
        other_charges: 15.00,
        insurance_amount: 10.00,
        net_amount: 275.00,
        remarks: 'Test booking 2'
      },
      {
        date: '2025-10-03',
        sender: testParty.party_name,
        receiver: 'Customer C',
        mobile: '9876543212',
        carrier: 'Blue Dart',
        reference_number: 'REF003',
        package_type: 'DOCUMENT',
        weight: 0.3,
        number_of_boxes: 1,
        gross_amount: 120.00,
        other_charges: 8.00,
        insurance_amount: 2.00,
        net_amount: 130.00,
        remarks: 'Test booking 3'
      }
    ];

    for (const booking of testBookings) {
      await client.query(`
        INSERT INTO account_bookings (
          booking_date, sender, receiver, mobile, carrier, reference_number,
          package_type, weight, number_of_boxes, gross_amount, other_charges,
          insurance_amount, net_amount, remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1)
        ON CONFLICT (reference_number) DO NOTHING
      `, [
        booking.date, booking.sender, booking.receiver, booking.mobile,
        booking.carrier, booking.reference_number, booking.package_type,
        booking.weight, booking.number_of_boxes, booking.gross_amount,
        booking.other_charges, booking.insurance_amount, booking.net_amount,
        booking.remarks
      ]);
    }

    // Also create some cash bookings
    console.log('Creating test cash bookings...');
    const cashBookings = [
      {
        date: '2025-10-01',
        sender: testParty.party_name,
        receiver: 'Cash Customer A',
        receiver_mobile: '9876543213',
        carrier: 'Professional Courier',
        reference_number: 'CASH001',
        package_type: 'DOCUMENT',
        weight: 0.2,
        number_of_boxes: 1,
        gross_amount: 100.00,
        insurance_amount: 3.00,
        net_amount: 103.00,
        remarks: 'Cash booking 1'
      },
      {
        date: '2025-10-02',
        sender: testParty.party_name,
        receiver: 'Cash Customer B',
        receiver_mobile: '9876543214',
        carrier: 'DTDC',
        reference_number: 'CASH002',
        package_type: 'NON_DOCUMENT',
        weight: 1.5,
        number_of_boxes: 1,
        gross_amount: 180.00,
        insurance_amount: 7.00,
        net_amount: 187.00,
        remarks: 'Cash booking 2'
      }
    ];

    for (const booking of cashBookings) {
      try {
        await client.query(`
          INSERT INTO cash_bookings (
            date, sender, receiver, receiver_mobile, carrier, reference_number,
            package_type, weight, number_of_boxes, gross_amount,
            insurance_amount, net_amount, remarks, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1)
          ON CONFLICT (reference_number) DO NOTHING
        `, [
          booking.date, booking.sender, booking.receiver, booking.receiver_mobile,
          booking.carrier, booking.reference_number, booking.package_type,
          booking.weight, booking.number_of_boxes, booking.gross_amount,
          booking.insurance_amount, booking.net_amount, booking.remarks
        ]);
      } catch (err) {
        console.log(`Error creating cash booking ${booking.reference_number}:`, err);
      }
    }

    console.log('✅ Test bookings created successfully!');
    console.log('Account bookings total:', testBookings.reduce((sum, b) => sum + b.net_amount, 0));
    console.log('Cash bookings total:', cashBookings.reduce((sum, b) => sum + b.net_amount, 0));
    console.log('Party name:', testParty.party_name);
    
    // Verify the bookings were created
    const verifyResult = await client.query(`
      SELECT COUNT(*), SUM(net_amount) as total_amount
      FROM account_bookings 
      WHERE booking_date >= '2025-10-01' AND booking_date <= '2025-10-31'
    `);
    
    console.log('Verification - Bookings in October 2025:', verifyResult.rows[0]);

  } catch (error) {
    console.error('❌ Error creating test bookings:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestBookings().catch(err => {
  console.error('A critical error occurred:', err);
  process.exit(1);
});
