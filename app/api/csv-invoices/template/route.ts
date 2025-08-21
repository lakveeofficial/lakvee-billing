export async function GET() {
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
  ]

  const sampleData = [
    '2025-08-12', 'BK123456', 'CN78901234', 'Air', 'Express', '5.5', '500.00',
    '0.00', '500.00', 'John Doe', '9876543210', '123 Main St, Mumbai',
    'Jane Smith', '9876543211', '456 Oak St, Delhi', 'Online', 'Domestic', '50.00',
    'Documents', '5000.00', 'EWB123456789012', 'INV12345678', 'Regular Customer',
    'EXP', 'North', 'Cash', 'Insurance', '5.5', 'UTR123456789', 'EMP001', '5',
    '25.00', 'SUMMER10', '50.00', 'Box', '2'
  ]

  const csvContent = [
    headers.join(','),
    sampleData.join(',')
  ].join('\n')

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="csv_invoices_template.csv"',
    },
  })
}
