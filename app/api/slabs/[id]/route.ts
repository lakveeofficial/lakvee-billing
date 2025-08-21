import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/slabs/[id] - update a slab
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid slab id' }, { status: 400 });
    }
    const body = await request.json();
    const { slabType, slabLabel, fromValue, toValue, unitType, rate, effectiveDate, status, distanceCategory } = body;
    const result = await db.query(
      `UPDATE slabs SET slabType=$1, slabLabel=$2, fromValue=$3, toValue=$4, unitType=$5, rate=$6, effectiveDate=$7, status=$8, distanceCategory=$9 WHERE id=$10 RETURNING *`,
      [slabType, slabLabel, fromValue, toValue, unitType, rate, effectiveDate, status, distanceCategory, id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Slab not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update slab', details: String(error) }, { status: 500 });
  }
}

// DELETE /api/slabs/[id] - delete a slab
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid slab id' }, { status: 400 });
    }
    const result = await db.query('DELETE FROM slabs WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Slab not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Slab deleted', slab: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete slab', details: String(error) }, { status: 500 });
  }
}
