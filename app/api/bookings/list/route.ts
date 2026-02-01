import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bookings/list?month=YYYY-MM
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const month = url.searchParams.get('month') // YYYY-MM
  try {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, error: 'month (YYYY-MM) is required' }, { status: 400 })
    }

    // Ensure bill_bookings table exists (it might not if no bills have been generated yet)
    await db.query(`
      CREATE TABLE IF NOT EXISTS bill_bookings (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('account','cash')),
        booking_id INTEGER NOT NULL
      )
    `)

    // Build date range for the month correctly
    const [year, mm] = month.split('-').map(Number)
    const from = `${month}-01`
    const lastDay = new Date(Date.UTC(year, mm, 0)).getUTCDate()
    const to = `${month}-${lastDay}`
    // Get all account and cash bookings for the month with bill status
    // We check if the booking ID exists in bill_bookings for the given type
    // This assumes bill_bookings tracks all billed items.

    // Note: To be precise, we need to LEFT JOIN bill_bookings. Since we are doing two separate queries and merging,
    // we can do subqueries or check bill_bookings table.

    const accountRows = await db.query(
      `SELECT ab.*, 'account' as booking_type,
        CASE WHEN bb.id IS NOT NULL THEN true ELSE false END as is_billed
       FROM account_bookings ab
       LEFT JOIN bill_bookings bb ON bb.booking_type = 'account' AND bb.booking_id = ab.id
       LEFT JOIN bills b ON bb.bill_id = b.id
       WHERE ab.booking_date >= $1 AND ab.booking_date <= $2
         AND (b.bill_type IS DISTINCT FROM 'period' OR b.id IS NULL)`,
      [from, to]
    )

    const cashRows = await db.query(
      `SELECT cb.*, 'cash' as booking_type,
        CASE WHEN bb.id IS NOT NULL THEN true ELSE false END as is_billed
       FROM cash_bookings cb
       LEFT JOIN bill_bookings bb ON bb.booking_type = 'cash' AND bb.booking_id = cb.id
       LEFT JOIN bills b ON bb.bill_id = b.id
       WHERE cb.date >= $1 AND cb.date <= $2
         AND (b.bill_type IS DISTINCT FROM 'period' OR b.id IS NULL)`,
      [from, to]
    )

    const bookings = [
      ...(accountRows.rows || []),
      ...(cashRows.rows || [])
    ]
    return NextResponse.json({ success: true, data: bookings })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch bookings', details: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
