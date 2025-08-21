import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { updatePartySchema } from '@/lib/validations';

interface RouteParams {
  params: { id: string };
}

// GET /api/parties/[id] - Get a single party by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const result = await db.query('SELECT * FROM parties WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const mapped = {
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // slab fields
      weightSlabId: row.weight_slab_id ?? undefined,
      distanceSlabId: row.distance_slab_id ?? undefined,
      distanceCategory: row.distance_category ?? undefined,
      volumeSlabId: row.volume_slab_id ?? undefined,
      codSlabId: row.cod_slab_id ?? undefined,
    };

    return NextResponse.json(mapped);

  } catch (error) {
    console.error(`Error fetching party ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/parties/[id] - Update a party
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !hasRole(user, 'billing_operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = updatePartySchema.parse(body);

    const fields = Object.keys(validatedData);
    const values = Object.values(validatedData);
    
    if (fields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const query = `UPDATE parties SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} RETURNING *`;
    
    const result = await db.query(query, [...values, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error(`Error updating party ${params.id}:`, error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/parties/[id] - Delete a party
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !hasRole(user, 'admin')) { // Only admins can delete parties
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const result = await db.query('DELETE FROM parties WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Party deleted successfully' });

  } catch (error) {
    console.error(`Error deleting party ${params.id}:`, error);
    // Check for foreign key constraint violation
    const pgCode = (error as { code?: string } | undefined)?.code;
    if (pgCode === '23503') {
        return NextResponse.json({ error: 'Cannot delete party with existing invoices' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
