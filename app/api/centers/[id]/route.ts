import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET single center
export const GET = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const result = await db.query('SELECT * FROM centers WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Center not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      data: result.rows[0] 
    })
  } catch (error) {
    console.error('Error fetching center:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch center' },
      { status: 500 }
    )
  }
})

// PUT update center
export const PUT = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const body = await req.json()
    const { state, city, region_id, is_active } = body

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City is required' },
        { status: 400 }
      )
    }

    const result = await db.query(
      'UPDATE centers SET state=$1, city=$2, region_id=$3, is_active=$4, updated_at=now() WHERE id=$5 RETURNING *',
      [state || '', city, region_id || null, is_active ?? true, id]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Center not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating center:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update center' },
      { status: 500 }
    )
  }
})

// DELETE center
export const DELETE = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const result = await db.query('DELETE FROM centers WHERE id=$1 RETURNING id', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Center not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Center deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting center:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete center' },
      { status: 500 }
    )
  }
})
