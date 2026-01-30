import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const regionId = url.searchParams.get('regionId')
  const q = regionId
    ? await db.query(`SELECT qd.*, r.name as region_name, ws.slab_name, ws.min_weight_grams, ws.max_weight_grams FROM quotation_defaults qd
        LEFT JOIN regions r ON r.id = qd.region_id
        LEFT JOIN weight_slabs ws ON ws.id = qd.slab_id
        WHERE qd.region_id = $1 ORDER BY ws.min_weight_grams`, [regionId])
    : await db.query(`SELECT qd.*, r.name as region_name, ws.slab_name, ws.min_weight_grams, ws.max_weight_grams FROM quotation_defaults qd
        LEFT JOIN regions r ON r.id = qd.region_id
        LEFT JOIN weight_slabs ws ON ws.id = qd.slab_id
        ORDER BY r.name, ws.min_weight_grams`)
  return NextResponse.json({ data: q.rows })
}

export async function POST(req: Request) {
  const { region_id, package_type, slab_id, base_rate, extra_per_1000g, notes } = await req.json()
  await db.query(`INSERT INTO quotation_defaults(region_id, package_type, slab_id, base_rate, extra_per_1000g, notes)
    VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT (region_id, package_type, slab_id)
    DO UPDATE SET base_rate=EXCLUDED.base_rate, extra_per_1000g=EXCLUDED.extra_per_1000g, notes=EXCLUDED.notes`,
    [region_id || null, package_type, slab_id, base_rate, extra_per_1000g || 0, notes || null])
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  await db.query('DELETE FROM quotation_defaults WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
