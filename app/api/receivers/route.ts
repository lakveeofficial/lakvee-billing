import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function ensureTable() {
  await db.query(`CREATE TABLE IF NOT EXISTS receivers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    contact TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`)
}

export async function GET(req: Request) {
  await ensureTable()
  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '20')))
  const search = url.searchParams.get('search')?.trim()
  const offset = (page - 1) * limit
  const where: string[] = []
  const params: any[] = []
  if (search) {
    where.push(`(name ILIKE $${params.length + 1} OR city ILIKE $${params.length + 1} OR contact ILIKE $${params.length + 1})`)
    params.push(`%${search}%`)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const rows = await db.query(`SELECT *, COUNT(*) OVER() AS total_count FROM receivers ${whereSql} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset])
  const total = rows.rowCount ? Number(rows.rows[0].total_count) : 0
  return NextResponse.json({ data: rows.rows.map(r => { delete r.total_count; return r }), pagination: { page, limit, total } })
}

export async function POST(req: Request) {
  await ensureTable()
  const { id, name, city, contact } = await req.json()
  if (id) {
    await db.query('UPDATE receivers SET name=$1, city=$2, contact=$3, updated_at=now() WHERE id=$4', [name, city, contact, id])
  } else {
    await db.query('INSERT INTO receivers(name, city, contact) VALUES($1,$2,$3)', [name, city, contact])
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  await ensureTable()
  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  await db.query('DELETE FROM receivers WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
