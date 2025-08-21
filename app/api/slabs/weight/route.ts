import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const res = await db.query(`SELECT id, slab_name, min_weight_grams, max_weight_grams, is_active FROM weight_slabs ORDER BY min_weight_grams`)
  return NextResponse.json({ data: res.rows })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, slab_name, min_weight_grams, max_weight_grams, is_active = true } = body || {}
    if (!slab_name || min_weight_grams == null || max_weight_grams == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (id) {
      const r = await db.query(
        `UPDATE weight_slabs SET slab_name=$1, min_weight_grams=$2, max_weight_grams=$3, is_active=$4 WHERE id=$5 RETURNING *`,
        [slab_name, min_weight_grams, max_weight_grams, !!is_active, id]
      )
      return NextResponse.json({ data: r.rows?.[0] })
    }
    const r = await db.query(
      `INSERT INTO weight_slabs(slab_name, min_weight_grams, max_weight_grams, is_active) VALUES ($1,$2,$3,$4) RETURNING *`,
      [slab_name, min_weight_grams, max_weight_grams, !!is_active]
    )
    return NextResponse.json({ data: r.rows?.[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
