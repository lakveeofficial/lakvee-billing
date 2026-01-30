import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const result = await db.query(`
      SELECT
        b.id,
        b.bill_number,
        b.bill_date,
        b.total_amount,
        b.status,
        b.created_at,
        p.id as party_id,
        p.party_name,
        MIN(CASE 
          WHEN bb.booking_type = 'account' THEN ab.booking_date
          WHEN bb.booking_type = 'cash' THEN cb.date
        END) as start_date,
        MAX(CASE 
          WHEN bb.booking_type = 'account' THEN ab.booking_date
          WHEN bb.booking_type = 'cash' THEN cb.date
        END) as end_date,
        COUNT(bb.booking_id) as booking_count,
        0 as total_paid
      FROM bills b
      JOIN parties p ON b.party_id = p.id
      LEFT JOIN bill_bookings bb ON b.id = bb.bill_id
      LEFT JOIN account_bookings ab ON bb.booking_id = ab.id AND bb.booking_type = 'account'
      LEFT JOIN cash_bookings cb ON bb.booking_id = cb.id AND bb.booking_type = 'cash'
      WHERE b.bill_type = 'period'
      GROUP BY b.id, b.bill_number, b.bill_date, b.total_amount, b.status, b.created_at, p.id, p.party_name
      ORDER BY b.created_at DESC
    `);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Failed to fetch period bills:', error);
    return NextResponse.json({ error: 'Failed to fetch period bills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { partyId, dateFrom, dateTo } = await request.json();

    // Fallback user ID
    const user = { id: 1 };

    if (!partyId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'partyId, dateFrom, and dateTo are required' }, { status: 400 });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // First, get the party name
      const partyResult = await client.query('SELECT party_name FROM parties WHERE id = $1', [partyId]);
      if (partyResult.rows.length === 0) {
        return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
      }
      const partyName = partyResult.rows[0].party_name;

      // Get ALL bookings for this party in the date range (including already billed ones)
      const bookingsQuery = `
        SELECT id, 'account' as type FROM account_bookings 
        WHERE LOWER(TRIM(sender)) = LOWER(TRIM($1)) 
        AND booking_date BETWEEN $2 AND $3
        UNION ALL
        SELECT id, 'cash' as type FROM cash_bookings 
        WHERE LOWER(TRIM(sender)) = LOWER(TRIM($1)) 
        AND date BETWEEN $2 AND $3
      `;
      const bookingsResult = await client.query(bookingsQuery, [partyName, dateFrom, dateTo]);
      const bookings = bookingsResult.rows;

      if (bookings.length === 0) {
        return NextResponse.json({
          error: `No bookings found for "${partyName}" between ${dateFrom} and ${dateTo}.`
        }, { status: 404 });
      }

      const totalAmountQuery = `
        SELECT SUM(amount) as total FROM (
          SELECT COALESCE(net_amount, gross_amount, 0) as amount FROM account_bookings WHERE id = ANY($1::int[])
          UNION ALL
          SELECT COALESCE(net_amount, gross_amount, 0) as amount FROM cash_bookings WHERE id = ANY($2::int[])
        ) as amounts
      `;
      const accountBookingIds = bookings.filter(b => b.type === 'account').map(b => b.id);
      const cashBookingIds = bookings.filter(b => b.type === 'cash').map(b => b.id);
      const totalAmountResult = await client.query(totalAmountQuery, [accountBookingIds, cashBookingIds]);
      const totalAmount = totalAmountResult.rows[0].total || 0;

      const billNumber = `PERIOD-${Date.now()}`;
      const billInsertQuery = `
        INSERT INTO bills (party_id, bill_number, bill_date, total_amount, created_by, bill_type)
        VALUES ($1, $2, CURRENT_DATE, $3, $4, 'period')
        RETURNING id
      `;
      const billResult = await client.query(billInsertQuery, [partyId, billNumber, totalAmount, user.id]);
      const billId = billResult.rows[0].id;

      const billBookingsInsertQuery = `
        INSERT INTO bill_bookings (bill_id, booking_id, booking_type)
        SELECT $1, id, type FROM UNNEST($2::int[], $3::text[]) AS t(id, type)
      `;
      await client.query(billBookingsInsertQuery, [billId, bookings.map(b => b.id), bookings.map(b => b.type)]);

      await client.query('COMMIT');
      return NextResponse.json({ success: true, billId });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to generate period bill:', error);
      return NextResponse.json({ error: 'Failed to generate period bill' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in period bill route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
