import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const res = await db.query('SELECT * FROM carriers ORDER BY name')
  return NextResponse.json({ data: res.rows })
}

export async function POST(req: Request) {
  const { name, is_active } = await req.json()
  await db.query('INSERT INTO carriers(name, is_active) VALUES($1,$2) ON CONFLICT (name) DO UPDATE SET is_active=EXCLUDED.is_active, updated_at=now()', [name, is_active ?? true])
  return NextResponse.json({ ok: true })
}

export async function PUT(req: Request) {
  const { id, name, is_active } = await req.json()
  await db.query('UPDATE carriers SET name=$1, is_active=$2, updated_at=now() WHERE id=$3', [name, is_active ?? true, id])
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  await db.query('DELETE FROM carriers WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
