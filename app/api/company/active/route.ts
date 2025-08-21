import { NextResponse } from 'next/server'
import { getAnyActiveCompany } from '@/lib/company'

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

export async function GET(request: Request) {
  try {
    const company = await getAnyActiveCompany()
    if (!company) return NextResponse.json({})
    try {
      const origin = new URL(request.url).origin
      const logoData = await toDataUrlIfNeeded((company as any).logo, origin)
      if (logoData) (company as any).logo = logoData
      const sigData = await toDataUrlIfNeeded((company as any).signature, origin)
      if (sigData) (company as any).signature = sigData
    } catch {}
    return NextResponse.json(company)
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load company' }, { status: 500 })
  }
}
