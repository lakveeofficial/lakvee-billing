import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// PUT update account booking by ID
export const PUT = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params

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
      remarks
    } = body

    if (!sender || !receiver) {
      return NextResponse.json(
        { success: false, error: 'Sender and receiver are required' },
        { status: 400 }
      )
    }

    const result = await db.query(`
      UPDATE account_bookings SET
        booking_date = $1, sender = $2, center = $3, receiver = $4, mobile = $5, carrier = $6,
        reference_number = $7, package_type = $8, weight = $9, number_of_boxes = $10,
        gross_amount = $11, other_charges = $12, insurance_amount = $13,
        parcel_value = $14, net_amount = $15, remarks = $16, updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING *
    `, [
      date, sender, center, receiver, mobile, carrier, reference_number,
      package_type, weight, number_of_boxes, gross_amount, other_charges,
      insurance_amount, parcel_value, net_amount, remarks, id
    ])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Account booking updated successfully'
    })
  } catch (error) {
    console.error('Error updating account booking:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update account booking' },
      { status: 500 }
    )
  }
})

// DELETE account booking by ID
export const DELETE = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params

    const result = await db.query(`
      DELETE FROM account_bookings 
      WHERE id = $1
      RETURNING id
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account booking deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting account booking:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete account booking' },
      { status: 500 }
    )
  }
})
