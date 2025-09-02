import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const res = await db.query(`
    SELECT id, code, title, is_active
    FROM service_types
    WHERE is_active = TRUE
    ORDER BY title
  `)
  return NextResponse.json({ data: res.rows })
}
