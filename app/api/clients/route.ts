import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET all clients (which are parties)
export const GET = withAuth(async ({ user }) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        party_name as name,
        contact_person as contact_person_name,
        phone,
        email,
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
      WHERE client_type = 'client' OR client_type IS NULL
      ORDER BY party_name
    `)

    return NextResponse.json({ 
      success: true,
      data: result.rows 
    })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
})

// POST create new client (as party)
export const POST = withAuth(async ({ user }, req) => {
  try {
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

    // Insert into parties table with client_type flag
    const result = await db.query(`
      INSERT INTO parties (
        party_name,
        contact_person,
        phone,
        email,
        email2,
        city,
        state,
        gst_type,
        gstin,
        billing_address,
        shipping_address,
        use_shipping_address,
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
        client_type,
        created_by,
        updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      ) RETURNING *
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
      false, // use_shipping_address
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
      'client',
      user.id,
      user.id
    ])

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    )
  }
})
