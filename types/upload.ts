export interface CSVUploadConfig {
  type: 'parties' | 'sales' | 'invoices'
  requiredFields: string[]
  optionalFields: string[]
  sampleData: Record<string, any>[]
  fieldMappings: FieldMapping[]
}

export interface FieldMapping {
  csvField: string
  systemField: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'email' | 'phone'
  validation?: (value: any) => boolean | string
}

export interface CSVParseResult {
  headers: string[]
  data: Record<string, any>[]
  errors: CSVError[]
  validRows: number
  invalidRows: number
}

export interface CSVError {
  row: number
  field: string
  value: any
  message: string
  type: 'validation' | 'required' | 'format'
}

export interface ImportPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  errors: CSVError[]
  sampleData: Record<string, any>[]
  fieldMappings: Record<string, string>
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: CSVError[]
  message: string
}

// Party CSV Template
export const PARTY_CSV_CONFIG: CSVUploadConfig = {
  type: 'parties',
  requiredFields: ['partyName', 'phoneNumber', 'gstType', 'state', 'billingStreet', 'billingCity', 'billingState', 'billingPincode'],
  optionalFields: ['gstin', 'email', 'shippingStreet', 'shippingCity', 'shippingState', 'shippingPincode'],
  sampleData: [
    {
      partyName: 'ABC Logistics Pvt Ltd',
      gstin: '27AABCU9603R1ZX',
      phoneNumber: '+91-9876543210',
      email: 'contact@abclogistics.com',
      gstType: 'registered',
      state: 'Maharashtra',
      billingStreet: '123 Industrial Area, Sector 15',
      billingCity: 'Mumbai',
      billingState: 'Maharashtra',
      billingPincode: '400001',
      shippingStreet: '456 Warehouse Complex, MIDC',
      shippingCity: 'Pune',
      shippingState: 'Maharashtra',
      shippingPincode: '411019'
    },
    {
      partyName: 'XYZ Courier Services',
      gstin: '09AABCU9603R1ZY',
      phoneNumber: '+91-8765432109',
      email: 'info@xyzcourier.com',
      gstType: 'registered',
      state: 'Delhi',
      billingStreet: '789 Transport Nagar',
      billingCity: 'Delhi',
      billingState: 'Delhi',
      billingPincode: '110001',
      shippingStreet: '',
      shippingCity: '',
      shippingState: '',
      shippingPincode: ''
    }
  ],
  fieldMappings: [
    { csvField: 'partyName', systemField: 'partyName', required: true, type: 'string' },
    { csvField: 'gstin', systemField: 'gstin', required: false, type: 'string', validation: (value) => !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value) || 'Invalid GSTIN format' },
    { csvField: 'phoneNumber', systemField: 'phoneNumber', required: true, type: 'phone', validation: (value) => /^[\+]?[1-9][\d]{0,15}$/.test(value) || 'Invalid phone number' },
    { csvField: 'email', systemField: 'email', required: false, type: 'email', validation: (value) => !value || /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value) || 'Invalid email format' },
    { csvField: 'gstType', systemField: 'gstType', required: true, type: 'string', validation: (value) => ['unregistered', 'consumer', 'registered', 'composition', 'overseas'].includes(value) || 'Invalid GST type' },
    { csvField: 'state', systemField: 'state', required: true, type: 'string' },
    { csvField: 'billingStreet', systemField: 'billingAddress.street', required: true, type: 'string' },
    { csvField: 'billingCity', systemField: 'billingAddress.city', required: true, type: 'string' },
    { csvField: 'billingState', systemField: 'billingAddress.state', required: true, type: 'string' },
    { csvField: 'billingPincode', systemField: 'billingAddress.pincode', required: true, type: 'string', validation: (value) => /^[1-9][0-9]{5}$/.test(value) || 'Invalid pincode' },
    { csvField: 'shippingStreet', systemField: 'shippingAddress.street', required: false, type: 'string' },
    { csvField: 'shippingCity', systemField: 'shippingAddress.city', required: false, type: 'string' },
    { csvField: 'shippingState', systemField: 'shippingAddress.state', required: false, type: 'string' },
    { csvField: 'shippingPincode', systemField: 'shippingAddress.pincode', required: false, type: 'string', validation: (value) => !value || /^[1-9][0-9]{5}$/.test(value) || 'Invalid pincode' }
  ]
}

// Invoice CSV Template
export const INVOICE_CSV_CONFIG: CSVUploadConfig = {
  type: 'invoices',
  requiredFields: [],
  optionalFields: [
    'FINAL COLLECTED',
    'MODE OF BOOKING',
    'SHIPMENT TYPE',
    'RISK SURCHARGE AMOUNT',
    'CONTENTS',
    'DECLARED VALUE',
    'EWAY-BILL',
    'GSTInvoice',
    'CUSTOMER',
    'SERVICE CODE',
    'REGION',
    'PAYMENT MODE',
    'RISK SURCHARGE TYPE',
    'CHARGEABLE WEIGHT',
    'PAYMENT UTR',
    'EMPLOYEE CODE',
    'EMPLOYEE DISCOUNT PERCENT',
    'EMPLOYEE DISCOUNT AMOUNT',
    'PROMOCODE',
    'PROMOCODE DISCOUNT',
    'PACKING MATERIAL',
    'NO OF STRETCH FILMS'
  ],
  sampleData: [
    {
      'DATE OF BOOKING': '2025-08-12',
      'BOOKING REFERENCE': 'BK123456',
      'CONSIGNMENT NO': 'CN78901234',
      'MODE': 'Air',
      'SERVICE TYPE': 'Express',
      'WEIGHT (IN Kg)': '5.5',
      'PREPAID AMOUNT': '500.00',
      'FINAL COLLECTED': '0.00',
      'RETAIL PRICE': '500.00',
      'SENDER NAME': 'John Doe',
      'SENDER PHONE': '9876543210',
      'SENDER ADDRESS': '123 Main St, Mumbai',
      'RECIPIENT NAME': 'Jane Smith',
      'RECIPIENT PHONE': '9876543211',
      'RECIPIENT ADDRESS': '456 Oak St, Delhi',
      'MODE OF BOOKING': 'Online',
      'SHIPMENT TYPE': 'Domestic',
      'RISK SURCHARGE AMOUNT': '50.00',
      'CONTENTS': 'Documents',
      'DECLARED VALUE': '5000.00',
      'EWAY-BILL': 'EWB123456789012',
      'GSTInvoice': 'INV12345678',
      'CUSTOMER': 'Regular Customer',
      'SERVICE CODE': 'EXP',
      'REGION': 'North',
      'PAYMENT MODE': 'Cash',
      'RISK SURCHARGE TYPE': 'Insurance',
      'CHARGEABLE WEIGHT': '5.5',
      'PAYMENT UTR': 'UTR123456789',
      'EMPLOYEE CODE': 'EMP001',
      'EMPLOYEE DISCOUNT PERCENT': '5',
      'EMPLOYEE DISCOUNT AMOUNT': '25.00',
      'PROMOCODE': 'SUMMER10',
      'PROMOCODE DISCOUNT': '50.00',
      'PACKING MATERIAL': 'Box',
      'NO OF STRETCH FILMS': '2'
    }
  ],
  fieldMappings: [
    { csvField: 'DATE OF BOOKING', systemField: 'bookingDate', required: false, type: 'date' },
    { csvField: 'BOOKING REFERENCE', systemField: 'bookingReference', required: false, type: 'string' },
    { csvField: 'CONSIGNMENT NO', systemField: 'consignmentNo', required: false, type: 'string' },
    { csvField: 'MODE', systemField: 'mode', required: false, type: 'string', validation: (value) => !value || ['Air', 'Surface', 'Train', 'Ship'].includes(value) || 'Invalid mode' },
    { csvField: 'SERVICE TYPE', systemField: 'serviceType', required: false, type: 'string' },
    { csvField: 'WEIGHT (IN Kg)', systemField: 'weight', required: false, type: 'number', validation: (value) => !value || value > 0 || 'Weight must be greater than 0' },
    { csvField: 'PREPAID AMOUNT', systemField: 'prepaidAmount', required: false, type: 'number', validation: (value) => !value || value >= 0 || 'Amount cannot be negative' },
    { csvField: 'FINAL COLLECTED', systemField: 'finalCollected', required: false, type: 'number', validation: (value) => !value || value >= 0 || 'Amount cannot be negative' },
    { csvField: 'RETAIL PRICE', systemField: 'retailPrice', required: false, type: 'number', validation: (value) => !value || value >= 0 || 'Price cannot be negative' },
    { csvField: 'SENDER NAME', systemField: 'sender.name', required: false, type: 'string' },
    { csvField: 'SENDER PHONE', systemField: 'sender.phone', required: false, type: 'phone' },
    { csvField: 'SENDER ADDRESS', systemField: 'sender.address', required: false, type: 'string' },
    { csvField: 'RECIPIENT NAME', systemField: 'recipient.name', required: false, type: 'string' },
    { csvField: 'RECIPIENT PHONE', systemField: 'recipient.phone', required: false, type: 'phone' },
    { csvField: 'RECIPIENT ADDRESS', systemField: 'recipient.address', required: false, type: 'string' },
    { csvField: 'MODE OF BOOKING', systemField: 'bookingMode', required: false, type: 'string' },
    { csvField: 'SHIPMENT TYPE', systemField: 'shipmentType', required: false, type: 'string', validation: (value) => !value || ['Domestic', 'International'].includes(value) || 'Invalid shipment type' },
    { csvField: 'RISK SURCHARGE AMOUNT', systemField: 'riskSurcharge.amount', required: false, type: 'number', validation: (value) => !value || value >= 0 || 'Amount cannot be negative' },
    { csvField: 'RISK SURCHARGE TYPE', systemField: 'riskSurcharge.type', required: false, type: 'string' },
    { csvField: 'CONTENTS', systemField: 'contents', required: false, type: 'string' },
    { csvField: 'DECLARED VALUE', systemField: 'declaredValue', required: false, type: 'number', validation: (value) => !value || value >= 0 || 'Value cannot be negative' },
    { csvField: 'EWAY-BILL', systemField: 'ewayBill', required: false, type: 'string' },
    { csvField: 'GSTInvoice', systemField: 'gstInvoice', required: false, type: 'string' },
    { csvField: 'CUSTOMER', systemField: 'customer', required: false, type: 'string' },
    { csvField: 'SERVICE CODE', systemField: 'serviceCode', required: false, type: 'string' },
    { csvField: 'REGION', systemField: 'region', required: false, type: 'string' },
    { csvField: 'PAYMENT MODE', systemField: 'payment.mode', required: false, type: 'string', validation: (value) => !value || ['Cash', 'Card', 'UPI', 'Net Banking', 'Credit'].includes(value) || 'Invalid payment mode' },
    { csvField: 'CHARGEABLE WEIGHT', systemField: 'chargeableWeight', required: false, type: 'number', validation: (value) => !value || value >= 0 || 'Weight cannot be negative' },
    { csvField: 'PAYMENT UTR', systemField: 'payment.utr', required: false, type: 'string' },
    { csvField: 'EMPLOYEE CODE', systemField: 'employee.code', required: false, type: 'string' },
    { csvField: 'EMPLOYEE DISCOUNT PERCENT', systemField: 'employee.discountPercent', required: false, type: 'number', validation: (value) => !value || (value >= 0 && value <= 100) || 'Discount percent must be between 0 and 100' },
    { csvField: 'EMPLOYEE DISCOUNT AMOUNT', systemField: 'employee.discountAmount', required: false, type: 'number', validation: (value) => !value || value >= 0 || 'Discount amount cannot be negative' },
    { csvField: 'PROMOCODE', systemField: 'promoCode', required: false, type: 'string' },
    { csvField: 'PROMOCODE DISCOUNT', systemField: 'promoCodeDiscount', required: false, type: 'number', validation: (value) => !value || value >= 0 || 'Discount cannot be negative' },
    { csvField: 'PACKING MATERIAL', systemField: 'packing.material', required: false, type: 'string' },
    { csvField: 'NO OF STRETCH FILMS', systemField: 'packing.stretchFilms', required: false, type: 'number', validation: (value) => !value || value >= 0 || 'Count cannot be negative' },
    
  ]
}

// Sales CSV Template
export const SALES_CSV_CONFIG: CSVUploadConfig = {
  type: 'sales',
  requiredFields: [],
  optionalFields: [
    'FINAL COLLECTED',
    'MODE OF BOOKING',
    'SHIPMENT TYPE',
    'RISK SURCHARGE AMOUNT',
    'CONTENTS',
    'DECLARED VALUE',
    'EWAY-BILL',
    'GSTInvoice',
    'CUSTOMER',
    'SERVICE CODE',
    'REGION',
    'PAYMENT MODE',
    'RISK SURCHARGE TYPE',
    'CHARGEABLE WEIGHT',
    'PAYMENT UTR',
    'EMPLOYEE CODE',
    'EMPLOYEE DISCOUNT PERCENT',
    'EMPLOYEE DISCOUNT AMOUNT',
    'PROMOCODE',
    'PROMOCODE DISCOUNT',
    'PACKING MATERIAL',
    'NO OF STRETCH FILMS'
  ],
  sampleData: [
    {
      'DATE OF BOOKING': '2025-08-12',
      'BOOKING REFERENCE': 'SLS-001',
      'CONSIGNMENT NO': 'CN-778899',
      'MODE': 'Air',
      'SERVICE TYPE': 'Express',
      'WEIGHT (IN Kg)': '1.0',
      'PREPAID AMOUNT': '750.00',
      'FINAL COLLECTED': '0.00',
      'RETAIL PRICE': '750.00',
      'SENDER NAME': 'DEF Logistics',
      'SENDER PHONE': '9876543212',
      'SENDER ADDRESS': 'Park Street, Kolkata',
      'RECIPIENT NAME': 'PQR Enterprises',
      'RECIPIENT PHONE': '9876543213',
      'RECIPIENT ADDRESS': 'MG Road, Bengaluru',
      'MODE OF BOOKING': 'Online',
      'SHIPMENT TYPE': 'Domestic',
      'RISK SURCHARGE AMOUNT': '0.00',
      'CONTENTS': 'Parcels',
      'DECLARED VALUE': '1000.00',
      'EWAY-BILL': '',
      'GSTInvoice': '',
      'CUSTOMER': 'Walk-in',
      'SERVICE CODE': 'STD',
      'REGION': 'South',
      'PAYMENT MODE': 'Cash',
      'RISK SURCHARGE TYPE': 'Standard',
      'CHARGEABLE WEIGHT': '1.0',
      'PAYMENT UTR': '',
      'EMPLOYEE CODE': '',
      'EMPLOYEE DISCOUNT PERCENT': '0',
      'EMPLOYEE DISCOUNT AMOUNT': '0.00',
      'PROMOCODE': '',
      'PROMOCODE DISCOUNT': '0.00',
      'PACKING MATERIAL': 'Box',
      'NO OF STRETCH FILMS': '0'
    }
  ],
  fieldMappings: [
    { csvField: 'DATE OF BOOKING', systemField: 'bookingDate', required: false, type: 'date' },
    { csvField: 'BOOKING REFERENCE', systemField: 'bookingReference', required: false, type: 'string' },
    { csvField: 'CONSIGNMENT NO', systemField: 'consignmentNo', required: false, type: 'string' },
    { csvField: 'MODE', systemField: 'mode', required: false, type: 'string' },
    { csvField: 'SERVICE TYPE', systemField: 'serviceType', required: false, type: 'string' },
    { csvField: 'WEIGHT (IN Kg)', systemField: 'weight', required: false, type: 'number' },
    { csvField: 'PREPAID AMOUNT', systemField: 'prepaidAmount', required: false, type: 'number' },
    { csvField: 'FINAL COLLECTED', systemField: 'finalCollected', required: false, type: 'number' },
    { csvField: 'RETAIL PRICE', systemField: 'retailPrice', required: false, type: 'number' },
    { csvField: 'SENDER NAME', systemField: 'sender.name', required: false, type: 'string' },
    { csvField: 'SENDER PHONE', systemField: 'sender.phone', required: false, type: 'phone' },
    { csvField: 'SENDER ADDRESS', systemField: 'sender.address', required: false, type: 'string' },
    { csvField: 'RECIPIENT NAME', systemField: 'recipient.name', required: false, type: 'string' },
    { csvField: 'RECIPIENT PHONE', systemField: 'recipient.phone', required: false, type: 'phone' },
    { csvField: 'RECIPIENT ADDRESS', systemField: 'recipient.address', required: false, type: 'string' },
    { csvField: 'MODE OF BOOKING', systemField: 'bookingMode', required: false, type: 'string' },
    { csvField: 'SHIPMENT TYPE', systemField: 'shipmentType', required: false, type: 'string' },
    { csvField: 'RISK SURCHARGE AMOUNT', systemField: 'riskSurcharge.amount', required: false, type: 'number' },
    { csvField: 'RISK SURCHARGE TYPE', systemField: 'riskSurcharge.type', required: false, type: 'string' },
    { csvField: 'CONTENTS', systemField: 'contents', required: false, type: 'string' },
    { csvField: 'DECLARED VALUE', systemField: 'declaredValue', required: false, type: 'number' },
    { csvField: 'EWAY-BILL', systemField: 'ewayBill', required: false, type: 'string' },
    { csvField: 'GSTInvoice', systemField: 'gstInvoice', required: false, type: 'string' },
    { csvField: 'CUSTOMER', systemField: 'customer', required: false, type: 'string' },
    { csvField: 'SERVICE CODE', systemField: 'serviceCode', required: false, type: 'string' },
    { csvField: 'REGION', systemField: 'region', required: false, type: 'string' },
    { csvField: 'PAYMENT MODE', systemField: 'payment.mode', required: false, type: 'string' },
    { csvField: 'CHARGEABLE WEIGHT', systemField: 'chargeableWeight', required: false, type: 'number' },
    { csvField: 'PAYMENT UTR', systemField: 'payment.utr', required: false, type: 'string' },
    { csvField: 'EMPLOYEE CODE', systemField: 'employee.code', required: false, type: 'string' },
    { csvField: 'EMPLOYEE DISCOUNT PERCENT', systemField: 'employee.discountPercent', required: false, type: 'number' },
    { csvField: 'EMPLOYEE DISCOUNT AMOUNT', systemField: 'employee.discountAmount', required: false, type: 'number' },
    { csvField: 'PROMOCODE', systemField: 'promoCode', required: false, type: 'string' },
    { csvField: 'PROMOCODE DISCOUNT', systemField: 'promoCodeDiscount', required: false, type: 'number' },
    { csvField: 'PACKING MATERIAL', systemField: 'packing.material', required: false, type: 'string' },
    { csvField: 'NO OF STRETCH FILMS', systemField: 'packing.stretchFilms', required: false, type: 'number' }
  ]
}
