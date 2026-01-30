import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Monthly Business (Real Data from Invoices)
    // Last 6 months
    const monthlyRes = await db.query(`
      SELECT 
        TO_CHAR(invoice_date, 'Mon') as month,
        SUM(total_amount) as total
      FROM invoices
      WHERE invoice_date >= NOW() - INTERVAL '6 months'
      GROUP BY 1, TO_CHAR(invoice_date, 'YYYY-MM') 
      ORDER BY TO_CHAR(invoice_date, 'YYYY-MM')
    `)

    // 2. Parcels by Type (Document/Non-Doc)
    // We join invoices -> invoice_items to get shipment_type
    const typeRes = await db.query(`
      SELECT 
        COALESCE(it.shipment_type, 'Unknown') as label, 
        COUNT(*) as count 
      FROM invoice_items it
      JOIN invoices i ON it.invoice_id = i.id
      WHERE i.invoice_date >= NOW() - INTERVAL '1 month'
      GROUP BY 1
    `)

    // 3. Parcels by Courier (Mock for now as carrier data location varies)
    const parcelsByCourier = [
      { label: 'DTDC', count: 145 },
      { label: 'Trackon', count: 85 },
      { label: 'Maruti', count: 45 },
      { label: 'Tirupati', count: 32 },
      { label: 'Professional', count: 28 }
    ]

    return NextResponse.json({
      monthlyBusiness: monthlyRes.rows.length ? monthlyRes.rows.map(r => ({ month: r.month, total: Number(r.total) })) : [],
      parcelsByCourier,
      parcelsByType: typeRes.rows.length ? typeRes.rows.map(r => ({ label: r.label, count: Number(r.count) })) : []
    })
  } catch (error) {
    console.error('Analytics Error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
