import { redirect } from 'next/navigation'

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  // Temporary redirect to the new invoice form with editId param
  // TODO: Replace with a dedicated Edit Invoice page that loads invoice data and reuses the form
  redirect(`/dashboard/invoices/new?editId=${encodeURIComponent(params.id)}`)
}
