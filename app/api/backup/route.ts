import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  // Simple JSON backup export for key tables
  const tables = ['users','parties','invoices','invoice_items','payments','regions','region_states','centers','carriers','sms_formats','quotation_defaults','weight_slabs','distance_slabs','service_types','modes']
  const result: Record<string, any[]> = {}
  for (const t of tables) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await db.query(`SELECT * FROM ${t}`)
      result[t] = res.rows
    } catch {
      result[t] = []
    }
  }
  return new NextResponse(JSON.stringify(result, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="cms-backup-${Date.now()}.json"`
    }
  })
}
