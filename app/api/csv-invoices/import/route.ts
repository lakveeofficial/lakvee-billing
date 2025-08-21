import { NextResponse } from 'next/server'
import Papa from 'papaparse'
import { ensureCsvInvoicesTable, insertCsvInvoices, mapRecordToRow } from '@/lib/csvInvoices'
import { db } from '@/lib/db'
import { resolveDistanceFromAddresses } from '@/lib/distance'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const csvText = await file.text()

    // Parse with headers using Papa (Node-compatible for string input)
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })
    if (parsed.errors && parsed.errors.length > 0) {
      return NextResponse.json({ error: 'CSV parsing failed', details: parsed.errors.map(e => e.message) }, { status: 400 })
    }
    const records = (parsed.data as any[]) || []

    if (!records.length) {
      return NextResponse.json({ error: 'CSV contains no data rows' }, { status: 400 })
    }

    // Ensure table exists
    await ensureCsvInvoicesTable()

    // Load existing party names (case-insensitive) from DB
    const partyRes = await db.query(`SELECT LOWER(TRIM(party_name)) AS name FROM parties WHERE party_name IS NOT NULL`)
    const partyNameSet = new Set<string>((partyRes.rows || []).map((r: any) => r.name as string))

    // Split records into valid (sender exists) vs invalid
    const validRecords: any[] = []
    let skipped = 0
    for (const rec of records) {
      const senderRaw = (rec['SENDER NAME'] ?? '').toString().trim()
      const senderKey = senderRaw.toLowerCase()
      if (!senderRaw || !partyNameSet.has(senderKey)) {
        skipped++
        continue
      }
      validRecords.push(rec)
    }

    if (validRecords.length === 0) {
      return NextResponse.json({
        message: 'No rows imported. Party_name is not exist in system for provided Sender Names. Please create party first!',
        inserted: 0,
        skipped
      }, { status: 200 })
    }

    // Map each valid record to DB row shape
    const rows = validRecords.map(mapRecordToRow)

    // Auto-detect distance category from addresses and set region title
    const enrichedRows = await Promise.all(rows.map(async (r) => {
      try {
        const dist = await resolveDistanceFromAddresses(r.sender_address, r.recipient_address)
        return { ...r, region: dist.title || r.region }
      } catch {
        return r
      }
    }))

    // Bulk insert only valid rows
    const count = await insertCsvInvoices(enrichedRows)

    return NextResponse.json({
      message: `CSV invoices imported. Inserted: ${count}. Skipped (party not found): ${skipped}`,
      inserted: count,
      skipped
    })
  } catch (err: any) {
    console.error('CSV import failed:', err)
    return NextResponse.json({ error: 'CSV import failed', details: err?.message }, { status: 500 })
  }
}
