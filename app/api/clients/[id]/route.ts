import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET single client
export const GET = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    
    const result = await db.query(`
      SELECT 
        id,
        party_name as name,
        contact_person as contact_person_name,
        phone,
        email,
        email2,
        city,
        state,
        gst_type,
        gstin as gst_number,
        billing_address,
        shipping_address,
        fuel_charge_percent,
        fov_charge_percent,
        cgst_percent,
        sgst_percent,
        igst_percent,
        status,
        send_weights_in_email,
        send_charges_in_email,
        send_carrier_in_email,
        send_remark_in_email,
        send_welcome_sms,
        ignore_while_import,
        booking_with_gst,
        created_at,
        updated_at
      FROM parties 
      WHERE id = $1 AND (client_type = 'client' OR client_type IS NULL)
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      data: result.rows[0] 
    })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
})

// PUT update client
export const PUT = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const body = await req.json()
    const {
      name,
      contactPersonName,
      address,
      state,
      city,
      phone,
      email1,
      email2,
      fuelChargePercent,
      fovChargePercent,
      gstType,
      gstNumber,
      cgstPercent,
      sgstPercent,
      igstPercent,
      status,
      sendWeightsInEmail,
      sendChargesInEmail,
      sendCarrierInEmail,
      sendRemarkInEmail,
      sendWelcomeSMS,
      ignoreWhileImport,
      bookingWithGST
    } = body

    if (!name || !contactPersonName) {
      return NextResponse.json(
        { success: false, error: 'Name and Contact Person Name are required' },
        { status: 400 }
      )
    }

    // Create billing address object
    const billingAddress = {
      street: address || '',
      city: city || '',
      state: state || '',
      pincode: '',
      country: 'India'
    }

    const result = await db.query(`
      UPDATE parties SET
        party_name = $1,
        contact_person = $2,
        phone = $3,
        email = $4,
        email2 = $5,
        city = $6,
        state = $7,
        gst_type = $8,
        gstin = $9,
        billing_address = $10,
        shipping_address = $11,
        fuel_charge_percent = $12,
        fov_charge_percent = $13,
        cgst_percent = $14,
        sgst_percent = $15,
        igst_percent = $16,
        status = $17,
        send_weights_in_email = $18,
        send_charges_in_email = $19,
        send_carrier_in_email = $20,
        send_remark_in_email = $21,
        send_welcome_sms = $22,
        ignore_while_import = $23,
        booking_with_gst = $24,
        updated_by = $25,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $26 AND (client_type = 'client' OR client_type IS NULL)
      RETURNING *
    `, [
      name,
      contactPersonName,
      phone || '',
      email1 || '',
      email2 || '',
      city || '',
      state || '',
      gstType === 'GST' ? 'registered' : 'unregistered',
      gstNumber || '',
      JSON.stringify(billingAddress),
      JSON.stringify(billingAddress), // shipping_address (same as billing for now)
      parseFloat(fuelChargePercent) || 0,
      parseFloat(fovChargePercent) || 0,
      parseFloat(cgstPercent) || 0,
      parseFloat(sgstPercent) || 0,
      parseFloat(igstPercent) || 0,
      status || 'Active',
      sendWeightsInEmail || false,
      sendChargesInEmail || false,
      sendCarrierInEmail || false,
      sendRemarkInEmail || false,
      sendWelcomeSMS || false,
      ignoreWhileImport || false,
      bookingWithGST || false,
      user.id,
      id
    ])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 }
    )
  }
})

// DELETE client
export const DELETE = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    
    const result = await db.query(`
      DELETE FROM parties 
      WHERE id = $1 AND (client_type = 'client' OR client_type IS NULL)
      RETURNING id
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete client' },
      { status: 500 }
    )
  }
})
