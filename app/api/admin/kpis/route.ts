import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [regions, centers, carriers, sms, operators, receivers] = await Promise.all([
      db.query('SELECT COUNT(1) c FROM regions'),
      db.query('SELECT COUNT(1) c FROM centers WHERE is_active = TRUE'),
      db.query('SELECT COUNT(1) c FROM carriers WHERE is_active = TRUE'),
      db.query('SELECT COUNT(1) c FROM sms_formats'),
      db.query('SELECT COUNT(1) c FROM operators'),
      db.query('SELECT COUNT(1) c FROM receivers').catch(() => ({ rows: [{ c: 0 }] }))
    ])

    return NextResponse.json({
      regions: Number(regions.rows?.[0]?.c || 0),
      centers: Number(centers.rows?.[0]?.c || 0),
      carriers: Number(carriers.rows?.[0]?.c || 0),
      smsFormats: Number(sms.rows?.[0]?.c || 0),
      operators: Number(operators.rows?.[0]?.c || 0),
      receivers: Number((receivers as any).rows?.[0]?.c || 0)
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
