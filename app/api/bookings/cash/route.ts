import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { db } from '@/lib/db'

// Ensure cash_bookings table exists
async function ensureCashBookingsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cash_bookings (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      sender VARCHAR(255) NOT NULL,
      sender_mobile VARCHAR(20),
      sender_address TEXT,
      center VARCHAR(255),
      receiver VARCHAR(255) NOT NULL,
      receiver_mobile VARCHAR(20),
      receiver_address TEXT,
      carrier VARCHAR(255),
      reference_number VARCHAR(255),
      package_type VARCHAR(100),
      weight DECIMAL(10,2),
      number_of_boxes INTEGER,
      gross_amount DECIMAL(10,2),
      fuel_charge_percent DECIMAL(5,2),
      insurance_amount DECIMAL(10,2),
      cgst_amount DECIMAL(10,2),
      sgst_amount DECIMAL(10,2),
      net_amount DECIMAL(10,2),
      parcel_value DECIMAL(10,2),
      weight_unit VARCHAR(10) DEFAULT 'kg',
      remarks TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Ensure weight_unit column exists for existing tables
  await db.query(`
    ALTER TABLE cash_bookings 
    ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'kg'
  `)
}

async function handler(context: { user: any }, req: NextRequest) {
  if (req.method === 'GET') {
    try {
      await ensureCashBookingsTable()

      const url = new URL(req.url)
      const search = url.searchParams.get('search') || ''
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = (page - 1) * limit

      let query = `
        SELECT * FROM cash_bookings 
        WHERE 1=1
      `
      const params: any[] = []

      if (search) {
        query += ` AND (sender ILIKE $${params.length + 1} OR receiver ILIKE $${params.length + 1} OR reference_number ILIKE $${params.length + 1})`
        params.push(`%${search}%`)
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(limit, offset)

      const result = await db.query(query, params)

      const countQuery = `SELECT COUNT(*) as total FROM cash_bookings WHERE 1=1 ${search ? 'AND (sender ILIKE $1 OR receiver ILIKE $1 OR reference_number ILIKE $1)' : ''}`
      const countParams = search ? [`%${search}%`] : []
      const countResult = await db.query(countQuery, countParams)

      return NextResponse.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      })
    } catch (error) {
      console.error('Error fetching cash bookings:', error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }
  }

  if (req.method === 'POST') {
    try {
      await ensureCashBookingsTable()

      const body = await req.json()
      const {
        date,
        sender,
        sender_mobile,
        sender_address,
        center,
        receiver,
        receiver_mobile,
        receiver_address,
        carrier,
        reference_number,
        package_type,
        weight,
        number_of_boxes,
        gross_amount,
        fuel_charge_percent,
        insurance_amount,
        cgst_amount,
        sgst_amount,
        net_amount,
        parcel_value,
        weight_unit,
        remarks
      } = body

      if (!sender || !receiver) {
        return NextResponse.json({ error: 'Sender and receiver are required' }, { status: 400 })
      }

      const result = await db.query(`
        INSERT INTO cash_bookings (
          date, sender, sender_mobile, sender_address, center,
          receiver, receiver_mobile, receiver_address, carrier,
          reference_number, package_type, weight, number_of_boxes,
          gross_amount, fuel_charge_percent, insurance_amount,
          cgst_amount, sgst_amount, net_amount, parcel_value,
          weight_unit, remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `, [
        date, sender, sender_mobile, sender_address, center,
        receiver, receiver_mobile, receiver_address, carrier,
        reference_number, package_type, weight, number_of_boxes,
        gross_amount, fuel_charge_percent, insurance_amount,
        cgst_amount, sgst_amount, net_amount, parcel_value,
        weight_unit || 'kg', remarks, context.user?.id || 1
      ])

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Cash booking created successfully'
      })
    } catch (error) {
      console.error('Error creating cash booking:', error)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withAuth(handler)
export const POST = withAuth(handler)
