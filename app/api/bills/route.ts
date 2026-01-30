import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/bills - Get all generated bills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await db.query(`
      SELECT 
        b.id,
        b.bill_number,
        b.bill_date,
        b.total_amount,
        b.status,
        b.template,
        b.email_sent,
        b.created_at,
        p.party_name,
        p.contact_person
      FROM bills b
      JOIN parties p ON b.party_id = p.id
      WHERE b.bill_type IS DISTINCT FROM 'period'
      ORDER BY b.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    const countResult = await db.query("SELECT COUNT(*) as total FROM bills WHERE bill_type IS DISTINCT FROM 'period'")
    const total = parseInt(countResult.rows[0].total)

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        billNumber: row.bill_number,
        billDate: row.bill_date,
        partyName: row.party_name,
        contactPerson: row.contact_person,
        totalAmount: parseFloat(row.total_amount),
        status: row.status,
        template: row.template,
        emailSent: row.email_sent,
        createdAt: row.created_at
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bills',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
