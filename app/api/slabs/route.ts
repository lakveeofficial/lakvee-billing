import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/slabs - list all slabs
function toCamel(obj: any) {
  return {
    id: obj.id,
    slabType: obj.slabtype ?? obj.slab_type,
    slabLabel: obj.slablabel ?? obj.slab_label,
    fromValue: obj.fromvalue ?? obj.from_value,
    toValue: obj.tovalue ?? obj.to_value,
    unitType: obj.unittype ?? obj.unit_type,
    rate: obj.rate,
    effectiveDate: obj.effectivedate ?? obj.effective_date,
    status: obj.status,
    distanceCategory: obj.distancecategory ?? obj.distance_category,
  };
}

export async function GET() {
  try {
    const result = await db.query('SELECT * FROM slabs ORDER BY id ASC');
    return NextResponse.json(result.rows.map(toCamel));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch slabs', details: String(error) }, { status: 500 });
  }
}

// POST /api/slabs - create a new slab
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slabType, slabLabel, fromValue, toValue, unitType, rate, effectiveDate, status, distanceCategory } = body;
    const result = await db.query(
      `INSERT INTO slabs (slabType, slabLabel, fromValue, toValue, unitType, rate, effectiveDate, status, distanceCategory)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [slabType, slabLabel, fromValue, toValue, unitType, rate, effectiveDate, status, distanceCategory]
    );
    return NextResponse.json(toCamel(result.rows[0]));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create slab', details: String(error) }, { status: 500 });
  }
}
