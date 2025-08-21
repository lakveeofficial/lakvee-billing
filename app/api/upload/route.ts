import { NextResponse } from 'next/server';
import Papa from 'papaparse';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const csvData = await file.text();
    
    // Parse CSV data
    const parsed = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    if (parsed.errors && parsed.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing failed', details: parsed.errors.map(e => e.message) },
        { status: 400 }
      );
    }
    const records = (parsed.data as any[]) || [];

    // Validate required fields
    const requiredFields = [
      'DATE OF BOOKING', 'BOOKING REFERENCE', 'CONSIGNMENT NO', 'MODE',
      'SERVICE TYPE', 'WEIGHT (IN Kg)', 'PREPAID AMOUNT', 'FINAL COLLECTED',
      'RETAIL PRICE', 'SENDER NAME', 'SENDER PHONE', 'SENDER ADDRESS',
      'RECIPIENT NAME', 'RECIPIENT PHONE', 'RECIPIENT ADDRESS', 'MODE OF BOOKING',
      'SHIPMENT TYPE', 'RISK SURCHARGE AMOUNT', 'CONTENTS', 'DECLARED VALUE',
      'EWAY-BILL', 'GSTInvoice', 'CUSTOMER', 'SERVICE CODE', 'REGION',
      'PAYMENT MODE', 'RISK SURCHARGE TYPE', 'CHARGEABLE WEIGHT', 'PAYMENT UTR',
      'EMPLOYEE CODE', 'EMPLOYEE DISCOUNT PERCENT', 'EMPLOYEE DISCOUNT AMOUNT',
      'PROMOCODE', 'PROMOCODE DISCOUNT', 'PACKING MATERIAL', 'NO OF STRETCH FILMS'
    ];

    const headers = Object.keys(records[0] || {});
    const missingFields = requiredFields.filter(field => !headers.includes(field));

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields in CSV',
          missingFields 
        },
        { status: 400 }
      );
    }

    // Process each record and create invoices
    // TODO: Add your invoice creation logic here
    const processedInvoices = records.map((record: any) => ({
      bookingDate: record['DATE OF BOOKING'],
      bookingReference: record['BOOKING REFERENCE'],
      consignmentNo: record['CONSIGNMENT NO'],
      // Add other fields mapping here
    }));

    return NextResponse.json({
      message: 'CSV processed successfully',
      totalRecords: records.length,
      processedInvoices,
    });

  } catch (error) {
    console.error('Error processing CSV:', error);
    return NextResponse.json(
      { error: 'Error processing CSV file' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return sample CSV template
  const headers = [
    'DATE OF BOOKING', 'BOOKING REFERENCE', 'CONSIGNMENT NO', 'MODE',
    'SERVICE TYPE', 'WEIGHT (IN Kg)', 'PREPAID AMOUNT', 'FINAL COLLECTED',
    'RETAIL PRICE', 'SENDER NAME', 'SENDER PHONE', 'SENDER ADDRESS',
    'RECIPIENT NAME', 'RECIPIENT PHONE', 'RECIPIENT ADDRESS', 'MODE OF BOOKING',
    'SHIPMENT TYPE', 'RISK SURCHARGE AMOUNT', 'CONTENTS', 'DECLARED VALUE',
    'EWAY-BILL', 'GSTInvoice', 'CUSTOMER', 'SERVICE CODE', 'REGION',
    'PAYMENT MODE', 'RISK SURCHARGE TYPE', 'CHARGEABLE WEIGHT', 'PAYMENT UTR',
    'EMPLOYEE CODE', 'EMPLOYEE DISCOUNT PERCENT', 'EMPLOYEE DISCOUNT AMOUNT',
    'PROMOCODE', 'PROMOCODE DISCOUNT', 'PACKING MATERIAL', 'NO OF STRETCH FILMS'
  ];

  const sampleData = [
    '2025-08-12', 'BK123456', 'CN78901234', 'Air', 'Express', '5.5', '500.00',
    '0.00', '500.00', 'John Doe', '9876543210', '123 Main St, Mumbai',
    'Jane Smith', '9876543211', '456 Oak St, Delhi', 'Online', 'Domestic', '50.00',
    'Documents', '5000.00', 'EWB123456789012', 'INV12345678', 'Regular Customer',
    'EXP', 'North', 'Cash', 'Insurance', '5.5', 'UTR123456789', 'EMP001', '5',
    '25.00', 'SUMMER10', '50.00', 'Box', '2'
  ];

  const csvContent = [
    headers.join(','),
    sampleData.join(',')
  ].join('\n');

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="invoice_upload_template.csv"',
    },
  });
}
