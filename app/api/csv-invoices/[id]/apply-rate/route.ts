import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCsvInvoiceById, updateCsvInvoice } from '@/lib/csvInvoices'
import { resolveDistanceFromAddresses } from '@/lib/distance'

function toGrams(weightKg?: any, chargeableKg?: any): number | null {
  const n = Number(weightKg)
  if (Number.isFinite(n) && n > 0) return Math.round(n * 1000)
  const c = Number(chargeableKg)
  if (Number.isFinite(c) && c > 0) return Math.round(c * 1000)
  return null
}

function toEnumShipmentType(s?: string | null): 'DOCUMENT' | 'NON_DOCUMENT' {
  const v = String(s || '').trim().toUpperCase()
  // Treat common synonyms/prefixes as DOCUMENT
  if (v === 'DOCUMENT' || v.startsWith('DOC')) return 'DOCUMENT'
  return 'NON_DOCUMENT'
}

function up(s?: string | null) { return String(s || '').trim().toUpperCase() }

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const row = await getCsvInvoiceById(id)
    if (!row) return NextResponse.json({ error: 'Row not found' }, { status: 404 })

    // Resolve distance (sets region title if missing)
    const dist = await resolveDistanceFromAddresses(row.sender_address, row.recipient_address)

    // Map mode and service codes
    const modeCode = up(row.mode)
    const serviceCode = up(row.service_type)
    const shipType = toEnumShipmentType(row.shipment_type)

    const modeRes = await db.query(`SELECT id, code FROM modes WHERE is_active = true AND code = $1`, [modeCode])
    if ((modeRes as any).rowCount === 0) return NextResponse.json({ error: 'Mode not recognized' }, { status: 400 })
    const modeId = modeRes.rows[0].id as number

    const svcRes = await db.query(`SELECT id, code FROM service_types WHERE is_active = true AND code = $1`, [serviceCode])
    if ((svcRes as any).rowCount === 0) return NextResponse.json({ error: 'Service Type not recognized' }, { status: 400 })
    const serviceTypeId = svcRes.rows[0].id as number

    // Distance slab id: from dist or fallback from region title
    let distanceSlabId: number | null = dist.slabId
    if (!distanceSlabId) {
      const title = String(row.region || '').trim()
      if (title) {
        const dres = await db.query(`SELECT id FROM distance_slabs WHERE title ILIKE $1`, [title])
        if ((dres as any).rowCount > 0) distanceSlabId = dres.rows[0].id as number
      }
    }
    if (!distanceSlabId) return NextResponse.json({ error: 'Unable to resolve distance category' }, { status: 400 })

    // Weight slab by grams
    const grams = toGrams((row as any).weight, (row as any).chargeable_weight)
    if (!grams) return NextResponse.json({ error: 'Weight not available to determine slab' }, { status: 400 })
    const wres = await db.query(
      `SELECT id, slab_name FROM weight_slabs WHERE is_active = true AND $1 >= min_weight_grams AND $1 <= max_weight_grams LIMIT 1`,
      [grams]
    )
    if ((wres as any).rowCount === 0) return NextResponse.json({ error: 'No matching weight slab' }, { status: 400 })
    const weightSlabId = wres.rows[0].id as number

    // Party id by sender_name
    const partyName = String(row.sender_name || '').trim()
    if (!partyName) return NextResponse.json({ error: 'Sender/Party name missing' }, { status: 400 })
    const pres = await db.query(`SELECT id FROM parties WHERE LOWER(TRIM(party_name)) = LOWER(TRIM($1))`, [partyName])
    if ((pres as any).rowCount === 0) return NextResponse.json({ error: 'Party not found' }, { status: 400 })
    const partyId = pres.rows[0].id as number

    // Find party rate slab
    const rres = await db.query(
      `SELECT prs.id, prs.rate, prs.fuel_pct, prs.packing, prs.handling, prs.gst_pct
       FROM party_rate_slabs prs
       WHERE prs.is_active = true
         AND prs.party_id = $1
         AND prs.shipment_type = $2
         AND prs.mode_id = $3
         AND prs.service_type_id = $4
         AND prs.distance_slab_id = $5
         AND prs.slab_id = $6
       LIMIT 1`,
      [partyId, shipType, modeId, serviceTypeId, distanceSlabId, weightSlabId]
    )

    if ((rres as any).rowCount === 0) {
      // Include helpful diagnostics (frontend currently shows generic message for bulk runs)
      return NextResponse.json({
        error: 'No Party Rate Slab found for this scenario',
        diagnostics: {
          party: partyName,
          party_id: partyId,
          shipment_type: shipType,
          mode_id: modeId,
          service_type_id: serviceTypeId,
          distance_slab_id: distanceSlabId,
          weight_slab_id: weightSlabId,
          region_resolved: dist.title,
          grams
        }
      }, { status: 404 })
    }

    const rateRow = rres.rows[0] as { rate: string; fuel_pct: string; packing?: string; handling: string; gst_pct: string }
    const base = Number(rateRow.rate) || 0
    const fuelPct = Number(rateRow.fuel_pct) || 0
    const packing = Number((rateRow as any).packing) || 0
    const handling = Number(rateRow.handling) || 0
    const gstPct = Number(rateRow.gst_pct) || 0

    const fuel = +(base * fuelPct / 100).toFixed(2)
    const subtotal = +(base + fuel + packing + handling).toFixed(2)
    const gst = +(subtotal * gstPct / 100).toFixed(2)
    const total = +(subtotal + gst).toFixed(2)

    const pricing_meta = {
      source: 'party_rate_slab',
      party_id: partyId,
      shipment_type: shipType,
      mode_id: modeId,
      service_type_id: serviceTypeId,
      distance_slab_id: distanceSlabId,
      weight_slab_id: weightSlabId,
      distance: { code: dist.code, title: dist.title },
      rate_breakup: { base, fuelPct, fuel, packing, handling, gstPct, gst, subtotal, total },
    }

    const updated = await updateCsvInvoice(id, { calculated_amount: total, pricing_meta, region: dist.title || row.region })
    return NextResponse.json({ ok: true, calculated_amount: total, pricing_meta, row: updated })
  } catch (e: any) {
    console.error('apply-rate failed', e)
    return NextResponse.json({ error: 'apply-rate failed', details: e?.message }, { status: 500 })
  }
}
