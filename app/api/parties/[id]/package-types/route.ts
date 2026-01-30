import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET party package types
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const partyId = parseInt(params.id)

    const result = await db.query(`
      SELECT package_types 
      FROM party_package_types 
      WHERE party_id = $1
    `, [partyId])

    if (result.rows.length > 0) {
      return NextResponse.json({
        success: true,
        data: result.rows[0].package_types
      })
    } else {
      return NextResponse.json({
        success: true,
        data: []
      })
    }
  } catch (error) {
    console.error('Error fetching party package types:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch party package types' },
      { status: 500 }
    )
  }
}

// POST create or update party package types
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const partyId = parseInt(params.id)
    const body = await req.json()
    const { packageTypes } = body

    // Fallback user ID
    const user = { id: 1 }

    if (!packageTypes) {
      return NextResponse.json(
        { success: false, error: 'Package types are required' },
        { status: 400 }
      )
    }

    // Ensure party_package_types table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS party_package_types (
        id SERIAL PRIMARY KEY,
        party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        package_types JSONB NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(party_id)
      )
    `)

    // Upsert party package types
    const result = await db.query(`
      INSERT INTO party_package_types (party_id, package_types, created_by, updated_by)
      VALUES ($1, $2, $3, $3)
      ON CONFLICT (party_id)
      DO UPDATE SET 
        package_types = EXCLUDED.package_types,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [partyId, JSON.stringify(packageTypes), user.id])

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error saving party package types:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save party package types' },
      { status: 500 }
    )
  }
}
