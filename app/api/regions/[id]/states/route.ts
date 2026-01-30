import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET states for a region
export const GET = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const result = await db.query(`
      SELECT rs.state_code, rs.created_at,
             COALESCE(
               json_agg(
                 CASE WHEN c.city IS NOT NULL THEN c.city END
                 ORDER BY c.city
               ) FILTER (WHERE c.city IS NOT NULL), 
               '[]'::json
             ) as cities
      FROM region_states rs
      LEFT JOIN centers c ON c.state = rs.state_code AND c.region_id = rs.region_id
      WHERE rs.region_id = $1
      GROUP BY rs.state_code, rs.created_at
      ORDER BY rs.state_code
    `, [id])
    
    return NextResponse.json({ 
      success: true,
      data: result.rows 
    })
  } catch (error) {
    console.error('Error fetching region states:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch region states' },
      { status: 500 }
    )
  }
})

// POST/PUT save states and cities for a region
export const POST = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const body = await req.json()
    const { stateCode, cities } = body

    if (!stateCode) {
      return NextResponse.json(
        { success: false, error: 'State code is required' },
        { status: 400 }
      )
    }

    // Start transaction
    await db.query('BEGIN')

    try {
      // Insert or update region_states
      await db.query(`
        INSERT INTO region_states (region_id, state_code) 
        VALUES ($1, $2) 
        ON CONFLICT (region_id, state_code) DO NOTHING
      `, [id, stateCode])

      // Remove existing centers for this region and state
      await db.query(`
        DELETE FROM centers 
        WHERE region_id = $1 AND state = $2
      `, [id, stateCode])

      // Insert new centers for selected cities
      if (cities && cities.length > 0) {
        const values = cities.map((city: string) => `(${id}, '${stateCode}', '${city}')`).join(',')
        await db.query(`
          INSERT INTO centers (region_id, state, city) 
          VALUES ${values}
        `)
      }

      await db.query('COMMIT')

      return NextResponse.json({ 
        success: true,
        message: 'Region state and cities saved successfully'
      })
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error saving region states:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save region states' },
      { status: 500 }
    )
  }
})

// DELETE remove state from region
export const DELETE = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const url = new URL(req.url)
    const stateCode = url.searchParams.get('stateCode')

    if (!stateCode) {
      return NextResponse.json(
        { success: false, error: 'State code is required' },
        { status: 400 }
      )
    }

    // Start transaction
    await db.query('BEGIN')

    try {
      // Remove centers for this region and state
      await db.query(`
        DELETE FROM centers 
        WHERE region_id = $1 AND state = $2
      `, [id, stateCode])

      // Remove from region_states
      await db.query(`
        DELETE FROM region_states 
        WHERE region_id = $1 AND state_code = $2
      `, [id, stateCode])

      await db.query('COMMIT')

      return NextResponse.json({ 
        success: true,
        message: 'State removed from region successfully'
      })
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error removing region state:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove region state' },
      { status: 500 }
    )
  }
})
