import EnhancedPdfButton from '@/components/EnhancedPdfButton'

export default function PdfTemplatePicker({ id }: { id: string }) {
  return (
    <EnhancedPdfButton
      id={id}
      apiPath="/api/csv-invoices"
      filename={`csv-invoice-${id}.pdf`}
      variant="button"
      showTemplateSelector={true}
      className="px-3 py-2 border rounded hover:bg-gray-50 text-sm"
    />
  )
}
