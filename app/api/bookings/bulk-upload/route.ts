import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Ensure account_bookings table exists and matches expected schema
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
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Backfill/ensure newer columns exist on older DBs
  await db.query(`
    ALTER TABLE account_bookings 
      ADD COLUMN IF NOT EXISTS center VARCHAR(255),
      ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'gm',
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

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
    // Simple comma split (doesn't handle commas inside quotes, but fits current usage)
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

function parseDate(dateStr: string): string {
  console.log('[DEBUG] parseDate input:', `"${dateStr}"`)
  if (!dateStr) return new Date().toISOString().split('T')[0]

  // Remove any non-timestamp junk and trim (handling invisible chars)
  const raw = String(dateStr).replace(/[^\x20-\x7E]/g, '').trim()
  console.log('[DEBUG] parseDate cleaned:', `"${raw}"`)

  // 1. Prioritize DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  // Support 2-digit or 4-digit years, and allow trailing time/text
  const dmyMatch = raw.match(/^(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{2,4})/)
  if (dmyMatch) {
    let d = parseInt(dmyMatch[1], 10)
    let m = parseInt(dmyMatch[2], 10)
    let y = parseInt(dmyMatch[3], 10)

    // Handle 2-digit years (assume 20xx)
    if (y < 100) y += 2000

    console.log('[DEBUG] Flexible DMY Match detected:', { d, m, y })
    // Use UTC to avoid timezone shifts
    const dt = new Date(Date.UTC(y, m - 1, d))
    if (!isNaN(dt.getTime())) {
      const res = dt.toISOString().split('T')[0]
      console.log('[DEBUG] DMY Result:', res)
      return res
    }
  }

  // 2. Fallback to ISO-like YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})$/)
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10)
    const m = parseInt(isoMatch[2], 10)
    const d = parseInt(isoMatch[3], 10)
    console.log('[DEBUG] Flexible ISO Match detected:', { y, m, d })
    const dt = new Date(Date.UTC(y, m - 1, d))
    if (!isNaN(dt.getTime())) {
      const res = dt.toISOString().split('T')[0]
      console.log('[DEBUG] ISO Result:', res)
      return res
    }
  }

  // Fallback to standard Date parser
  console.log('[DEBUG] Falling back to standard Date parser for:', raw)
  const date = new Date(raw)
  const res = isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0]
  console.log('[DEBUG] Fallback Result:', res)
  return res
}

function parseNumber(val: any): number | null {
  if (val === undefined || val === null || val === '') return null
  const num = parseFloat(val)
  return isNaN(num) ? null : num
}

function parseInteger(val: any): number | null {
  if (val === undefined || val === null || val === '') return null
  const num = parseInt(val)
  return isNaN(num) ? null : num
}

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    console.log('Bulk upload request received:', { fileName: file?.name, fileSize: file?.size })

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
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
      return NextResponse.json({ error: 'No valid records found in CSV' }, { status: 400 })
    }

    // Ensure target table exists
    await ensureAccountBookingsTable()

    // Validate required headers exist
    const requiredFields = ['DATE OF BOOKING', 'SENDER NAME', 'RECEIVER NAME']
    const availableHeaders = Object.keys(records[0] || {})
    const missingFields = requiredFields.filter(field => !availableHeaders.includes(field))

    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields)
      console.log('Available headers:', availableHeaders)
      return NextResponse.json({
        error: 'Missing required fields',
        missingFields,
        availableHeaders
      }, { status: 400 })
    }

    // Map and insert records with de-duplication and party validation
    console.log('Inserting records into database...')
    let uploadedCount = 0
    const errors: string[] = []
    const insertedRecords: any[] = []
    const duplicates: Array<{ row: number; reason: string; reference?: string }> = []
    const missingParties: Array<{ row: number; party: string }> = []

    for (const record of records) {
      try {
        const bookingData = {
          booking_date: parseDate(record['DATE OF BOOKING']),
          sender: record['SENDER NAME'] || '',
          center: record['CENTER'] || null,
          receiver: record['RECEIVER NAME'] || '',
          mobile: record['MOBILE'] || null,
          carrier: record['CARRIER'] || null,
          reference_number: record['REFERENCE NUMBER'] || null,
          package_type: record['PACKAGE TYPE'] || null,
          weight: parseNumber(record['WEIGHT']),
          number_of_boxes: parseInteger(record['NUMBER OF BOXES']) || 1,
          gross_amount: parseNumber(record['GROSS AMOUNT']) || 0,
          other_charges: parseNumber(record['OTHER CHARGES']) || 0,
          insurance_amount: parseNumber(record['INSURANCE AMOUNT']) || 0,
          parcel_value: parseNumber(record['PARCEL VALUE']) || 0,
          net_amount: parseNumber(record['NET AMOUNT']) || 0,
          weight_unit: record['WEIGHT UNIT'] || record['UNIT'] || 'gm',
          remarks: record['REMARKS'] || null,
          status: 'pending'

        }

        console.log('Inserting booking:', bookingData.sender, bookingData.receiver, bookingData.booking_date)

        // Validate party (sender) exists
        try {
          const partyRes = await db.query(
            `SELECT id FROM parties WHERE LOWER(TRIM(party_name)) = LOWER(TRIM($1)) LIMIT 1`,
            [bookingData.sender]
          )
          if (partyRes.rows.length === 0) {
            missingParties.push({ row: uploadedCount + duplicates.length + missingParties.length + errors.length + 1, party: bookingData.sender })
            // Skip insertion for this record
            continue
          }
        } catch (partyErr) {
          console.error('Party validation error:', partyErr)
          errors.push(`Party validation failed for '${bookingData.sender}'`)
          continue
        }

        // Duplicate detection
        try {
          if (bookingData.reference_number) {
            const dupRef = await db.query(
              `SELECT id FROM account_bookings WHERE reference_number = $1 LIMIT 1`,
              [bookingData.reference_number]
            )
            if (dupRef.rows.length > 0) {
              duplicates.push({ row: insertedRecords.length + duplicates.length + missingParties.length + errors.length + 1, reason: 'Duplicate reference number', reference: String(bookingData.reference_number) })
              continue
            }
          } else {
            // Soft duplicate check when reference number missing
            const dupSoft = await db.query(
              `SELECT id FROM account_bookings 
               WHERE booking_date = $1 AND LOWER(TRIM(sender)) = LOWER(TRIM($2)) 
                 AND LOWER(TRIM(receiver)) = LOWER(TRIM($3))
                 AND COALESCE(mobile,'') = COALESCE($4,'')
                 AND COALESCE(net_amount,0) = COALESCE($5,0)
               LIMIT 1`,
              [bookingData.booking_date, bookingData.sender, bookingData.receiver, bookingData.mobile, bookingData.net_amount]
            )
            if (dupSoft.rows.length > 0) {
              duplicates.push({ row: insertedRecords.length + duplicates.length + missingParties.length + errors.length + 1, reason: 'Likely duplicate (date/sender/receiver/mobile/net match)' })
              continue
            }
          }
        } catch (dupErr) {
          console.error('Duplicate check error:', dupErr)
          errors.push('Duplicate check failed')
          continue
        }

        const insertRes = await db.query(`
          INSERT INTO account_bookings (
            booking_date, sender, center, receiver, mobile, carrier, reference_number,
            package_type, weight, weight_unit, number_of_boxes, gross_amount, other_charges,
            insurance_amount, parcel_value, net_amount, remarks, status, created_at, updated_at
          ) VALUES (
            $1,  $2,  $3,  $4,  $5,  $6,  $7,
            $8,  $9,  $10, $11, $12, $13,
            $14, $15, $16, $17, $18, NOW(), NOW()
          ) RETURNING *
        `, [
          bookingData.booking_date, bookingData.sender, bookingData.center, bookingData.receiver,
          bookingData.mobile, bookingData.carrier, bookingData.reference_number, bookingData.package_type,
          bookingData.weight, bookingData.weight_unit, bookingData.number_of_boxes, bookingData.gross_amount,
          bookingData.other_charges, bookingData.insurance_amount, bookingData.parcel_value,
          bookingData.net_amount, bookingData.remarks, bookingData.status
        ])


        uploadedCount++
        insertedRecords.push(insertRes.rows[0])
      } catch (err) {
        console.error('Error inserting record:', err)
        errors.push(`Row ${uploadedCount + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    // Verify records were inserted by querying the database
    console.log('Verifying inserted records...')
    const verifyResult = await db.query('SELECT COUNT(*) as count FROM account_bookings WHERE created_at >= NOW() - INTERVAL \'5 minutes\'')
    console.log('Recent bookings count (last 5 minutes):', verifyResult.rows[0].count)

    // Also get the last inserted record
    const lastRecord = await db.query('SELECT * FROM account_bookings ORDER BY id DESC LIMIT 1')
    if (lastRecord.rows.length > 0) {
      console.log('Last inserted booking:', lastRecord.rows[0])
    }

    console.log('Upload complete:', { uploadedCount, errors: errors.length })

    return NextResponse.json({
      success: true,
      uploadedCount,
      totalRecords: records.length,
      insertedRecords,
      duplicateCount: duplicates.length,
      duplicates,
      missingPartyCount: missingParties.length,
      missingParties,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${uploadedCount}/${records.length}. Duplicates: ${duplicates.length}. Missing parties: ${missingParties.length}.${errors.length ? ` Errors: ${errors.length}.` : ''}`
    })

  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({
      error: 'Failed to process bulk upload',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export const POST = handler
