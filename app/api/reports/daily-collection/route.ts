import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/reports/daily-collection?date_from=&date_to=&party_id=&service_type_id=
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')
    const partyId = url.searchParams.get('party_id')
    const serviceTypeId = url.searchParams.get('service_type_id')

    const where: string[] = []
    const params: any[] = []

    if (dateFrom) { where.push(`i.invoice_date >= $${params.length + 1}`); params.push(dateFrom) }
    if (dateTo) { where.push(`i.invoice_date <= $${params.length + 1}`); params.push(dateTo) }
    if (partyId) { where.push(`i.party_id = $${params.length + 1}`); params.push(Number(partyId)) }
    if (serviceTypeId) { where.push(`ii.service_type_id = $${params.length + 1}`); params.push(Number(serviceTypeId)) }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT 
        i.invoice_date AS date,
        i.invoice_number,
        p.party_name AS client,
        ii.consignment_no,
        ii.shipment_type AS package_type,
        st.title AS courier, -- proxy
        COALESCE(ii.weight_kg, 0) AS weight,
        ii.total_price AS amount
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      LEFT JOIN parties p ON p.id = i.party_id
      LEFT JOIN service_types st ON st.id = ii.service_type_id
      ${whereSql}
      ORDER BY i.invoice_date DESC, i.id DESC
    `

    const rows = await db.query(sql, params)
    return NextResponse.json({ data: rows.rows })
  } catch (e: any) {
    console.error('daily-collection error', e)
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
