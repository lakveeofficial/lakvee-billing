import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { companySchema, paginationSchema } from '@/lib/validations';

// GET all companies with search and pagination
export const GET = withAuth(async ({ user }, req) => {
  const { searchParams } = new URL(req.url);

  try {
    const queryParams = Object.fromEntries(searchParams.entries());
    const { page, limit, search, sort } = paginationSchema.parse(queryParams);

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE created_by = $1';
    const queryValues: any[] = [user.id];

    if (search) {
      whereClause += ` AND (business_name ILIKE $${queryValues.length + 1} OR email_id ILIKE $${queryValues.length + 1} OR gstin ILIKE $${queryValues.length + 1})`;
      queryValues.push(`%${search}%`);
    }

    const companiesQuery = `
      SELECT * FROM companies
      ${whereClause}
      ORDER BY ${sort || 'created_at DESC'}
      LIMIT $${queryValues.length + 1} OFFSET $${queryValues.length + 2}
    `;
    queryValues.push(limit, offset);

    const companiesResult = await db.query(companiesQuery, queryValues);

    // Create a separate query for counting total records with proper type casting
    const countQuery = `SELECT COUNT(*)::integer FROM companies ${whereClause}`;
    const countValues: (string | number)[] = [user.id];
    if (search) {
      countValues.push(`%${search}%`);
    }
    const totalCompaniesResult = await db.query(countQuery, countValues);
    const totalCompanies = parseInt(totalCompaniesResult.rows[0].count, 10);

    return NextResponse.json({
      companies: companiesResult.rows,
      totalPages: Math.ceil(totalCompanies / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error('Non-Error object thrown:', error);
    }
    
    return NextResponse.json(
      { 
        message: 'Failed to fetch companies',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
});

// POST a new company
export const POST = withAuth(async ({ user }, req) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const companyData = companySchema.parse(body);

    const newCompany = await db.query(
      `INSERT INTO companies (business_name, phone_number, gstin, email_id, business_type, business_category, state, pincode, business_address, logo, signature, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
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
        user.id
      ]
    );

    return NextResponse.json(newCompany.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ message: 'Failed to create company' }, { status: 500 });
  }
});
