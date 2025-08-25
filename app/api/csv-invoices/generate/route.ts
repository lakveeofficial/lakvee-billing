import { NextRequest, NextResponse } from 'next/server'
import { db, generateInvoiceNumber } from '@/lib/db'
import { getUserFromRequest, hasRole } from '@/lib/auth'

// Generate consolidated invoices per party from csv_invoices
// Optional body: { party?: string }
export async function POST(request: NextRequest) {
  const client = await db.getClient()
  try {
    const user = await getUserFromRequest(request as any)
    const isOperator = user && (hasRole(user, 'billing_operator') || hasRole(user, 'admin'))
    if (!isOperator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json().catch(() => ({})) as { party?: string }
    let partyFilter = (body?.party || '').trim()
    let normalizedParty: string | null = null
    if (partyFilter) {
      const normRes = await client.query(
        `SELECT LOWER(TRIM(party_name)) AS name FROM parties WHERE LOWER(TRIM(party_name)) = LOWER(TRIM($1)) LIMIT 1`,
        [partyFilter]
      )
      normalizedParty = normRes.rows?.[0]?.name || null
      if (!normalizedParty) {
        return NextResponse.json({ error: `Party not found: ${partyFilter}` }, { status: 400 })
      }
    }

    // Load rows from csv_invoices, optionally filtered by normalized party (sender_name)
    const where = normalizedParty ? 'WHERE LOWER(TRIM(sender_name)) = $1' : ''
    const params: any[] = normalizedParty ? [normalizedParty] : []

    const { rows: csvRows } = await client.query(
      `SELECT * FROM csv_invoices ${where} ORDER BY sender_name, booking_date NULLS LAST, created_at` as string,
      params
    )

    if (!csvRows.length) {
      return NextResponse.json({ message: normalizedParty ? `No CSV invoices found for party: ${partyFilter}` : 'No CSV invoices to generate from', created: 0, invoices: [], errors: [] })
    }

    // Group by sender_name
    const groups = new Map<string, any[]>()
    for (const r of csvRows as any[]) {
      const key = String(r.sender_name || '').trim()
      if (!key) continue
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(r)
    }

    const results: { party: string; invoice_id?: string; count?: number; error?: string }[] = []

    // Process each party group
    for (const [partyName, rows] of Array.from(groups.entries())) {
      try {
        // Find party id by name (case-insensitive exact match)
        const { rows: partyRows } = await client.query(
          `SELECT id FROM parties WHERE LOWER(TRIM(party_name)) = LOWER(TRIM($1)) LIMIT 1`,
          [partyName]
        )
        const partyId = partyRows?.[0]?.id
        if (!partyId) {
          results.push({ party: partyName, error: 'Party not found' })
          continue
        }

        // Build items from csv rows
        type Item = { description: string; quantity: number; unit_price: number; total_price: number; booking_date: string | null }
        const items: Item[] = []
        let subtotal = 0
        for (const r of rows) {
          // Prefer calculated_amount if present, else fallback
          const price = Number((r as any).calculated_amount ?? r.final_collected ?? r.retail_price ?? 0) || 0
          const region = (r as any).region ? ` - ${r.region}` : ''
          const desc = `Consignment ${r.consignment_no || ''} - ${r.service_type || ''} - ${r.mode || ''}${region}`.trim()
          items.push({
            description: desc || 'Service Charge',
            quantity: 1,
            unit_price: price,
            total_price: price,
            booking_date: r.booking_date ? new Date(r.booking_date).toISOString().slice(0,10) : null,
          })
          subtotal += price
        }

        const tax_amount = 0
        const additional_charges = 0
        const total_amount = subtotal + tax_amount + additional_charges

        await client.query('BEGIN')
        const invoiceNumber = await generateInvoiceNumber()

        const invRes = await client.query(
          `INSERT INTO invoices (
            invoice_number, party_id, invoice_date, subtotal, tax_amount, additional_charges, received_amount, total_amount, notes, created_by,
            apply_slab, slab_amount, slab_breakdown
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          RETURNING id`,
          [
            invoiceNumber,
            partyId,
            new Date().toISOString().slice(0,10),
            null,
            subtotal,
            tax_amount,
            additional_charges,
            0, // received_amount
            total_amount,
            `Generated from ${rows.length} CSV invoice rows`,
            user!.id,
            false,
            0,
            null
          ]
        )
        const invoiceId = invRes.rows[0].id as string

        // Insert items
        for (const it of items) {
          await client.query(
            `INSERT INTO invoice_items (invoice_id, item_description, quantity, rate, amount, booking_date)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [invoiceId, it.description, it.quantity, it.unit_price, it.total_price, it.booking_date]
          )
        }

        await client.query('COMMIT')
        results.push({ party: partyName, invoice_id: invoiceId, count: rows.length })
      } catch (e: any) {
        await client.query('ROLLBACK')
        results.push({ party: partyName, error: e?.message || 'Failed to generate invoice' })
      }
    }

    const created = results.filter(r => r.invoice_id).length
    return NextResponse.json({ message: `Generated ${created} party invoice(s)`, created, invoices: results })
  } catch (err: any) {
    console.error('Generate consolidated invoices failed:', err)
    return NextResponse.json({ error: 'Failed to generate consolidated invoices', details: err?.message }, { status: 500 })
  } finally {
    client.release()
  }
}
