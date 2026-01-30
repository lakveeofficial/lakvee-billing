import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const res = await db.query('SELECT * FROM sms_formats ORDER BY name')
  return NextResponse.json({ data: res.rows })
}

export async function POST(req: Request) {
  const { name, template } = await req.json()
  await db.query('INSERT INTO sms_formats(name, template) VALUES($1,$2) ON CONFLICT (name) DO UPDATE SET template=EXCLUDED.template, updated_at=now()', [name, template])
  return NextResponse.json({ ok: true })
}
