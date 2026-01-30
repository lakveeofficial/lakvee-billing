import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET all centers
export const GET = withAuth(async ({ user }, req) => {
  try {
    const url = new URL(req.url)
    const regionId = url.searchParams.get('regionId')
    
    const query = regionId 
      ? 'SELECT * FROM centers WHERE region_id=$1 ORDER BY city'
      : 'SELECT * FROM centers ORDER BY city'
    
    const params = regionId ? [regionId] : []
    const result = await db.query(query, params)
    
    return NextResponse.json({ 
      success: true,
      data: result.rows 
    })
  } catch (error) {
    console.error('Error fetching centers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch centers' },
      { status: 500 }
    )
  }
})

// POST create new center
export const POST = withAuth(async ({ user }, req) => {
  try {
    const body = await req.json()
    const { state, city, region_id } = body

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City is required' },
        { status: 400 }
      )
    }

    const result = await db.query(
      'INSERT INTO centers(state, city, region_id) VALUES($1,$2,$3) RETURNING *',
      [state || '', city, region_id || null]
    )
    
    return NextResponse.json({ 
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error creating center:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create center' },
      { status: 500 }
    )
  }
})
