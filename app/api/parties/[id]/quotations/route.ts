import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET party quotations
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const partyId = parseInt(params.id)

    const result = await db.query(`
      SELECT package_type, rates, created_at, updated_at
      FROM party_quotations 
      WHERE party_id = $1
      ORDER BY package_type
    `, [partyId])

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching party quotations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch party quotations' },
      { status: 500 }
    )
  }
}

// POST create or update party quotation
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const partyId = parseInt(params.id)
    const body = await req.json()
    const { package_type, rates } = body

    // Fallback user ID
    const user = { id: 1 }

    if (!package_type || !rates) {
      return NextResponse.json(
        { success: false, error: 'Package type and rates are required' },
        { status: 400 }
      )
    }

    // Upsert party quotation
    const result = await db.query(`
      INSERT INTO party_quotations (party_id, package_type, rates, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $4)
      ON CONFLICT (party_id, package_type)
      DO UPDATE SET 
        rates = EXCLUDED.rates,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [partyId, package_type, JSON.stringify(rates), user.id])

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error saving party quotation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save party quotation' },
      { status: 500 }
    )
  }
}

// DELETE party quotation by package type
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const partyId = parseInt(params.id)
    const url = new URL(req.url)
    const packageType = url.searchParams.get('package_type')

    // Fallback user ID
    const user = { id: 1 }

    if (!packageType) {
      return NextResponse.json(
        { success: false, error: 'Package type is required' },
        { status: 400 }
      )
    }

    const result = await db.query(`
      DELETE FROM party_quotations 
      WHERE party_id = $1 AND package_type = $2
      RETURNING *
    `, [partyId, packageType])

    return NextResponse.json({
      success: true,
      data: result.rows[0] || null,
      message: `Deleted quotation for package type: ${packageType}`
    })
  } catch (error) {
    console.error('Error deleting party quotation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete party quotation' },
      { status: 500 }
    )
  }
}
