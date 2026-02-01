import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { db } from '@/lib/db'

// Ensure account_bookings table exists
async function ensureAccountBookingsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS account_bookings (
      id SERIAL PRIMARY KEY,
      booking_date DATE NOT NULL,
      sender VARCHAR(255) NOT NULL,
      center VARCHAR(255),
      receiver VARCHAR(255) NOT NULL,
      mobile VARCHAR(20),
      carrier VARCHAR(255),
      reference_number VARCHAR(100),
      package_type VARCHAR(50),
      weight DECIMAL(10,2),
      number_of_boxes INTEGER DEFAULT 1,
      gross_amount DECIMAL(10,2) DEFAULT 0,
      other_charges DECIMAL(10,2) DEFAULT 0,
      insurance_amount DECIMAL(10,2) DEFAULT 0,
      parcel_value DECIMAL(10,2) DEFAULT 0,
      net_amount DECIMAL(10,2) DEFAULT 0,
      remarks TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

// Ensure offline_bookings table exists
async function ensureOfflineBookingsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS offline_bookings (
      id SERIAL PRIMARY KEY,
      booking_date DATE NOT NULL,
      sender VARCHAR(255) NOT NULL,
      center VARCHAR(255),
      receiver VARCHAR(255) NOT NULL,
      mobile VARCHAR(20),
      carrier VARCHAR(255),
      reference_number VARCHAR(100),
      package_type VARCHAR(50),
      weight DECIMAL(10,2),
      number_of_boxes INTEGER DEFAULT 1,
      gross_amount DECIMAL(10,2) DEFAULT 0,
      other_charges DECIMAL(10,2) DEFAULT 0,
      insurance_amount DECIMAL(10,2) DEFAULT 0,
      parcel_value DECIMAL(10,2) DEFAULT 0,
      net_amount DECIMAL(10,2) DEFAULT 0,
      remarks TEXT,
      offline_status VARCHAR(50) DEFAULT 'PENDING',
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

function parseCSV(csvText: string): Record<string, any>[] {
  // Strip BOM if present
  const cleanCSV = csvText.replace(/^\uFEFF/, '').trim()
  const lines = cleanCSV.split(/\r?\n/)
  if (lines.length < 2) return []

  // Normalize headers: trim, remove quotes, uppercase
  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1').toUpperCase())
  const records: Record<string, any>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'))
    if (values.length < rawHeaders.length) continue

    const record: Record<string, any> = {}
    rawHeaders.forEach((header, index) => {
      record[header] = values[index] || null
    })
    records.push(record)
  }

  return records
}

function mapBookingRecord(record: Record<string, any>, type: 'booking' | 'offline') {
  const parseDate = (dateStr: string) => {
    console.log('[DEBUG] IMPORT parseDate input:', `"${dateStr}"`)
    if (!dateStr) return new Date().toISOString().split('T')[0]

    // Remove any non-timestamp junk and trim (handling invisible chars)
    const raw = String(dateStr).replace(/[^\x20-\x7E]/g, '').trim()
    console.log('[DEBUG] IMPORT parseDate cleaned:', `"${raw}"`)

    // 1. Prioritize DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    // Support 2-digit or 4-digit years, and allow trailing time/text
    const dmyMatch = raw.match(/^(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{2,4})/)
    if (dmyMatch) {
      let d = parseInt(dmyMatch[1], 10)
      let m = parseInt(dmyMatch[2], 10)
      let y = parseInt(dmyMatch[3], 10)

      // Handle 2-digit years (assume 20xx)
      if (y < 100) y += 2000

      console.log('[DEBUG] Flexible IMPORT DMY Match detected:', { d, m, y })
      const dt = new Date(Date.UTC(y, m - 1, d))
      if (!isNaN(dt.getTime())) {
        const res = dt.toISOString().split('T')[0]
        console.log('[DEBUG] IMPORT DMY Result:', res)
        return res
      }
    }

    // 2. Fallback to ISO-like YYYY-MM-DD
    const isoMatch = raw.match(/^(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})$/)
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10)
      const m = parseInt(isoMatch[2], 10)
      const d = parseInt(isoMatch[3], 10)
      console.log('[DEBUG] Flexible IMPORT ISO Match detected:', { y, m, d })
      const dt = new Date(Date.UTC(y, m - 1, d))
      if (!isNaN(dt.getTime())) {
        const res = dt.toISOString().split('T')[0]
        console.log('[DEBUG] IMPORT ISO Result:', res)
        return res
      }
    }

    // Fallback to standard Date parser
    console.log('[DEBUG] IMPORT Falling back to standard Date parser for:', raw)
    const date = new Date(raw)
    const res = isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0]
    console.log('[DEBUG] IMPORT Fallback Result:', res)
    return res
  }

  const parseNumber = (val: any): number | null => {
    if (val === undefined || val === null || val === '') return null
    const num = parseFloat(val)
    return isNaN(num) ? null : num
  }

  const parseInteger = (val: any): number | null => {
    if (val === undefined || val === null || val === '') return null
    const num = parseInt(val)
    return isNaN(num) ? null : num
  }

  const baseMapping = {
    date: parseDate(record['DATE OF BOOKING']),
    sender: record['SENDER NAME'] || '',
    receiver: record['RECEIVER NAME'] || '',
    mobile: record['MOBILE'] || null,
    carrier: record['CARRIER'] || null,
    reference_number: record['REFERENCE NUMBER'] || null,
    package_type: record['PACKAGE TYPE'] || null,
    weight: parseNumber(record['WEIGHT']),
    number_of_boxes: parseInteger(record['NUMBER OF BOXES']),
    gross_amount: parseNumber(record['GROSS AMOUNT']),
    other_charges: parseNumber(record['OTHER CHARGES']),
    insurance_amount: parseNumber(record['INSURANCE AMOUNT']),
    parcel_value: parseNumber(record['PARCEL VALUE']),
    net_amount: parseNumber(record['NET AMOUNT']),
    remarks: record['REMARKS'] || null,
  }

  if (type === 'offline') {
    return {
      ...baseMapping,
      offline_status: record['OFFLINE STATUS'] || 'PENDING'
    }
  }

  return baseMapping
}

async function insertBookingRecords(records: any[], type: 'booking' | 'offline', userId: number) {
  if (type === 'booking') {
    await ensureAccountBookingsTable()

    const insertPromises = records.map(record => {
      return db.query(`
        INSERT INTO account_bookings (
          booking_date, sender, receiver, mobile, carrier, reference_number, 
          package_type, weight, number_of_boxes, gross_amount, 
          other_charges, insurance_amount, parcel_value, net_amount, 
          remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        record.date, record.sender, record.receiver, record.mobile,
        record.carrier, record.reference_number, record.package_type,
        record.weight, record.number_of_boxes, record.gross_amount,
        record.other_charges, record.insurance_amount, record.parcel_value,
        record.net_amount, record.remarks, userId
      ])
    })

    await Promise.all(insertPromises)
  } else {
    await ensureOfflineBookingsTable()

    const insertPromises = records.map(record => {
      return db.query(`
        INSERT INTO offline_bookings (
          booking_date, sender, receiver, mobile, carrier, reference_number, 
          package_type, weight, number_of_boxes, gross_amount, 
          other_charges, insurance_amount, parcel_value, net_amount, 
          remarks, offline_status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        record.date, record.sender, record.receiver, record.mobile,
        record.carrier, record.reference_number, record.package_type,
        record.weight, record.number_of_boxes, record.gross_amount,
        record.other_charges, record.insurance_amount, record.parcel_value,
        record.net_amount, record.remarks, record.offline_status, userId
      ])
    })

    await Promise.all(insertPromises)
  }
}

async function handler(context: { user: any }, req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as 'booking' | 'offline'

    console.log('Import request received:', { type, fileName: file?.name, fileSize: file?.size })

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!type || !['booking', 'offline'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type provided. Must be "booking" or "offline"' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 })
    }

    console.log('Reading CSV file...')
    const csvText = await file.text()
    console.log('CSV text length:', csvText.length)

    const records = parseCSV(csvText)
    console.log('Parsed records:', records.length)

    if (records.length === 0) {
      return NextResponse.json({ error: 'No valid records found in CSV. Please check the file format.' }, { status: 400 })
    }

    // Validate required fields
    const requiredFields = ['DATE OF BOOKING', 'SENDER NAME', 'RECEIVER NAME']
    const missingFields = requiredFields.filter(field =>
      !records.some(record => record[field] && record[field].trim())
    )

    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields)
      console.log('Available headers:', Object.keys(records[0] || {}))
      return NextResponse.json({
        error: 'Missing required fields',
        missingFields,
        availableHeaders: Object.keys(records[0] || {})
      }, { status: 400 })
    }

    // Map records to database format
    console.log('Mapping records to database format...')
    const mappedRecords = records.map(record => mapBookingRecord(record, type))

    // Get user ID from auth context
    const userId = context.user?.id || 1
    console.log('User ID:', userId)

    // Insert records into appropriate table
    console.log('Inserting records into database...')
    await insertBookingRecords(mappedRecords, type, userId)
    console.log('Records inserted successfully')

    // --- Begin invoice creation logic ---
    // Group bookings by party (sender)
    const partyGroups: Record<string, any[]> = {}
    for (const rec of mappedRecords) {
      const party = rec.sender || 'Unknown'
      if (!partyGroups[party]) partyGroups[party] = []
      partyGroups[party].push(rec)
    }

    // Get template from formData (default to 'Default')
    const template = formData.get('template') || 'Default'

    // For each party, create an invoice
    for (const [party, bookings] of Object.entries(partyGroups)) {
      // Calculate totals
      const subtotal = bookings.reduce((sum, b) => sum + (parseFloat(b.net_amount) || 0), 0)
      const tax_amount = 0 // Add tax logic if needed
      const total_amount = subtotal + tax_amount
      // Find party_id from DB
      let party_id = null
      try {
        const partyRes = await db.query('SELECT id FROM parties WHERE LOWER(TRIM(party_name)) = LOWER(TRIM($1)) LIMIT 1', [party])
        if (partyRes.rows.length) party_id = partyRes.rows[0].id
      } catch (err) {
        console.error('Error finding party:', err)
      }
      // Generate invoice number (simple: INV-<timestamp>-<party>)
      const invoice_number = `INV-${Date.now()}-${party.replace(/\s+/g, '').toUpperCase().slice(0, 6)}`
      // Use today as invoice_date
      const invoice_date = new Date().toISOString().split('T')[0]
      // Insert invoice into DB
      try {
        await db.query(
          `INSERT INTO invoices (invoice_number, invoice_date, party_id, subtotal, tax_amount, total_amount, status, template, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [invoice_number, invoice_date, party_id, subtotal, tax_amount, total_amount, 'draft', template]
        )
      } catch (err) {
        console.error('Error creating invoice:', err)
        // Continue even if invoice creation fails
      }
      // Optionally: Link bookings to invoice if schema allows
    }
    console.log('Created invoices for parties:', Object.keys(partyGroups).length)
    // --- End invoice creation logic ---

    return NextResponse.json({
      success: true,
      totalRecords: records.length,
      message: `Successfully imported ${records.length} ${type} records and created ${Object.keys(partyGroups).length} invoices with template '${template}'.`
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      error: 'Failed to process import',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export const POST = withAuth(handler)
