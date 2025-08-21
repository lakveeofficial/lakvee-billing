import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const partyRateSlabId = searchParams.get('partyRateSlabId')
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
  const offset = Number(searchParams.get('offset')) || 0

  try {
    const query = `
      SELECT ra.*, u.name as changed_by_name 
      FROM rate_audits ra
      LEFT JOIN users u ON u.id::text = ra.changed_by
      ${partyRateSlabId ? 'WHERE ra.party_rate_slab_id = $1' : ''}
      ORDER BY ra.changed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const params = partyRateSlabId ? [partyRateSlabId] : []
    const res = await db.query(query, params)
    
    return NextResponse.json({ data: res.rows })
  } catch (e: any) {
    console.error('Audit log error', e)
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
