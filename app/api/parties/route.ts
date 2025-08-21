import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { createPartySchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// GET /api/parties - Get all parties with pagination and search
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/parties handler entry');
    let user;
    try {
      user = await getUserFromRequest(request);
      console.log('User:', user);
    } catch (authError) {
      console.error('Error authenticating user:', authError);
      return NextResponse.json({ error: 'Auth error', details: authError instanceof Error ? authError.message : authError }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let page, limit, search, sort, order;
    try {
      const { searchParams } = new URL(request.url);
      ({ page, limit, search, sort, order } = paginationSchema.parse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        search: searchParams.get('search'),
        sort: searchParams.get('sort'),
        order: searchParams.get('order'),
      }));
      console.log('Pagination params:', { page, limit, search, sort, order });
    } catch (parseError) {
      console.error('Error parsing pagination params:', parseError);
      return NextResponse.json({ error: 'Pagination parse error', details: parseError instanceof Error ? parseError.message : parseError }, { status: 500 });
    }

    const offset = (page - 1) * limit;
    let query = 'SELECT *, COUNT(*) OVER() as total_count FROM parties';
    const queryParams = [];

    if (search) {
      query += ' WHERE party_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1';
      queryParams.push(`%${search}%`);
    }

    const sortableColumns = ['party_name', 'created_at', 'city', 'state'];
    const sortBy = sort && sortableColumns.includes(sort) ? sort : 'created_at';
    
    query += ` ORDER BY ${sortBy} ${order.toUpperCase()} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    try {
      console.log('GET /api/parties SQL:', query);
      console.log('GET /api/parties params:', queryParams);
      const result = await db.query(query, queryParams);
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / limit);

      return NextResponse.json({
        data: result.rows.map(row => {
          try {
            delete row.total_count;
            return {
              id: row.id,
              partyName: row.party_name,
              contactPerson: row.contact_person,
              phoneNumber: row.phone,
              email: row.email,
              billingAddress: {
                street: row.address,
                city: row.city,
                pincode: row.pincode,
              },
              gstin: row.gst_number,
              panNumber: row.pan_number,
              state: row.state,
              gstType: row.gst_type,
              // slab fields if present
              weightSlabId: row.weight_slab_id ?? undefined,
              distanceSlabId: row.distance_slab_id ?? undefined,
              distanceCategory: row.distance_category ?? undefined,
              volumeSlabId: row.volume_slab_id ?? undefined,
              codSlabId: row.cod_slab_id ?? undefined,
              // Only include fields if they exist in the row
              ...(row.created_at && { createdAt: row.created_at }),
              ...(row.updated_at && { updatedAt: row.updated_at }),
            };
          } catch (err) {
            console.error('Error mapping party row:', row, err);
            return null;
          }
        }).filter(Boolean),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
        },
      });
    } catch (dbError) {
      console.error('DB error in GET /api/parties:', dbError, { query, queryParams });
      return NextResponse.json({ error: 'Database error', details: dbError instanceof Error ? dbError.message : dbError, query, queryParams }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching parties:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/parties - Create a new party
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !(hasRole(user, 'billing_operator') || hasRole(user, 'admin'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Incoming party creation payload:', JSON.stringify(body));
    let validatedData;
    try {
      validatedData = createPartySchema.parse(body);
    } catch (zodError) {
      console.error('Zod validation error:', zodError);
      if (zodError instanceof ZodError) {
        return NextResponse.json({ error: 'Invalid input', details: zodError.errors }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    // Normalize optional empty strings/undefined to nulls to satisfy DB constraints
    const v = validatedData
    const values = [
      v.party_name,
      v.contact_person ?? null,
      v.phone ?? null,
      v.email === '' ? null : (v.email ?? null),
      v.address ?? null,
      v.city ?? null,
      v.state ?? null,
      v.pincode ?? null,
      v.gst_number ?? null,
      v.gst_type ?? null,
      v.pan_number ?? null,
      v.weight_slab_id ?? null,
      v.distance_slab_id ?? null,
      v.distance_category ?? null,
      v.volume_slab_id ?? null,
      v.cod_slab_id ?? null,
      user.id,
    ] as const

    const insertSQL = `
      INSERT INTO parties (
        party_name, contact_person, phone, email, address, city, state, pincode, gst_number, gst_type, pan_number,
        weight_slab_id, distance_slab_id, distance_category, volume_slab_id, cod_slab_id,
        created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17
      )
      RETURNING *
    `

    try {
      const result = await db.query(insertSQL, values as unknown as any[])
      return NextResponse.json(result.rows[0], { status: 201 });
    } catch (dbError: any) {
      console.error('DB error in POST /api/parties:', dbError, { insertSQL, values })
      // Surface constraint violations and metadata to the client for easier debugging
      const errPayload: Record<string, any> = {
        error: 'Database error',
        details: dbError?.message || String(dbError),
      }
      // Common pg error fields if available
      for (const k of ['code','constraint','table','column','detail','schema','hint','position']) {
        if (dbError && dbError[k]) errPayload[k] = dbError[k]
      }
      return NextResponse.json(errPayload, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating party:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
