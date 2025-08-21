import { NextResponse } from 'next/server'
import { getCsvInvoiceById } from '@/lib/csvInvoices'

function toCsv(row: Record<string,string|number|null|undefined>) {
  const headers = Object.keys(row)
  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const values = headers.map(h => escape(row[h]))
  return headers.join(',') + '\n' + values.join(',') + '\n'
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const row = await getCsvInvoiceById(params.id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const csv = toCsv(row as any)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="csv-invoice-${params.id}.csv"`
    }
  })
}
