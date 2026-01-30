import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/bills/generate - Generate a bill and save to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Generate bill request:', body)

    const {
      party_id,
      invoice_number,
      invoice_date,
      total_amount,
      base_amount,
      service_charges,
      fuel_charges,
      other_charges,
      cgst_amount,
      sgst_amount,
      igst_amount,
      template,
      send_email,
      selected_bookings
    } = body

    // Validate that selected bookings (if any) all belong to the selected party
    if (party_id && Array.isArray(selected_bookings) && selected_bookings.length > 0) {
      const partyRes = await db.query('SELECT party_name FROM parties WHERE id = $1', [party_id])
      if (partyRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Invalid party selected' }, { status: 400 })
      }
      const partyName = String(partyRes.rows[0].party_name || '')
      const accountIds = selected_bookings.filter((x: any) => x && x.booking_type === 'account').map((x: any) => x.id)
      const cashIds = selected_bookings.filter((x: any) => x && x.booking_type === 'cash').map((x: any) => x.id)

      if (accountIds.length > 0) {
        const accCntRes = await db.query(
          `SELECT COUNT(*) AS cnt FROM account_bookings WHERE id = ANY($1::int[]) AND LOWER(TRIM(sender)) = LOWER(TRIM($2))`,
          [accountIds, partyName]
        )
        const matched = Number(accCntRes.rows?.[0]?.cnt || 0)
        if (matched !== accountIds.length) {
          return NextResponse.json({ success: false, error: 'Selected account bookings do not match the selected party' }, { status: 400 })
        }
      }

      if (cashIds.length > 0) {
        const cashCntRes = await db.query(
          `SELECT COUNT(*) AS cnt FROM cash_bookings WHERE id = ANY($1::int[]) AND LOWER(TRIM(sender)) = LOWER(TRIM($2))`,
          [cashIds, partyName]
        )
        const matched = Number(cashCntRes.rows?.[0]?.cnt || 0)
        if (matched !== cashIds.length) {
          return NextResponse.json({ success: false, error: 'Selected cash bookings do not match the selected party' }, { status: 400 })
        }
      }
    }

    // Insert bill into database
    const billResult = await db.query(
      `INSERT INTO bills (
        party_id, bill_number, bill_date, base_amount, service_charges, 
        fuel_charges, other_charges, cgst_amount, sgst_amount, igst_amount,
        total_amount, template, email_sent, status, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
      ) RETURNING *`,
      [
        party_id,
        invoice_number,
        invoice_date,
        base_amount || 0,
        service_charges || 0,
        fuel_charges || 0,
        other_charges || 0,
        cgst_amount || 0,
        sgst_amount || 0,
        igst_amount || 0,
        total_amount,
        template || 'Default',
        send_email || false,
        'generated'
      ]
    )

    const bill = billResult.rows[0]

    // If selected bookings are provided, persist mapping to this bill
    if (Array.isArray(selected_bookings) && selected_bookings.length > 0) {
      // Ensure mapping table exists (idempotent)
      await db.query(`
        CREATE TABLE IF NOT EXISTS bill_bookings (
          id SERIAL PRIMARY KEY,
          bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
          booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('account','cash')),
          booking_id INTEGER NOT NULL
        )
      `)

      // Insert mappings
      for (const item of selected_bookings) {
        if (!item || typeof item.id !== 'number') continue
        const btype = (item.booking_type === 'cash') ? 'cash' : 'account'
        await db.query(
          `INSERT INTO bill_bookings (bill_id, booking_type, booking_id) VALUES ($1, $2, $3)`,
          [bill.id, btype, item.id]
        )
      }

      // Check if base_amount differs from sum of account bookings
      // If so, update the bookings to match the new base_amount.
      // Strategy: Update the last booking with the remainder/difference.
      // This is a heuristic to ensure the sum matches what the user entered.
      if (base_amount !== undefined && base_amount !== null) {
        const accountIds = selected_bookings.filter((x: any) => x && x.booking_type === 'account').map((x: any) => x.id)

        if (accountIds.length > 0) {
          // Calculate current sum
          const sumRes = await db.query(
            `SELECT SUM(COALESCE(net_amount, gross_amount, 0)) as total FROM account_bookings WHERE id = ANY($1::int[])`,
            [accountIds]
          )
          const currentSum = Number(sumRes.rows[0]?.total || 0)

          if (Math.abs(currentSum - base_amount) > 0.01) {
            const diff = base_amount - currentSum
            console.log(`Updating account bookings to match billed amount. Diff: ${diff}`)

            // Apply diff to the last booking ID
            const lastId = accountIds[accountIds.length - 1]
            await db.query(
              `UPDATE account_bookings 
                SET net_amount = COALESCE(net_amount, gross_amount, 0) + $1 
                WHERE id = $2`,
              [diff, lastId]
            )
          }
        }
      }
    }


    // Get party details for the bill
    const partyResult = await db.query(
      'SELECT * FROM parties WHERE id = $1',
      [party_id]
    )

    const party = partyResult.rows[0]

    return NextResponse.json({
      success: true,
      bill: {
        id: bill.id,
        billNumber: bill.bill_number,
        partyName: party?.party_name || 'Unknown',
        totalAmount: bill.total_amount,
        status: bill.status,
        createdAt: bill.created_at
      }
    })

  } catch (error) {
    console.error('Error generating bill:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate bill',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
