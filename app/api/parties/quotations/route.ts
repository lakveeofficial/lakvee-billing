import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET all party quotations
export async function GET() {
  try {
    // First ensure required tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS party_quotations (
        id SERIAL PRIMARY KEY,
        party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        package_type VARCHAR(50) NOT NULL,
        rates JSONB NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(party_id, package_type)
      )
    `)

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

    const result = await db.query(`
      SELECT 
        p.id,
        p.party_name,
        p.contact_person,
        p.phone,
        p.email,
        p.city,
        p.state,
        CASE WHEN COUNT(pq.id) > 0 THEN true ELSE false END as has_quotation,
        COALESCE(
          json_agg(
            json_build_object(
              'package_type', pq.package_type,
              'rates', pq.rates,
              'created_at', pq.created_at,
              'updated_at', pq.updated_at
            )
          ) FILTER (WHERE pq.id IS NOT NULL),
          '[]'::json
        ) as quotations,
        ppt.package_types as package_configs
      FROM parties p
      LEFT JOIN party_quotations pq ON p.id = pq.party_id
      LEFT JOIN party_package_types ppt ON p.id = ppt.party_id
      GROUP BY p.id, p.party_name, p.contact_person, p.phone, p.email, p.city, p.state, ppt.package_types
      ORDER BY p.party_name
    `)


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
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { party_id, package_type, rates } = body

    // Fallback user ID
    const user = { id: 1 }

    if (!party_id || !package_type || !rates) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
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
    `, [party_id, package_type, JSON.stringify(rates), user.id])

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error creating/updating party quotation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save party quotation' },
      { status: 500 }
    )
  }
}
