import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const res = await db.query(`SELECT id, code, title, is_active FROM service_types ORDER BY id`)
  return NextResponse.json({ data: res.rows })
}
