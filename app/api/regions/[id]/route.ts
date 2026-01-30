import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET single region
export const GET = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const result = await db.query('SELECT * FROM regions WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Region not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      data: result.rows[0] 
    })
  } catch (error) {
    console.error('Error fetching region:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch region' },
      { status: 500 }
    )
  }
})

// PUT update region
export const PUT = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const body = await req.json()
    const { code, name } = body

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: 'Code and name are required' },
        { status: 400 }
      )
    }

    const result = await db.query(
      'UPDATE regions SET code=$1, name=$2, updated_at=now() WHERE id=$3 RETURNING *', 
      [code, name, id]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Region not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating region:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update region' },
      { status: 500 }
    )
  }
})

// DELETE region
export const DELETE = withAuth(async ({ user }, req, { params }) => {
  try {
    const { id } = params
    const result = await db.query('DELETE FROM regions WHERE id=$1 RETURNING id', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Region not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Region deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting region:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete region' },
      { status: 500 }
    )
  }
})
