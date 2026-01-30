import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/billing/debug?month=2025-10
// Debug endpoint to see booking data and party matching
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const month = url.searchParams.get('month') || '2025-10'

    // Temporary fix: Delete payment if requested
    const action = url.searchParams.get('action')
    const id = url.searchParams.get('id')
    if (action === 'delete_payment' && id) {
      await db.query('DELETE FROM party_payments WHERE id = $1', [id])
      return NextResponse.json({ success: true, message: `Deleted payment ${id}` })
    }

    // Build date range for the month
    const from = `${month}-01`
    const to = `${month}-31`

    // Get all account bookings for the month
    const accountBookings = await db.query(
      `
        SELECT 
          id,
          booking_date as date,
          sender,
          receiver,
          gross_amount,
          net_amount,
          'account' as booking_type,
          created_at
        FROM account_bookings
        WHERE booking_date >= $1 AND booking_date <= $2
        ORDER BY booking_date DESC
      `,
      [from, to]
    )

    // Get all cash bookings for the month
    const cashBookings = await db.query(
      `
        SELECT 
          id,
          date,
          sender,
          receiver,
          gross_amount,
          net_amount,
          'cash' as booking_type,
          created_at
        FROM cash_bookings
        WHERE date >= $1 AND date <= $2
        ORDER BY date DESC
      `,
      [from, to]
    )

    // Get all parties
    const parties = await db.query(
      `
        SELECT 
          id,
          party_name,
          client_type
        FROM parties
        ORDER BY party_name
      `
    )

    // Get combined booking summary by sender
    const summary = await db.query(
      `
        WITH combined_summary AS (
          SELECT 
            sender,
            COUNT(*) as booking_count,
            SUM(COALESCE(net_amount, gross_amount, 0)) AS total_amount,
            'account' as booking_type
          FROM account_bookings
          WHERE booking_date >= $1 AND booking_date <= $2
          GROUP BY sender
          
          UNION ALL
          
          SELECT 
            sender,
            COUNT(*) as booking_count,
            SUM(COALESCE(net_amount, gross_amount, 0)) AS total_amount,
            'cash' as booking_type
          FROM cash_bookings
          WHERE date >= $1 AND date <= $2
          GROUP BY sender
        )
        SELECT 
          sender,
          SUM(booking_count) as total_booking_count,
          SUM(total_amount) AS total_amount,
          STRING_AGG(DISTINCT booking_type, ', ') AS booking_types
        FROM combined_summary
        GROUP BY sender
        ORDER BY total_amount DESC
      `,
      [from, to]
    )

    // Debug: Get bills and bill mappings
    const bills = await db.query('SELECT * FROM bills ORDER BY created_at DESC LIMIT 5')
    const billMappings = await db.query('SELECT * FROM bill_bookings ORDER BY id DESC LIMIT 20')
    const payments = await db.query('SELECT * FROM party_payments ORDER BY id DESC LIMIT 20')
    const party4Sum = await db.query('SELECT SUM(amount) as total FROM party_payments WHERE party_id = 4')
    const party4Rows = await db.query('SELECT * FROM party_payments WHERE party_id = 4')

    // Combine all bookings for display
    const allBookings = [
      ...accountBookings.rows,
      ...cashBookings.rows
    ].sort((a, b) => new Date(b.date || b.booking_date).getTime() - new Date(a.date || a.booking_date).getTime())

    return NextResponse.json({
      success: true,
      data: {
        month,
        dateRange: { from, to },
        accountBookings: accountBookings.rows,
        cashBookings: cashBookings.rows,
        allBookings: allBookings,
        parties: parties.rows,
        summary: summary.rows,
        bills: bills.rows,
        billMappings: billMappings.rows,
        payments: payments.rows,
        party4Sum: party4Sum.rows,
        party4Rows: party4Rows.rows
      }
    })
  } catch (e) {
    console.error('billing debug error', e)
    return NextResponse.json({ success: false, error: 'Failed to load debug data' }, { status: 500 })
  }
}
