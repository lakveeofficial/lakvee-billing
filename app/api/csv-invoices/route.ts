import { NextResponse } from 'next/server'
import { ensureCsvInvoicesTable, listCsvInvoices, clearCsvInvoices } from '@/lib/csvInvoices'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') || 50)
    const offset = Number(searchParams.get('offset') || 0)

    await ensureCsvInvoicesTable()
    const rows = await listCsvInvoices(limit, offset)
    return NextResponse.json({ rows, limit, offset })
  } catch (err: any) {
    console.error('List CSV invoices failed:', err)
    return NextResponse.json({ error: 'Failed to fetch CSV invoices' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await ensureCsvInvoicesTable()
    const removed = await clearCsvInvoices()
    return NextResponse.json({ message: 'All CSV invoices deleted', removed })
  } catch (err: any) {
    console.error('Clear CSV invoices failed:', err)
    return NextResponse.json({ error: 'Failed to clear CSV invoices' }, { status: 500 })
  }
}
