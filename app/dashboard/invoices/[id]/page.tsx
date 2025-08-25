'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Download, 
  Share, 
  Printer,
  Calendar,
  MapPin,
  Phone,
  Mail,
  FileText,
  DollarSign
} from 'lucide-react'
import { Invoice } from '@/types/invoice'
import PageHeader from '@/components/PageHeader'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function InvoiceDetailsPage() {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyLogo, setCompanyLogo] = useState<string>('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  useEffect(() => {
    if (id) {
      loadInvoice()
    }
    // Load company for logo rendering in print
    ;(async () => {
      try {
        const r = await fetch('/api/company/active', { cache: 'no-store' })
        if (r.ok) {
          const c = await r.json()
          if (c && c.logo) setCompanyLogo(String(c.logo))
        }
      } catch {}
    })()
  }, [id])

  const loadInvoice = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${id}`, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) {
        setInvoice(null)
        return
      }
      const row = await res.json()
      // Map API row to UI Invoice shape
      const displayTotal = Number(row.display_total_amount ?? row.total_amount ?? 0)
      const received = Number(row.received_amount || 0)
      const balance = displayTotal - received
      const items = Array.isArray(row.items) ? row.items : []
      const mappedItems = items.map((it: any, idx: number) => ({
        id: String(it.id ?? idx + 1),
        itemNumber: idx + 1,
        invoiceDate: row.invoice_date,
        bookingDate: it.booking_date || row.invoice_date,
        destination: it.item_description || '',
        quantity: Number(it.quantity || 0),
        unit: it.unit || undefined,
        pricePerUnit: Number(it.unit_price || 0),
        discount: { amount: 0, percentage: 0 },
        tax: { amount: 0, percentage: 0 },
        totalAmount: Number(it.total_price || 0),
      }))

      const mapped: Invoice = {
        id: String(row.id),
        invoiceNumber: row.invoice_number || `INV-${row.id}`,
        invoiceDate: row.invoice_date,
        customer: {
          id: String(row.party_id || ''),
          partyName: row.party_name || 'Unknown',
          phoneNumber: row.phone || '',
          email: row.email || '',
          billingAddress: { street: row.address || '', city: row.city || '', state: row.state || '', pincode: row.pincode || '', country: 'India' },
          useShippingAddress: false,
          gstType: 'registered',
          state: row.state || '',
          createdAt: row.created_at || '',
          updatedAt: row.updated_at || ''
        } as any,
        billingName: '',
        billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
        shippingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
        stateOfSupply: row.state || '',
        items: mappedItems,
        additionalCharges: { shipping: 0, packaging: 0, fuelCharges: 0, tcs: 0, otherCharges: 0 },
        paymentInfo: {
          paymentType: 'cash',
          totalAmount: displayTotal,
          receivedAmount: received,
          balance: balance,
          status: (row.payment_status || 'unpaid') as any,
        },
        roundOff: Number(row.round_off || 0),
        totalAmount: displayTotal,
        receivedAmount: received,
        balance: balance,
        status: (row.status || 'draft') as any,
        attachments: [],
        notes: row.notes || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || ''
      }
      setInvoice(mapped)
    } catch (e) {
      console.error('Failed to load invoice', e)
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    setDeleteDialogOpen(true)
  }

  const performDelete = async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete invoice' }))
        alert(data.error || 'Failed to delete invoice')
        return
      }
      setDeleteDialogOpen(false)
      router.push('/dashboard/invoices')
    } catch (e) {
      console.error('Failed to delete invoice', e)
      alert('Failed to delete invoice')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Invoice ${invoice?.invoiceNumber}`,
        text: `Invoice for ${invoice?.customer.partyName}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Invoice link copied to clipboard!')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'unpaid': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard/invoices')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="print:hidden">
        <PageHeader
          title={invoice.invoiceNumber}
          subtitle="Invoice Details"
          actions={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2 text-rose-200" />
                Back
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              >
                <Share className="h-4 w-4 mr-2 text-sky-200" />
                Share
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              >
                <Printer className="h-4 w-4 mr-2 text-amber-200" />
                Print
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2 text-indigo-200" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2 text-rose-300" />
                Delete
              </button>
            </div>
          }
        />
      </div>

      {/* Printable header with company logo */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-4">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company Logo"
                style={{ height: 50, maxWidth: 160, objectFit: 'contain' }}
              />
            ) : null}
            <div>
              <div className="text-2xl font-bold">LakVee Softwares</div>
              <div className="text-sm text-gray-600">LakVee Softwares & Solutions</div>
            </div>
          </div>
          <div className="text-2xl font-extrabold tracking-wide">INVOICE</div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white rounded-lg shadow print:shadow-none print:rounded-none">
        {/* Invoice Header */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Invoice Number:</strong> {invoice.invoiceNumber}</p>
                <p><strong>Invoice Date:</strong> {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
                <p><strong>State of Supply:</strong> {invoice.stateOfSupply}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>LakVee Softwares</strong></p>
                <p>LakVee Softwares & Solutions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="p-8 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium text-gray-900">{invoice.customer.partyName}</p>
                {invoice.customer.gstin && (
                  <p><strong>GSTIN:</strong> {invoice.customer.gstin}</p>
                )}
                <div className="flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  {invoice.customer.phoneNumber}
                </div>
                {invoice.customer.email && (
                  <div className="flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {invoice.customer.email}
                  </div>
                )}
                <div className="flex items-start mt-2">
                  <MapPin className="h-3 w-3 mr-1 mt-1 flex-shrink-0" />
                  <div>
                    <p>{invoice.billingAddress.street}</p>
                    <p>{invoice.billingAddress.city}, {invoice.billingAddress.state}</p>
                    <p>{invoice.billingAddress.pincode}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Ship To:</h3>
              <div className="text-sm text-gray-700">
                <div className="flex items-start">
                  <MapPin className="h-3 w-3 mr-1 mt-1 flex-shrink-0" />
                  <div>
                    <p>{invoice.shippingAddress.street}</p>
                    <p>{invoice.shippingAddress.city}, {invoice.shippingAddress.state}</p>
                    <p>{invoice.shippingAddress.pincode}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-8 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Item No.</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Booking Date</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Destination</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Qty</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Unit</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Rate</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Discount</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Tax</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 px-3 text-sm">{item.itemNumber}</td>
                    <td className="py-3 px-3 text-sm">{new Date(item.bookingDate).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-3 text-sm">{item.destination}</td>
                    <td className="py-3 px-3 text-sm">{item.quantity}</td>
                    <td className="py-3 px-3 text-sm">{item.unit ?? '-'}</td>
                    <td className="py-3 px-3 text-sm">{formatCurrency(item.pricePerUnit)}</td>
                    <td className="py-3 px-3 text-sm">
                      {item.discount.percentage > 0 
                        ? `${item.discount.percentage}%` 
                        : formatCurrency(item.discount.amount)}
                    </td>
                    <td className="py-3 px-3 text-sm">{item.tax.percentage}%</td>
                    <td className="py-3 px-3 text-sm text-right font-medium">{formatCurrency(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="p-8">
          <div className="flex justify-end">
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(invoice.items.reduce((sum, item) => 
                    sum + (item.quantity * item.pricePerUnit), 0))}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Discount:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(invoice.items.reduce((sum, item) => sum + item.discount.amount, 0))}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Tax:</span>
                <span className="font-medium">
                  {formatCurrency(invoice.items.reduce((sum, item) => sum + item.tax.amount, 0))}
                </span>
              </div>

              {/* Additional Charges */}
              {(invoice.additionalCharges.shipping > 0 || 
                invoice.additionalCharges.packaging > 0 || 
                invoice.additionalCharges.fuelCharges > 0 || 
                invoice.additionalCharges.tcs > 0 || 
                invoice.additionalCharges.otherCharges > 0) && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-sm font-medium text-gray-700 mb-1">Additional Charges:</p>
                  </div>
                  {invoice.additionalCharges.shipping > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 ml-4">Shipping:</span>
                      <span className="font-medium">{formatCurrency(invoice.additionalCharges.shipping)}</span>
                    </div>
                  )}
                  {invoice.additionalCharges.packaging > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 ml-4">Packaging:</span>
                      <span className="font-medium">{formatCurrency(invoice.additionalCharges.packaging)}</span>
                    </div>
                  )}
                  {invoice.additionalCharges.fuelCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 ml-4">Fuel Charges:</span>
                      <span className="font-medium">{formatCurrency(invoice.additionalCharges.fuelCharges)}</span>
                    </div>
                  )}
                  {invoice.additionalCharges.tcs > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 ml-4">TCS:</span>
                      <span className="font-medium">{formatCurrency(invoice.additionalCharges.tcs)}</span>
                    </div>
                  )}
                  {invoice.additionalCharges.otherCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 ml-4">Other Charges:</span>
                      <span className="font-medium">{formatCurrency(invoice.additionalCharges.otherCharges)}</span>
                    </div>
                  )}
                </>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Round Off:</span>
                  <span className="font-medium">{formatCurrency(invoice.roundOff)}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Amount:</span>
                <span className="text-primary-600">{formatCurrency(invoice.totalAmount)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Received Amount:</span>
                <span className="font-medium text-green-600">{formatCurrency(invoice.receivedAmount)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Balance:</span>
                <span className={`font-medium ${invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(invoice.balance)}
                </span>
              </div>

              <div className="flex justify-between text-sm pt-2">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentInfo.status)}`}>
                  {invoice.paymentInfo.status.charAt(0).toUpperCase() + invoice.paymentInfo.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes:</h3>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">© 2025 LakVee Softwares & Solutions</p>
          </div>
        </div>
      </div>
      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoice?.invoiceNumber || id}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={performDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  )
}
