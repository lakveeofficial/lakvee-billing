import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import jwt from 'jsonwebtoken'

// Generate temporary PDF access token
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { invoiceId, type = 'invoice' } = await request.json()
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
    }

    // Generate temporary token valid for 5 minutes
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET not configured')
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        invoiceId, 
        type,
        purpose: 'pdf_access' 
      },
      secret,
      { expiresIn: '5m' }
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error('PDF token generation failed:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
