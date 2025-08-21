import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  
  try {
    const body = await req.json()
    const { partyId, shipmentType, modeId, serviceTypeId, distanceSlabId, slabId, rate, fuel_pct = 0, handling = 0, gst_pct = 0, is_active = true } = body || {}
    
    if (!partyId || !shipmentType || !modeId || !serviceTypeId || !distanceSlabId || !slabId || rate == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Get before state for audit
    const beforeRes = await db.query('SELECT * FROM party_rate_slabs WHERE id = $1', [id])
    const before = beforeRes.rows[0]
    
    if (!before) {
      return NextResponse.json({ error: 'Rate not found' }, { status: 404 })
    }

    // Update the rate
    const q = `
      UPDATE party_rate_slabs 
      SET party_id=$1, shipment_type=$2, mode_id=$3, service_type_id=$4, 
          distance_slab_id=$5, slab_id=$6, rate=$7, fuel_pct=$8, 
          handling=$9, gst_pct=$10, is_active=$11, updated_at=now() 
      WHERE id=$12 
      RETURNING *
    `
    const v = [
      partyId, shipmentType, modeId, serviceTypeId, distanceSlabId, 
      slabId, rate, fuel_pct, handling, gst_pct, is_active, id
    ]
    
    let updated
    try {
      const res = await db.query(q, v)
      updated = res.rows[0]
    } catch (e: any) {
      // Handle unique key conflict gracefully
      if (e?.code === '23505') {
        const conflictRes = await db.query(
          `SELECT * FROM party_rate_slabs WHERE party_id=$1 AND shipment_type=$2 AND mode_id=$3 AND service_type_id=$4 AND distance_slab_id=$5 AND slab_id=$6 LIMIT 1`,
          [partyId, shipmentType, modeId, serviceTypeId, distanceSlabId, slabId]
        )
        const conflict = conflictRes.rows?.[0]
        return NextResponse.json(
          { error: 'Duplicate mapping exists', conflictId: conflict?.id, conflict },
          { status: 409 }
        )
      }
      throw e
    }

    // Log to audit (jsonb)
    try {
      await db.query(
        `INSERT INTO rate_audits(party_rate_slab_id, action, before_data, after_data) 
         VALUES ($1, 'UPDATE', $2::jsonb, $3::jsonb)`,
        [id, JSON.stringify(before), JSON.stringify(updated)]
      )
    } catch {}

    return NextResponse.json({ data: updated })
  } catch (e: any) {
    console.error('Update rate error', e)
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    // Get before state for audit
    const beforeRes = await db.query('SELECT * FROM party_rate_slabs WHERE id = $1', [id])
    const before = beforeRes.rows[0]
    
    if (!before) {
      return NextResponse.json({ error: 'Rate not found' }, { status: 404 })
    }

    // Soft delete
    const res = await db.query(
      'UPDATE party_rate_slabs SET is_active = FALSE, updated_at = now() WHERE id = $1 RETURNING *',
      [id]
    )
    const deleted = res.rows[0]

    // Log to audit (jsonb)
    await db.query(
      `INSERT INTO rate_audits(party_rate_slab_id, action, before_data) 
       VALUES ($1, 'DELETE', $2::jsonb)`,
      [id, JSON.stringify(before)]
    )

    return NextResponse.json({ data: deleted })
  } catch (e: any) {
    console.error('Delete rate error', e)
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
