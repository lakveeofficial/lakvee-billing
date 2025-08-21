import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper: INR rounding to 2 decimals
const to2 = (n: any) => {
  const v = Number(n)
  if (!isFinite(v)) return 0
  return Math.round(v * 100) / 100
}

// Helper: normalize to SQL DATE string (YYYY-MM-DD). Returns null if invalid.
function toSqlDateOnly(input: any): string | null {
  if (!input) return null
  // Already YYYY-MM-DD
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  try {
    const d = new Date(input)
    if (isNaN(d.getTime())) return null
    // Use UTC ISO and take date part to avoid timezone issues like 'GMT+0530'
    return d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

// Helper: build invoice number
function buildInvoiceNumber() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const t = String(now.getTime()).slice(-6)
  return `PI-${y}${m}${d}-${t}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rowIds: string[] = Array.isArray(body?.rowIds) ? body.rowIds.map((x: any) => String(x)) : []
    const partyName = body?.partyName ? String(body.partyName) : undefined
    const gstPercentOverride = body?.gst_percent != null ? Number(body.gst_percent) : undefined
    const shipmentType = body?.shipment_type ? String(body.shipment_type) : undefined
    const mode = body?.mode ? String(body.mode) : undefined
    const serviceType = body?.service_type ? String(body.service_type) : undefined
    const distanceRegion = body?.distance_region ? String(body.distance_region) : undefined
    const weightSlab = body?.weight_slab ? String(body.weight_slab) : undefined
    const baseRate = body?.base_rate != null ? Number(body.base_rate) : undefined
    const fuelPct = body?.fuel_pct != null ? Number(body.fuel_pct) : undefined
    const packingAmt = body?.packing != null ? Number(body.packing) : undefined
    const handlingAmt = body?.handling != null ? Number(body.handling) : undefined
    const periodFrom = body?.period_from ? String(body.period_from) : undefined
    const periodTo = body?.period_to ? String(body.period_to) : undefined
    const paymentMode = body?.payment_mode ? String(body.payment_mode) : undefined

    if (!rowIds.length) {
      return NextResponse.json({ error: 'rowIds is required' }, { status: 400 })
    }

    // Check if invoice_id column exists (for compatibility if migration hasn't been run yet)
    const colCheck = await db.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'csv_invoices' AND column_name = 'invoice_id' LIMIT 1`
    )
    const hasInvoiceLink = !!colCheck.rows?.length

    // Fetch CSV rows
    const placeholders = rowIds.map((_: unknown, i: number) => `$${i + 1}`).join(',')
    const sql = `
      SELECT id, booking_date, consignment_no, booking_reference, mode, service_type, region,
             weight, retail_price, final_collected, sender_name, recipient_name, pricing_meta
             ${hasInvoiceLink ? ', invoice_id' : ''}
      FROM csv_invoices
      WHERE id IN (${placeholders})
    `
    const res = await db.query(sql, rowIds)
    let rows: any[] = res.rows || []

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No rows found for given ids' }, { status: 404 })
    }

    // If a party was chosen explicitly, restrict to that party's consignments
    const norm = (v: any) => String(v || '').trim().toLowerCase()
    if (partyName) {
      const target = norm(partyName)
      rows = rows.filter(r => norm(r.sender_name) === target)
      if (rows.length === 0) {
        return NextResponse.json({ error: 'No consignments match the selected party' }, { status: 400 })
      }
    }

    // Validate same party (ignore blank sender_name)
    const allParties = rows.map(r => norm(r.sender_name))
    const nonEmpty = new Set(allParties.filter(p => p.length > 0))
    if (!partyName) {
      if (nonEmpty.size !== 1) {
        return NextResponse.json({ error: 'All rows must belong to the same party', detail: `Found parties: ${Array.from(nonEmpty).join(', ') || 'none'}` }, { status: 400 })
      }
    }

    const party_display = partyName || String(rows[0].sender_name || 'Unknown Party')

    // Prevent double billing: ensure none of the selected rows are already linked
    if (hasInvoiceLink) {
      const alreadyInvoiced = rows.filter((r: any) => r.invoice_id != null)
      if (alreadyInvoiced.length > 0) {
        const details = alreadyInvoiced.map((r: any) => r.consignment_no || r.booking_reference || r.id).slice(0, 10)
        const more = alreadyInvoiced.length > 10 ? ` and ${alreadyInvoiced.length - 10} more` : ''
        return NextResponse.json({ error: 'Some consignments are already invoiced', details: details.join(', ') + more }, { status: 400 })
      }
    }

    // Compute lines
    type Line = {
      description: string
      booking_date: string | null
      unit_price: number
      total_price: number
      subtotal: number
      gst: number
      base?: number
      fuel?: number
      packing?: number
      handling?: number
      gst_pct?: number
      consignment_no?: string
    }

    const lines: Line[] = []

    for (const r of rows) {
      const meta: any = r?.pricing_meta || {}
      const rb: any = meta?.rate_breakup || {}
      // If overrides provided, use them; else use per-row breakup
      const base = baseRate != null ? to2(baseRate) : to2(rb.base ?? rb.baseRate ?? meta.base ?? 0)
      const fuel = fuelPct != null ? to2(base * (Number(fuelPct) / 100)) : to2(rb.fuel ?? 0)
      const packing = packingAmt != null ? to2(packingAmt) : to2(rb.packing ?? 0)
      const handling = handlingAmt != null ? to2(handlingAmt) : to2(rb.handling ?? 0)
      const subtotal = to2(base + fuel + packing + handling)
      const gstPct = gstPercentOverride != null ? to2(gstPercentOverride) : to2(rb.gstPct ?? rb.gst_pct ?? meta.gst_percent ?? 18)
      const gst = to2(subtotal * (gstPct / 100))
      const total = to2(subtotal + gst)

      const descLeft = r.consignment_no || r.booking_reference || r.id
      const descRight = r.region || ''
      let description = descRight ? `${descLeft} — ${descRight}` : String(descLeft)
      if (description.length > 255) description = description.slice(0, 252) + '…'

      lines.push({
        description,
        booking_date: toSqlDateOnly(r.booking_date),
        unit_price: total,
        total_price: total,
        subtotal,
        gst,
        base,
        fuel,
        packing,
        handling,
        gst_pct: gstPct,
        consignment_no: r.consignment_no || null,
      })
    }

    // Aggregate totals
    const subtotalSum = to2(lines.reduce((s, l) => s + (l.subtotal || 0), 0))
    const gstSum = to2(lines.reduce((s, l) => s + (l.gst || 0), 0))
    const totalSum = to2(lines.reduce((s, l) => s + (l.total_price || 0), 0))

    // Insert invoice + items in a transaction
    const client = await (db as any).connect?.() || null
    const runner = client || db
    try {
      if (client) await client.query('BEGIN')

      // Ensure party exists in parties table, or create stub
      const partyNameKey = party_display.trim()
      let partyId: number | null = null
      {
        const r = await runner.query('SELECT id FROM parties WHERE LOWER(party_name)=LOWER($1) LIMIT 1', [partyNameKey])
        if (r.rows?.length) partyId = Number(r.rows[0].id)
        else {
          const ins = await runner.query('INSERT INTO parties (party_name) VALUES ($1) RETURNING id', [partyNameKey])
          partyId = Number(ins.rows[0].id)
        }
      }

      const invoice_number = buildInvoiceNumber()
      const today = new Date()
      const invoice_date = today.toISOString().slice(0, 10)
      const due_date = undefined

      const slab_breakdown = {
        shipment_type: shipmentType,
        mode,
        service_type: serviceType,
        distance_region: distanceRegion,
        weight_slab: weightSlab,
        base_rate: baseRate,
        fuel_pct: fuelPct,
        packing: packingAmt,
        handling: handlingAmt,
        gst_percent: gstPercentOverride,
      }

      // Detect invoices.slab_breakdown column
      const invColCheck = await runner.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'slab_breakdown' LIMIT 1`
      )
      const hasSlabBreakdown = !!invColCheck.rows?.length

      let invIns
      if (hasSlabBreakdown) {
        invIns = await runner.query(
          `INSERT INTO invoices (invoice_number, party_id, invoice_date, due_date, subtotal, tax_amount, total_amount, notes, slab_breakdown)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING id`,
          [
            invoice_number,
            partyId,
            invoice_date,
            due_date ?? null,
            subtotalSum,
            gstSum,
            totalSum,
            [periodFrom && `Period From: ${periodFrom}`, periodTo && `Period To: ${periodTo}`, paymentMode && `Payment Mode: ${paymentMode}`].filter(Boolean).join(' | ') || null,
            JSON.stringify(slab_breakdown),
          ]
        )
      } else {
        invIns = await runner.query(
          `INSERT INTO invoices (invoice_number, party_id, invoice_date, due_date, subtotal, tax_amount, total_amount, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [
            invoice_number,
            partyId,
            invoice_date,
            due_date ?? null,
            subtotalSum,
            gstSum,
            totalSum,
            [periodFrom && `Period From: ${periodFrom}`, periodTo && `Period To: ${periodTo}`, paymentMode && `Payment Mode: ${paymentMode}`].filter(Boolean).join(' | ') || null,
          ]
        )
      }
      const invoiceId = Number(invIns.rows[0].id)

      // Detect invoice_items.booking_date column
      const iiColCheck = await runner.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'booking_date' LIMIT 1`
      )
      const hasBookingDate = !!iiColCheck.rows?.length

      for (const l of lines) {
        if (hasBookingDate) {
          await runner.query(
            `INSERT INTO invoice_items (invoice_id, item_description, quantity, unit_price, total_price, booking_date)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [invoiceId, l.description, 1, l.unit_price, l.total_price, l.booking_date]
          )
        } else {
          await runner.query(
            `INSERT INTO invoice_items (invoice_id, item_description, quantity, unit_price, total_price)
             VALUES ($1,$2,$3,$4,$5)`,
            [invoiceId, l.description, 1, l.unit_price, l.total_price]
          )
        }
      }

      // Link csv rows to this invoice (only if column exists)
      if (hasInvoiceLink) {
        const ph2 = rowIds.map((_: unknown, i: number) => `$${i + 2}`).join(',')
        await runner.query(
          `UPDATE csv_invoices SET invoice_id = $1 WHERE id IN (${ph2})`,
          [invoiceId, ...rowIds]
        )
      }

      if (client) await client.query('COMMIT')

      return NextResponse.json({ id: invoiceId, invoice_number, totals: { subtotal: subtotalSum, gst: gstSum, total: totalSum } }, { status: 201 })
    } catch (e: any) {
      if (client) await client.query('ROLLBACK')
      console.error('Party invoice creation failed:', e)
      return NextResponse.json({ error: 'Failed to create invoice', detail: e?.message }, { status: 500 })
    } finally {
      if (client) client.release()
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad Request' }, { status: 400 })
  }
}
