import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const partyId = searchParams.get('partyId')
  const shipmentType = searchParams.get('shipmentType')
  const modeId = searchParams.get('modeId')
  const serviceTypeId = searchParams.get('serviceTypeId')
  const distanceSlabId = searchParams.get('distanceSlabId')
  const slabId = searchParams.get('slabId')

  const conds: string[] = []
  const vals: any[] = []
  function add(c: string, v: any) { vals.push(v); conds.push(`${c} = $${vals.length}`) }
  if (partyId) add('party_id', Number(partyId))
  if (shipmentType) add('shipment_type', shipmentType)
  if (modeId) add('mode_id', Number(modeId))
  if (serviceTypeId) add('service_type_id', Number(serviceTypeId))
  if (distanceSlabId) add('distance_slab_id', Number(distanceSlabId))
  if (slabId) add('slab_id', Number(slabId))

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const res = await db.query(`SELECT * FROM party_rate_slabs ${where} ORDER BY id DESC`, vals)
  return NextResponse.json({ data: res.rows })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rows = Array.isArray(body) ? body : [body]
    const results: any[] = []

    for (const r of rows) {
      const { id, partyId, shipmentType, modeId, serviceTypeId, distanceSlabId, slabId, rate, fuel_pct = 0, packing = 0, handling = 0, gst_pct = 0, is_active = true } = r
      if (!partyId || !shipmentType || !modeId || !serviceTypeId || !distanceSlabId || !slabId || rate == null) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      }
      if (id) {
        const q = `UPDATE party_rate_slabs SET party_id=$1, shipment_type=$2, mode_id=$3, service_type_id=$4, distance_slab_id=$5, slab_id=$6, rate=$7, fuel_pct=$8, packing=$9, handling=$10, gst_pct=$11, is_active=$12 WHERE id=$13 RETURNING *`
        const v = [partyId, shipmentType, modeId, serviceTypeId, distanceSlabId, slabId, rate, fuel_pct, packing, handling, gst_pct, is_active, id]
        const res = await db.query(q, v)
        const updatedRow = res.rows?.[0]
        results.push(updatedRow)
        try {
          await db.query(
            `INSERT INTO rate_audits(party_rate_slab_id, action, before_data, after_data) VALUES ($1,'UPDATE', NULL, $2::jsonb)`,
            [updatedRow?.id, JSON.stringify(updatedRow)]
          )
        } catch {}
      } else {
        // Try insert; on duplicate, update existing row (reactivate if needed)
        const insertQ = `INSERT INTO party_rate_slabs(
            party_id, shipment_type, mode_id, service_type_id, distance_slab_id, slab_id,
            rate, fuel_pct, packing, handling, gst_pct, is_active
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          RETURNING *`
        const insertV = [partyId, shipmentType, modeId, serviceTypeId, distanceSlabId, slabId, rate, fuel_pct, packing, handling, gst_pct, is_active]
        try {
          const res = await db.query(insertQ, insertV)
          const created = res.rows?.[0]
          results.push(created)
          try {
            await db.query(
              `INSERT INTO rate_audits(party_rate_slab_id, action, after_data) VALUES ($1,'CREATE', $2::jsonb)`,
              [created?.id, JSON.stringify(created)]
            )
          } catch {}
        } catch (e: any) {
          // 23505 = unique_violation
          if (e?.code === '23505') {
            // Find the existing row matching the unique key
            const existing = await db.query(
              `SELECT * FROM party_rate_slabs WHERE party_id=$1 AND shipment_type=$2 AND mode_id=$3 AND service_type_id=$4 AND distance_slab_id=$5 AND slab_id=$6 LIMIT 1`,
              [partyId, shipmentType, modeId, serviceTypeId, distanceSlabId, slabId]
            )
            const existingRow = existing.rows?.[0]
            if (existingRow) {
              const updQ = `UPDATE party_rate_slabs
                SET rate=$1, fuel_pct=$2, packing=$3, handling=$4, gst_pct=$5,
                    is_active=$6
                WHERE id=$7
                RETURNING *`
              const updV = [rate, fuel_pct, packing, handling, gst_pct, true, existingRow.id]
              const updRes = await db.query(updQ, updV)
              const updated = updRes.rows?.[0]
              results.push(updated)
              try {
                await db.query(
                  `INSERT INTO rate_audits(party_rate_slab_id, action, before_data, after_data) VALUES ($1,'UPDATE', $2::jsonb, $3::jsonb)`,
                  [updated?.id, JSON.stringify(existingRow), JSON.stringify(updated)]
                )
              } catch {}
            } else {
              // If we can't find it, rethrow the original error
              throw e
            }
          } else {
            throw e
          }
        }
      }
    }

    return NextResponse.json({ data: results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
