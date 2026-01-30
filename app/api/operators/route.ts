import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const search = url.searchParams.get('search')?.trim()
  const rows = await db.query(
    `SELECT o.*, u.username, u.email
     FROM operators o
     LEFT JOIN users u ON u.id = o.user_id
     ${search ? `WHERE u.username ILIKE $1 OR u.email ILIKE $1` : ''}
     ORDER BY u.username NULLS LAST, o.id DESC`,
    search ? [`%${search}%`] : []
  )
  return NextResponse.json({ data: rows.rows })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { user_id, booking_rights, bill_item_preferences, bill_template } = body
  await db.query(
    `INSERT INTO operators(user_id, booking_rights, bill_item_preferences, bill_template)
     VALUES($1,$2,$3,$4)
     ON CONFLICT (user_id) DO UPDATE SET
       booking_rights = EXCLUDED.booking_rights,
       bill_item_preferences = EXCLUDED.bill_item_preferences,
       bill_template = EXCLUDED.bill_template,
       updated_at = now()`,
    [user_id ?? null, booking_rights ?? null, bill_item_preferences ?? null, bill_template ?? null]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  await db.query('DELETE FROM operators WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
