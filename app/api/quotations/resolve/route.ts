import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Resolve a quotation rate by region + package type + weight (grams)
// GET /api/quotations/resolve?regionId=&packageType=&weightGrams=
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const regionId = url.searchParams.get('regionId')
    const packageType = url.searchParams.get('packageType') as 'DOCUMENT' | 'NON_DOCUMENT' | null
    const weightGrams = Number(url.searchParams.get('weightGrams') || '0')

    if (!packageType) return NextResponse.json({ error: 'packageType is required' }, { status: 400 })

    // Find the weight slab
    const slabRes = await db.query(
      `SELECT id, slab_name, min_weight_grams, max_weight_grams
       FROM weight_slabs
       WHERE min_weight_grams <= $1 AND max_weight_grams > $1
       ORDER BY min_weight_grams LIMIT 1`,
      [weightGrams]
    )

    if (slabRes.rowCount === 0) {
      return NextResponse.json({ data: null, message: 'No matching weight slab' })
    }

    const slab = slabRes.rows[0]

    const q = await db.query(
      `SELECT qd.*, r.name as region_name
       FROM quotation_defaults qd
       LEFT JOIN regions r ON r.id = qd.region_id
       WHERE (qd.region_id = $1 OR $1 IS NULL) AND qd.package_type = $2 AND qd.slab_id = $3
       ORDER BY qd.region_id NULLS LAST LIMIT 1`,
      [regionId ? Number(regionId) : null, packageType, slab.id]
    )

    if (q.rowCount === 0) return NextResponse.json({ data: { slab, baseRate: 0 } })

    const row = q.rows[0]

    return NextResponse.json({
      data: {
        regionId: row.region_id,
        packageType,
        slabId: row.slab_id,
        slabName: slab.slab_name,
        baseRate: Number(row.base_rate || 0),
        extraPer1000g: Number(row.extra_per_1000g || 0),
        notes: row.notes || null,
      }
    })
  } catch (e: any) {
    console.error('resolve quotation error', e)
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
