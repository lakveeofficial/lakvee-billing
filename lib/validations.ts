import { z } from 'zod';

// User validation schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'billing_operator']).default('billing_operator'),
});

// Party validation schemas
export const createPartySchema = z.object({
  party_name: z.string().min(1, 'Party name is required'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gst_number: z.string().optional(),
  gst_type: z.enum(['unregistered', 'consumer', 'registered', 'composition', 'overseas']).optional(),
  pan_number: z.string().optional(),
  // Slab assignment fields (snake_case to match DB)
  weight_slab_id: z.number().int().optional(),
  distance_slab_id: z.number().int().optional(),
  distance_category: z.enum(['within_state', 'metro_state', 'out_of_state', 'other_state']).optional(),
  volume_slab_id: z.number().int().optional(),
  cod_slab_id: z.number().int().optional(),
});

export const updatePartySchema = createPartySchema.partial();

// Invoice validation schemas
export const invoiceItemSchema = z.object({
  item_description: z.string().min(1, 'Item description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  total_price: z.number().min(0, 'Total price must be positive'),
  booking_date: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), 'Invalid booking date'),
  // New optional meta fields persisted in invoice_items
  shipment_type: z.enum(['DOCUMENT', 'NON_DOCUMENT']).optional(),
  mode_id: z.number().int().optional(),
  service_type_id: z.number().int().optional(),
  distance_slab_id: z.number().int().optional(),
  weight_kg: z.number().optional(),
  // Persisted consignment number
  consignment_no: z.string().optional(),
});

export const createInvoiceSchema = z.object({
  party_id: z.number().min(1, 'Party is required'),
  invoice_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  additional_charges: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  received_amount: z.number().min(0).default(0).optional(),
  notes: z.string().optional(),
  // New slab related fields
  apply_slab: z.boolean().optional(),
  slab_amount: z.number().min(0).default(0).optional(),
  slab_breakdown: z.any().optional(),
  // New invoice-level booking metadata
  recipient_name: z.string().optional(),
  recipient_phone: z.string().optional(),
  recipient_address: z.string().optional(),
  gst_invoice: z.string().optional(),
  prepaid_amount: z.number().optional(),
  final_collected: z.number().optional(),
  retail_price: z.number().optional(),
  chargeable_weight: z.number().optional(),
  // Manual invoices can provide booking_ref explicitly
  booking_ref: z.string().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  payment_status: z.enum(['pending', 'partial', 'paid', 'overdue']).optional(),
});

// Payment validation schemas
export const createPaymentSchema = z.object({
  invoice_id: z.number().min(1, 'Invoice is required'),
  payment_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  amount: z.number().min(0.01, 'Payment amount must be positive'),
  payment_method: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

// Company validation schemas
export const companySchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  gstin: z.string().optional(),
  emailId: z.string().email('Invalid email address'),
  businessType: z.string(),
  businessCategory: z.string(),
  state: z.string(),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  businessAddress: z.string().min(5, 'Address is too short'),
  logo: z.string().optional(),
  signature: z.string().optional(),
});

// Query validation schemas
export const paginationSchema = z.object({
  page: z.string().nullable().transform(val => val ? Number(val) : 1).pipe(z.number().min(1)),
  limit: z.string().nullable().transform(val => val ? Number(val) : 10).pipe(z.number().min(1).max(100)),
  search: z.string().nullable().optional(),
  sort: z.string().nullable().optional(),
  order: z.enum(['asc', 'desc']).nullable().transform(val => val || 'desc'),
});

export const invoiceQuerySchema = paginationSchema.extend({
  // Accept null and transform to undefined so optional works as expected
  party_id: z.string().nullable().transform(val => (val ? Number(val) : undefined)).optional(),
  payment_status: z.enum(['pending', 'partial', 'paid', 'overdue']).nullable().optional(),
  date_from: z.string().nullable().optional(),
  date_to: z.string().nullable().optional(),
});

export const reportQuerySchema = z.object({
  type: z.enum(['sales', 'party_statement', 'daybook']),
  date_from: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid from date'),
  date_to: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid to date'),
  party_id: z.string().transform(Number).pipe(z.number().min(1)).optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type UpdatePartyInput = z.infer<typeof updatePartySchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
