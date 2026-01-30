import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET all regions
export async function GET(req: Request) {
  try {
    // Get regions with their states and cities
    const result = await db.query(`
      SELECT 
        r.id, r.code, r.name, r.created_at, r.updated_at,
        COALESCE(
          json_object_agg(
            rs.state_code,
            COALESCE(state_cities.cities, '[]'::json)
          ) FILTER (WHERE rs.state_code IS NOT NULL),
          '{}'::json
        ) as states
      FROM regions r
      LEFT JOIN region_states rs ON r.id = rs.region_id
      LEFT JOIN (
        SELECT 
          region_id, 
          state,
          json_agg(city ORDER BY city) as cities
        FROM centers 
        GROUP BY region_id, state
      ) state_cities ON rs.region_id = state_cities.region_id AND rs.state_code = state_cities.state
      GROUP BY r.id, r.code, r.name, r.created_at, r.updated_at
      ORDER BY r.name
    `)

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching regions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch regions' },
      { status: 500 }
    )
  }
}

// POST create new region
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { code, name } = body

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: 'Code and name are required' },
        { status: 400 }
      )
    }

    const result = await db.query(
      'INSERT INTO regions(code, name) VALUES($1,$2) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, updated_at=now() RETURNING *',
      [code, name]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error creating region:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create region' },
      { status: 500 }
    )
  }
}
