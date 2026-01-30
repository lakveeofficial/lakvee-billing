import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/billing/summary?month=2025-09
// Returns booking totals per party for the given month with invoice status if already billed
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const month = url.searchParams.get('month') // YYYY-MM

  try {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, error: 'month (YYYY-MM) is required' }, { status: 400 })
    }

    // Build date range for the month
    const from = `${month}-01`
    const to = `${month}-31`

    // Aggregate bookings by party (sender) for the month - combining account and cash bookings
    const result = await db.query(
      `
        WITH combined_bookings AS (
          -- Account bookings
          SELECT 
            COALESCE(sender, '') AS party_name,
            id,
            COALESCE(net_amount, gross_amount, 0) AS amount,
            'account' as booking_type
          FROM account_bookings
          WHERE booking_date >= $1 AND booking_date <= $2
          
          UNION ALL
          
          -- Cash bookings
          SELECT 
            COALESCE(sender, '') AS party_name,
            id,
            COALESCE(net_amount, gross_amount, 0) AS amount,
            'cash' as booking_type
          FROM cash_bookings
          WHERE date >= $1 AND date <= $2
        ),
        booking_bills AS (
          SELECT 
            cb.*,
            bi.bill_id
          FROM combined_bookings cb
          LEFT JOIN bill_bookings bi ON cb.id = bi.booking_id AND cb.booking_type = bi.booking_type
          LEFT JOIN bills b ON bi.bill_id = b.id
          WHERE b.bill_type IS DISTINCT FROM 'period' OR b.id IS NULL
        ),
        booking_summary AS (
          SELECT 
            LOWER(TRIM(party_name)) as norm_name,
            MIN(party_name) as display_name,
            SUM(amount) AS total_booking_amount,
            COUNT(*) AS total_booking_count,
            SUM(CASE WHEN bill_id IS NULL THEN amount ELSE 0 END) as unbilled_amount,
            SUM(CASE WHEN bill_id IS NOT NULL THEN amount ELSE 0 END) as billed_amount,
            COUNT(CASE WHEN bill_id IS NULL THEN 1 END) as unbilled_count,
            STRING_AGG(DISTINCT booking_type, ', ') AS booking_types
          FROM booking_bills
          GROUP BY LOWER(TRIM(party_name))
        ),
        party_mapping AS (
          SELECT id, LOWER(TRIM(party_name)) as norm_name, party_name
          FROM parties
        ),
        monthly_bills_raw AS (
          SELECT DISTINCT
            b.id,
            b.party_id,
            b.total_amount,
            b.bill_number
          FROM bills b
          JOIN bill_bookings bb ON b.id = bb.bill_id
          JOIN combined_bookings cb ON bb.booking_id = cb.id AND bb.booking_type = cb.booking_type
          WHERE b.bill_type IS DISTINCT FROM 'period'
        ),
        monthly_bills AS (
          SELECT 
            party_id,
            SUM(total_amount) as total_billed_amount,
            COUNT(*) as bill_count,
            MAX(id) as last_bill_id,
            STRING_AGG(bill_number, ', ') as bill_numbers
          FROM monthly_bills_raw
          GROUP BY party_id
        ),
        payments AS (
          SELECT party_id, SUM(amount - COALESCE(tds_deduct, 0) - COALESCE(discount, 0)) as total_paid
          FROM party_payments
          GROUP BY party_id
        )
        SELECT 
           pm.id as party_id,
           COALESCE(pm.party_name, bs.display_name) as party_name,
           bs.total_booking_amount as booking_amount,
           bs.total_booking_count as booking_count,
           bs.booking_types as booking_types,
           mb.last_bill_id as bill_id,
           mb.bill_numbers as bill_number,
           bs.billed_amount as billed_amount,
           COALESCE(mb.total_billed_amount, 0) as grand_total,
           COALESCE(pay.total_paid, 0) as total_paid,
           (COALESCE(mb.total_billed_amount, 0) - COALESCE(pay.total_paid, 0)) as balance_credit,
           bs.unbilled_amount as pending_amount,
           CASE 
             WHEN bs.unbilled_amount > 0 THEN 'Pending'
             WHEN mb.bill_count > 0 AND COALESCE(pay.total_paid, 0) >= mb.total_billed_amount THEN 'Paid'
             WHEN mb.bill_count > 0 AND COALESCE(pay.total_paid, 0) > 0 THEN 'Partially Paid'
             WHEN mb.bill_count > 0 THEN 'Billed'
             ELSE 'Pending'
           END as status
        FROM booking_summary bs
        LEFT JOIN party_mapping pm ON pm.norm_name = bs.norm_name
        LEFT JOIN monthly_bills mb ON pm.id = mb.party_id
        LEFT JOIN payments pay ON pm.id = pay.party_id
        ORDER BY party_name

      `,
      [from, to]
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (e) {
    console.error('billing summary error', e)
    return NextResponse.json({
      success: false,
      error: 'Failed to load summary',
      debug: {
        month: month,
        errorMessage: e instanceof Error ? e.message : String(e)
      }
    }, { status: 500 })
  }
}
