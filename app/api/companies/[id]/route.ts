import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { companySchema } from '@/lib/validations';

// GET a single company by ID
export const GET = withAuth(async ({ user }, req, { params }: { params: { id: string } }) => {
  const { id } = params;

  try {
    const result = await db.query('SELECT * FROM companies WHERE id = $1 AND created_by = $2', [id, user.id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching company ${id}:`, error);
    return NextResponse.json({ message: 'Failed to fetch company' }, { status: 500 });
  }
});

// PUT (update) a company by ID
export const PUT = withAuth(async ({ user }, req, { params }: { params: { id: string } }) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await req.json();
    const companyData = companySchema.parse(body);

    const updatedCompany = await db.query(
      `UPDATE companies SET 
        business_name = $1, phone_number = $2, gstin = $3, email_id = $4, 
        business_type = $5, business_category = $6, state = $7, pincode = $8, 
        business_address = $9, logo = $10, signature = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND created_by = $13 RETURNING *`,
      [
        companyData.businessName,
        companyData.phoneNumber,
        companyData.gstin,
        companyData.emailId,
        companyData.businessType,
        companyData.businessCategory,
        companyData.state,
        companyData.pincode,
        companyData.businessAddress,
        companyData.logo,
        companyData.signature,
        id,
        user.id
      ]
    );

    if (updatedCompany.rows.length === 0) {
      return NextResponse.json({ message: 'Company not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(updatedCompany.rows[0]);
  } catch (error) {
    console.error(`Error updating company ${id}:`, error);
    return NextResponse.json({ message: 'Failed to update company' }, { status: 500 });
  }
});

// DELETE a company by ID
export const DELETE = withAuth(async ({ user }, req, { params }: { params: { id: string } }) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  try {
    // Check if the company is active for any user
    const activeCheck = await db.query('SELECT user_id FROM active_companies WHERE company_id = $1', [id]);
    if (activeCheck.rows.length > 0) {
      return NextResponse.json({ message: 'Cannot delete an active company. Please set a different company as active first.' }, { status: 400 });
    }

    const result = await db.query('DELETE FROM companies WHERE id = $1 AND created_by = $2 RETURNING *', [id, user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Company not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error(`Error deleting company ${id}:`, error);
    return NextResponse.json({ message: 'Failed to delete company' }, { status: 500 });
  }
});
