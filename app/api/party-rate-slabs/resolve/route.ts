import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const partyId = Number(searchParams.get('partyId'))
  const shipmentType = (searchParams.get('shipmentType') || '').toUpperCase() as 'DOCUMENT' | 'NON_DOCUMENT' | null
  const modeId = Number(searchParams.get('modeId'))
  const serviceTypeId = Number(searchParams.get('serviceTypeId'))
  const distanceSlabId = Number(searchParams.get('distanceSlabId'))
  const weightGrams = searchParams.get('weightGrams')
  const slabIdParam = searchParams.get('slabId')

  if (!partyId || !shipmentType || !modeId || !serviceTypeId || !distanceSlabId || (!weightGrams && !slabIdParam)) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  try {
    let slabId: number | null = slabIdParam ? Number(slabIdParam) : null
    let slabName: string | null = null
    
    if (!slabId && weightGrams) {
      const w = Number(weightGrams)
      const slabRes = await db.query(
        `SELECT id, slab_name FROM weight_slabs 
        WHERE is_active = TRUE AND min_weight_grams <= $1 AND max_weight_grams >= $1 
        ORDER BY min_weight_grams LIMIT 1`,
        [w]
      )
      if (!slabRes.rows.length) {
        return NextResponse.json({ error: 'No matching weight slab found' }, { status: 404 })
      }
      slabId = slabRes.rows[0].id
      slabName = slabRes.rows[0].slab_name
    } else if (slabId) {
      const slabRes = await db.query('SELECT slab_name FROM weight_slabs WHERE id = $1', [slabId])
      if (slabRes.rows.length) slabName = slabRes.rows[0].slab_name
    }

    if (!slabId) {
      return NextResponse.json({ error: 'Could not determine weight slab' }, { status: 404 })
    }

    const rateRes = await db.query(
      `SELECT prs.*, ws.slab_name 
       FROM party_rate_slabs prs
       JOIN weight_slabs ws ON ws.id = prs.slab_id
       WHERE prs.party_id = $1 
         AND UPPER(prs.shipment_type) = $2 
         AND prs.mode_id = $3 
         AND prs.service_type_id = $4 
         AND prs.distance_slab_id = $5 
         AND prs.slab_id = $6 
         AND prs.is_active = TRUE
       LIMIT 1`,
      [partyId, shipmentType, modeId, serviceTypeId, distanceSlabId, slabId]
    )

    if (!rateRes.rows.length) {
      return NextResponse.json({ 
        error: 'No rate configured for this combination',
        slabId,
        slabName
      }, { status: 404 })
    }

    const rate = rateRes.rows[0]
    return NextResponse.json({
      data: {
        slabId: rate.slab_id,
        slabName: rate.slab_name,
        baseRate: parseFloat(rate.rate),
        fuelPct: parseFloat(rate.fuel_pct),
        packing: rate.packing != null ? parseFloat(rate.packing) : null,
        handling: parseFloat(rate.handling),
        gstPct: parseFloat(rate.gst_pct)
      }
    })
  } catch (e: any) {
    console.error('Resolve error', e)
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic' // Ensure fresh data on every request
