import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const res = await db.query('SELECT * FROM quotation_notes ORDER BY updated_at DESC NULLS LAST, id DESC')
  return NextResponse.json({ data: res.rows })
}

export async function POST(req: Request) {
  const { id, title, body } = await req.json()
  if (id) {
    await db.query('UPDATE quotation_notes SET title=$1, body=$2, updated_at=now() WHERE id=$3', [title, body, id])
  } else {
    await db.query('INSERT INTO quotation_notes(title, body) VALUES($1,$2) ON CONFLICT (title) DO UPDATE SET body=EXCLUDED.body, updated_at=now()', [title, body])
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  await db.query('DELETE FROM quotation_notes WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
