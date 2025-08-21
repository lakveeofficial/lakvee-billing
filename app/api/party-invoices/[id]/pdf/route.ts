import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import { db } from '@/lib/db'
import { getAnyActiveCompany } from '@/lib/company'

function inr(amount: any) {
  const n = Number(amount)
  if (!isFinite(n)) return ''
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)
}

function inrNumber(n: number) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

async function toDataUrlIfNeeded(src: string | null | undefined, baseOrigin: string): Promise<string | null> {
  if (!src || typeof src !== 'string') return null
  if (src.startsWith('data:image/')) return src
  try {
    let url = src
    if (src.startsWith('/')) url = baseOrigin + src
    if (!/^https?:\/\//i.test(url)) return null
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const lower = url.toLowerCase()
    const mime = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg' : lower.endsWith('.webp') ? 'image/webp' : 'image/png'
    const b64 = Buffer.from(buf).toString('base64')
    return `data:${mime};base64,${b64}`
  } catch {
    return null
  }
}

function numberToWordsINR(amount: number) {
  if (!isFinite(amount)) return ''
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const toWords = (num: number): string => {
    if (num === 0) return 'Zero'
    let w = ''
    const crore = Math.floor(num / 10000000); num %= 10000000
    const lakh = Math.floor(num / 100000); num %= 100000
    const thousand = Math.floor(num / 1000); num %= 1000
    const hundred = Math.floor(num / 100); num %= 100
    const two = num
    const join2 = (n: number) => (n < 20 ? ones[n] : (tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '')))
    if (crore) w += join2(crore) + ' Crore '
    if (lakh) w += join2(lakh) + ' Lakh '
    if (thousand) w += join2(thousand) + ' Thousand '
    if (hundred) w += ones[hundred] + ' Hundred '
    if (two) w += (w ? 'and ' : '') + join2(two) + ' '
    return w.trim()
  }
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  const r = toWords(rupees) + ' Rupees'
  const p = paise ? ' and ' + toWords(paise) + ' Paisa' : ''
  return (r + p + ' only').replace(/\s+/g, ' ').trim()
}

function drawHeader(doc: jsPDF, company: any, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 40
  let y = 40
  if (company?.logo && typeof company.logo === 'string' && company.logo.startsWith('data:image/')) {
    try {
      const type = company.logo.includes('png') ? 'PNG' : 'JPEG'
      const maxW = 70, maxH = 40
      let w = maxW, h = maxH
      try {
        const props: any = (doc as any).getImageProperties ? (doc as any).getImageProperties(company.logo) : null
        if (props && props.width && props.height) {
          const ratio = props.width / props.height
          if (maxW / maxH > ratio) {
            h = Math.min(maxH, maxW / ratio, maxH)
            w = h * ratio
          } else {
            w = Math.min(maxW, maxH * ratio, maxW)
            h = w / ratio
          }
        }
      } catch {}
      doc.addImage(company.logo, type as any, left, y, w, h)
    } catch {}
  }
  const right = pageWidth - 40
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text(company?.business_name || 'Company', right, 46, { align: 'right' as any })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(String(company?.business_address || ''), right, 62, { align: 'right' as any })
  const phone = company?.phone_number ? `Phone: ${company.phone_number}` : ''
  const email = company?.email_id ? `Email: ${company.email_id}` : ''
  let y2 = 78
  if (phone) { doc.text(phone, right, y2, { align: 'right' as any }); y2 += 14 }
  if (email) { doc.text(email, right, y2, { align: 'right' as any }); y2 += 14 }
  if (company?.gstin) { doc.text(`GSTIN: ${company.gstin}`, right, y2, { align: 'right' as any }); y2 += 16 }
  doc.setDrawColor(180)
  doc.line(40, y2, right, y2)
  y2 += 24
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text(title, left, y2)
  return y2 + 12
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Delegate to the standard invoice PDF so output matches Sales list PDF exactly
  const { id } = params
  const origin = new URL(request.url).origin
  const target = new URL(`/api/invoices/${id}/pdf`, origin)
  return NextResponse.redirect(target, 302)
}
