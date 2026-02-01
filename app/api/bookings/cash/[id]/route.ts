import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// DELETE /api/bookings/cash/[id]
export const DELETE = withAuth(async ({ user }, req, { params }) => {
    try {
        const { id } = params

        const result = await db.query(`
      DELETE FROM cash_bookings 
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
            message: 'Cash booking deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting cash booking:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete cash booking' },
            { status: 500 }
        )
    }
})

// PUT /api/bookings/cash/[id]
export const PUT = withAuth(async ({ user }, req, { params }) => {
    try {
        const { id } = params
        const body = await req.json()
        const {
            date, sender, sender_mobile, sender_address, center,
            receiver, receiver_mobile, receiver_address, carrier,
            reference_number, package_type, weight, number_of_boxes,
            gross_amount, fuel_charge_percent, insurance_amount,
            cgst_amount, sgst_amount, net_amount, parcel_value,
            weight_unit, remarks
        } = body

        const result = await db.query(`
        UPDATE cash_bookings SET
          date = $1, sender = $2, sender_mobile = $3, sender_address = $4, center = $5,
          receiver = $6, receiver_mobile = $7, receiver_address = $8, carrier = $9,
          reference_number = $10, package_type = $11, weight = $12, number_of_boxes = $13,
          gross_amount = $14, fuel_charge_percent = $15, insurance_amount = $16,
          cgst_amount = $17, sgst_amount = $18, net_amount = $19, parcel_value = $20,
          weight_unit = $21, remarks = $22, updated_at = CURRENT_TIMESTAMP
        WHERE id = $23
        RETURNING *
      `, [
            date, sender, sender_mobile, sender_address, center,
            receiver, receiver_mobile, receiver_address, carrier,
            reference_number, package_type, weight, number_of_boxes,
            gross_amount, fuel_charge_percent, insurance_amount,
            cgst_amount, sgst_amount, net_amount, parcel_value,
            weight_unit, remarks, id
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
            message: 'Cash booking updated successfully'
        })
    } catch (error) {
        console.error('Error updating cash booking:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update cash booking' },
            { status: 500 }
        )
    }
})
