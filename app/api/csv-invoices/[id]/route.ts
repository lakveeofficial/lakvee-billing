import { NextResponse } from 'next/server'
import { deleteCsvInvoice, getCsvInvoiceById, updateCsvInvoice } from '@/lib/csvInvoices'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const row = await getCsvInvoiceById(params.id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const patch = await request.json()
  const updated = await updateCsvInvoice(params.id, patch)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ok = await deleteCsvInvoice(params.id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
