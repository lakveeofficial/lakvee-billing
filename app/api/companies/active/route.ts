import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { z } from 'zod';

const setActiveCompanySchema = z.object({
  companyId: z.number(),
});

// GET the active company for the current user
export const GET = withAuth(async ({ user }) => {
  try {
    const result = await db.query(
      `SELECT c.* FROM companies c
       JOIN active_companies ac ON c.id = ac.company_id
       WHERE ac.user_id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'No active company set' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching active company:', error);
    return NextResponse.json({ message: 'Failed to fetch active company' }, { status: 500 });
  }
});

// POST to set the active company for the current user
export const POST = withAuth(async ({ user }, req) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { companyId } = setActiveCompanySchema.parse(body);

    // Verify the company exists and belongs to the user
    const companyCheck = await db.query('SELECT id FROM companies WHERE id = $1 AND created_by = $2', [companyId, user.id]);
    if (companyCheck.rows.length === 0) {
      return NextResponse.json({ message: 'Company not found or access denied' }, { status: 404 });
    }

    // Upsert the active company setting
    const result = await db.query(
      `INSERT INTO active_companies (user_id, company_id) 
       VALUES ($1, $2)
       ON CONFLICT (user_id) 
       DO UPDATE SET company_id = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user.id, companyId]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error setting active company:', error);
    return NextResponse.json({ message: 'Failed to set active company' }, { status: 500 });
  }
});
