import { NextRequest, NextResponse } from 'next/server';
import { db, generateInvoiceNumber } from '@/lib/db';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { createInvoiceSchema, invoiceQuerySchema } from '@/lib/validations';

// GET /api/invoices - Get all invoices
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sort, order, party_id, payment_status, date_from, date_to } = invoiceQuerySchema.parse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        search: searchParams.get('search'),
        sort: searchParams.get('sort'),
        order: searchParams.get('order'),
        party_id: searchParams.get('party_id'),
        payment_status: searchParams.get('payment_status'),
        date_from: searchParams.get('date_from'),
        date_to: searchParams.get('date_to'),
    });

    const offset = (page - 1) * limit;
    let query = `
        SELECT 
          i.*, 
          p.party_name, 
          p.phone AS party_phone,
          -- Base sum from linked CSV rows (slab base used in PDF Amount column)
          COALESCE(ci.base_sum, 0) AS csv_base_sum,
          -- Extract slab breakdown components
          COALESCE((i.slab_breakdown->>'fuel_pct')::numeric, 0) AS fuel_pct,
          COALESCE((i.slab_breakdown->>'packing')::numeric, 0) AS packing,
          COALESCE((i.slab_breakdown->>'handling')::numeric, 0) AS handling,
          COALESCE((i.slab_breakdown->>'gst_pct')::numeric, (i.slab_breakdown->>'gst_percent')::numeric, 0) AS gst_pct,
          -- Compute display total to match PDF logic
          (
            COALESCE(ci.base_sum, 0)
            + (COALESCE(ci.base_sum, 0) * (COALESCE((i.slab_breakdown->>'fuel_pct')::numeric, 0) / 100.0))
            + COALESCE((i.slab_breakdown->>'packing')::numeric, 0)
            + COALESCE((i.slab_breakdown->>'handling')::numeric, 0)
            + (
                (
                  COALESCE(ci.base_sum, 0)
                  + (COALESCE(ci.base_sum, 0) * (COALESCE((i.slab_breakdown->>'fuel_pct')::numeric, 0) / 100.0))
                  + COALESCE((i.slab_breakdown->>'packing')::numeric, 0)
                  + COALESCE((i.slab_breakdown->>'handling')::numeric, 0)
                ) * (COALESCE((i.slab_breakdown->>'gst_pct')::numeric, (i.slab_breakdown->>'gst_percent')::numeric, 0) / 100.0)
            )
          ) AS display_total_amount,
          COUNT(*) OVER() as total_count 
        FROM invoices i
        JOIN parties p ON i.party_id = p.id
        LEFT JOIN (
          SELECT invoice_id,
                 SUM(COALESCE((pricing_meta->'rate_breakup'->>'base')::numeric, 0)) AS base_sum
          FROM csv_invoices
          GROUP BY invoice_id
        ) ci ON ci.invoice_id = i.id
    `;
    const whereClauses = [];
    const queryParams = [];

    if (search) {
        whereClauses.push(`(i.invoice_number ILIKE $${queryParams.length + 1} OR p.party_name ILIKE $${queryParams.length + 1})`);
        queryParams.push(`%${search}%`);
    }
    if (party_id) {
        whereClauses.push(`i.party_id = $${queryParams.length + 1}`);
        queryParams.push(party_id);
    }
    if (payment_status) {
        whereClauses.push(`i.payment_status = $${queryParams.length + 1}`);
        queryParams.push(payment_status);
    }
    if (date_from) {
        whereClauses.push(`i.invoice_date >= $${queryParams.length + 1}`);
        queryParams.push(date_from);
    }
    if (date_to) {
        whereClauses.push(`i.invoice_date <= $${queryParams.length + 1}`);
        queryParams.push(date_to);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    const sortableColumns = ['invoice_number', 'party_name', 'invoice_date', 'total_amount', 'payment_status'];
    const sortBy = sort && sortableColumns.includes(sort) ? `i.${sort}` : 'i.invoice_date';
    const orderSql = (typeof order === 'string' && order.toLowerCase() === 'asc') ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortBy} ${orderSql} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: result.rows.map(row => { delete row.total_count; return row; }),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    if (error && typeof error === 'object' && (error as any).name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid query parameters', details: (error as any).issues || String(error) }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invoices - Create a new invoice
export async function POST(request: NextRequest) {
  const client = await db.getClient();
  try {
    const user = await getUserFromRequest(request);
    const isOperator = user && (hasRole(user, 'billing_operator') || hasRole(user, 'admin'))
    if (!isOperator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { items, ...invoiceData } = createInvoiceSchema.parse(body);

    const subtotal = items.reduce((acc, item) => acc + item.total_price, 0);
    const total_amount = subtotal + (invoiceData.tax_amount || 0) + (invoiceData.additional_charges || 0) + ((invoiceData.apply_slab ? (invoiceData.slab_amount || 0) : 0));

    await client.query('BEGIN');

    const invoiceNumber = await generateInvoiceNumber();

    const invoiceResult = await client.query(`
        INSERT INTO invoices (
          invoice_number, party_id, invoice_date, due_date, subtotal, tax_amount, additional_charges, received_amount, total_amount, notes, created_by,
          apply_slab, slab_amount, slab_breakdown,
          recipient_name, recipient_phone, recipient_address, gst_invoice,
          prepaid_amount, final_collected, retail_price, chargeable_weight,
          booking_ref
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21, $22,
          $23
        )
        RETURNING *
    `, [
        invoiceNumber,
        invoiceData.party_id,
        invoiceData.invoice_date,
        invoiceData.due_date,
        subtotal,
        invoiceData.tax_amount,
        invoiceData.additional_charges,
        invoiceData.received_amount ?? 0,
        total_amount,
        invoiceData.notes,
        user.id,
        invoiceData.apply_slab ?? false,
        invoiceData.slab_amount ?? 0,
        invoiceData.slab_breakdown ?? null,
        invoiceData.recipient_name ?? null,
        invoiceData.recipient_phone ?? null,
        invoiceData.recipient_address ?? null,
        invoiceData.gst_invoice ?? null,
        invoiceData.prepaid_amount ?? 0,
        invoiceData.final_collected ?? 0,
        invoiceData.retail_price ?? 0,
        invoiceData.chargeable_weight ?? null,
        (invoiceData as any).booking_ref ?? null
    ]);

    const newInvoice = invoiceResult.rows[0];

    const itemInsertPromises = items.map(item => {
        return client.query(`
            INSERT INTO invoice_items (
              invoice_id, item_description, quantity, unit_price, total_price, booking_date,
              shipment_type, mode_id, service_type_id, distance_slab_id, weight_kg,
              consignment_no
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          newInvoice.id,
          item.item_description,
          item.quantity,
          item.unit_price,
          item.total_price,
          item.booking_date ? new Date(item.booking_date) : null,
          item.shipment_type ?? null,
          item.mode_id ?? null,
          item.service_type_id ?? null,
          item.distance_slab_id ?? null,
          item.weight_kg ?? null,
          (item as any).consignment_no ?? (item as any).consignmentNo ?? null,
        ]);
    });

    await Promise.all(itemInsertPromises);

    await client.query('COMMIT');

    return NextResponse.json({ ...newInvoice, items }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
