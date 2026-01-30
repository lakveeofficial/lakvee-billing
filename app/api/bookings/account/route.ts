import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// POST create account booking
export const POST = withAuth(async ({ user }, req) => {
  try {
    const body = await req.json()
    const {
      date,
      sender,
      center,
      receiver,
      mobile,
      carrier,
      reference_number,
      package_type,
      weight,
      number_of_boxes,
      gross_amount,
      other_charges,
      insurance_amount,
      parcel_value,
      net_amount,
      weight_unit,
      remarks
    } = body

    if (!sender || !receiver) {
      return NextResponse.json(
        { success: false, error: 'Sender and receiver are required' },
        { status: 400 }
      )
    }

    // Ensure account_bookings table exists
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
        weight_unit VARCHAR(10) DEFAULT 'gm',
        remarks TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Add center column if it doesn't exist (for existing tables)
    await db.query(`
      ALTER TABLE account_bookings 
      ADD COLUMN IF NOT EXISTS center VARCHAR(255),
      ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'gm'
    `)

    // Generate booking reference number if not provided
    const bookingRef = reference_number || `AB${Date.now()}`

    // Insert booking record
    const result = await db.query(`
      INSERT INTO account_bookings (
        booking_date, sender, center, receiver, mobile, carrier, reference_number,
        package_type, weight, number_of_boxes, gross_amount, other_charges,
        insurance_amount, parcel_value, net_amount, weight_unit, remarks, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      date, sender, center, receiver, mobile, carrier, bookingRef,
      package_type, weight, number_of_boxes, gross_amount, other_charges,
      insurance_amount, parcel_value, net_amount, weight_unit || 'gm', remarks, user.id
    ])

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Account booking created successfully'
    })
  } catch (error) {
    console.error('Error creating account booking:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create account booking' },
      { status: 500 }
    )
  }
})

// GET fetch account bookings
export const GET = withAuth(async ({ user }, req) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    // First ensure the center column exists
    try {
      await db.query(`
        ALTER TABLE account_bookings 
        ADD COLUMN IF NOT EXISTS center VARCHAR(255),
        ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'gm'
      `)
    } catch (error) {
      // Column might already exist, continue
    }

    let query = `
      SELECT 
        id, booking_date, sender, 
        COALESCE(center, '') as center,
        receiver, mobile, carrier, reference_number,
        package_type, weight, number_of_boxes, gross_amount, other_charges,
        insurance_amount, parcel_value, net_amount, 
        COALESCE(weight_unit, 'gm') as weight_unit,
        remarks, status,
        created_at, updated_at
      FROM account_bookings
    `

    let params: any[] = []

    if (search) {
      query += ` WHERE (
        sender ILIKE $1 OR 
        receiver ILIKE $1 OR 
        reference_number ILIKE $1 OR
        mobile ILIKE $1
      )`
      params.push(`%${search}%`)
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await db.query(query, params)

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM account_bookings'
    let countParams: any[] = []

    if (search) {
      countQuery += ` WHERE (
        sender ILIKE $1 OR 
        receiver ILIKE $1 OR 
        reference_number ILIKE $1 OR
        mobile ILIKE $1
      )`
      countParams.push(`%${search}%`)
    }

    const countResult = await db.query(countQuery, countParams)
    const totalCount = parseInt(countResult.rows[0].count)

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching account bookings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch account bookings' },
      { status: 500 }
    )
  }
})
