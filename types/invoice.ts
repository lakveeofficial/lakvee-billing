import { Party } from './party'

export interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  // Optional: when present, used for overdue calculations and display in lists
  dueDate?: string
  customer: Party
  billingName?: string
  billingAddress: Address
  shippingAddress: Address
  stateOfSupply: string
  items: InvoiceItem[]
  additionalCharges: AdditionalCharges
  paymentInfo: PaymentInfo
  roundOff: number
  totalAmount: number
  receivedAmount: number
  balance: number
  status: InvoiceStatus
  attachments: Attachment[]
  notes?: string
  createdAt: string
  updatedAt: string
  // Distinguish records created from sales import vs regular invoices
  recordType?: 'invoice' | 'sale'
}

export interface InvoiceItem {
  id: string
  // Optional legacy/display fields retained for backward compatibility
  itemNumber?: string
  // New: per-item consignment number shown in the UI
  consignmentNo?: string
  invoiceDate: string
  bookingDate: string
  destination: string
  quantity: number
  // "unit" no longer affects calculations; keep as optional for old records
  unit?: number
  // New fields used by the Create Invoice UI
  weightKg?: number
  shipmentType?: 'DOCUMENT' | 'NON_DOCUMENT'
  modeId?: number | string
  serviceTypeId?: number | string
  regionId?: number | string
  pricePerUnit: number
  discount: {
    percentage: number
    amount: number
  }
  tax: {
    percentage: number
    amount: number
  }
  totalAmount: number
}

export interface AdditionalCharges {
  shipping: number
  packaging: number
  fuelCharges: number
  tcs: number
  otherCharges: number
}

export interface PaymentInfo {
  paymentType: PaymentType
  totalAmount: number
  receivedAmount: number
  balance: number
  status: PaymentStatus
}

export interface Attachment {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: string
}

export interface Address {
  street: string
  city: string
  state: string
  pincode: string
  country: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type PaymentStatus = 'paid' | 'unpaid' | 'partial'
export type PaymentType = 'cash' | 'online' | 'cheque' | 'bank_transfer' | 'upi' | 'card'

export interface InvoiceFormData {
  customerId: string
  billingName: string
  billingAddress: Address
  shippingAddress: Address
  stateOfSupply: string
  items: InvoiceItem[]
  additionalCharges: AdditionalCharges
  paymentType: PaymentType
  receivedAmount: number
  notes: string
}

export interface InvoiceFilters {
  search: string
  status: InvoiceStatus | 'all'
  paymentStatus: PaymentStatus | 'all'
  dateFrom: string
  dateTo: string
  customerId: string | 'all'
  // Filter to distinguish between regular invoices and sales-imported invoices
  recordType: 'all' | 'invoice' | 'sale'
}

export const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'online', label: 'Online' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' }
]

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
]

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'unpaid', label: 'Unpaid', color: 'red' },
  { value: 'partial', label: 'Partial', color: 'yellow' }
]

export const UNIT_OPTIONS = Array.from({ length: 100 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}`
}))

export const GST_RATE = 18 // Default GST rate percentage
