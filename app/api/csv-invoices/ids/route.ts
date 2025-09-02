import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureCsvInvoicesTable } from '@/lib/csvInvoices'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').toLowerCase().trim()
    const party = (searchParams.get('party') || '').toLowerCase().trim()

    await ensureCsvInvoicesTable()

    const terms: string[] = []
    const values: any[] = []

    if (q) {
      // Searchable columns similar to page.tsx
      const searchable = [
        'sender_name','recipient_name','consignment_no','booking_reference','mode','service_type','customer','payment_mode'
      ]
      const like = `%${q}%`
      const orClauses = searchable.map((col, i) => `${col} ILIKE $${values.length + i + 1}`)
      values.push(...Array(searchable.length).fill(like))
      terms.push(`(${orClauses.join(' OR ')})`)
    }

    if (party) {
      values.push(party)
      terms.push(`LOWER(TRIM(sender_name)) = $${values.length}`)
    }

    const where = terms.length ? `WHERE ${terms.join(' AND ')}` : ''
    const sql = `SELECT id FROM csv_invoices ${where} ORDER BY created_at DESC`
    const res = await db.query(sql, values)
    const ids = (res.rows || []).map((r: any) => r.id)
    return NextResponse.json({ ids })
  } catch (err) {
    console.error('List filtered CSV invoice IDs failed:', err)
    return NextResponse.json({ error: 'Failed to fetch CSV invoice IDs' }, { status: 500 })
  }
}
