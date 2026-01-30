import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/bills/[id] - Delete a bill
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = parseInt(params.id)
    
    if (isNaN(billId)) {
      return NextResponse.json({ error: 'Invalid bill ID' }, { status: 400 })
    }

    // First check if the bill exists
    const billCheck = await db.query(
      'SELECT id, bill_number FROM bills WHERE id = $1',
      [billId]
    )

    if (billCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const bill = billCheck.rows[0]

    // Delete the bill
    await db.query('DELETE FROM bills WHERE id = $1', [billId])

    return NextResponse.json({
      success: true,
      message: `Bill ${bill.bill_number} deleted successfully`
    })

  } catch (error) {
    console.error('Error deleting bill:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete bill',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    )
  }
}

// GET /api/bills/[id] - Get a specific bill
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = parseInt(params.id)
    
    if (isNaN(billId)) {
      return NextResponse.json({ error: 'Invalid bill ID' }, { status: 400 })
    }

    const result = await db.query(`
      SELECT 
        b.*,
        p.party_name,
        p.contact_person,
        p.phone,
        p.email
      FROM bills b
      JOIN parties p ON b.party_id = p.id
      WHERE b.id = $1
    `, [billId])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const bill = result.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        id: bill.id,
        billNumber: bill.bill_number,
        billDate: bill.bill_date,
        partyName: bill.party_name,
        contactPerson: bill.contact_person,
        phone: bill.phone,
        email: bill.email,
        baseAmount: parseFloat(bill.base_amount),
        serviceCharges: parseFloat(bill.service_charges),
        fuelCharges: parseFloat(bill.fuel_charges),
        otherCharges: parseFloat(bill.other_charges),
        cgstAmount: parseFloat(bill.cgst_amount),
        sgstAmount: parseFloat(bill.sgst_amount),
        igstAmount: parseFloat(bill.igst_amount),
        totalAmount: parseFloat(bill.total_amount),
        template: bill.template,
        emailSent: bill.email_sent,
        status: bill.status,
        createdAt: bill.created_at
      }
    })

  } catch (error) {
    console.error('Error fetching bill:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bill',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    )
  }
}
