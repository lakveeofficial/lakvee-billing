"use client"

import { ReactNode } from 'react'
import Image from 'next/image'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  showLogo?: boolean
}

export default function PageHeader({ title, subtitle, actions, showLogo = false }: PageHeaderProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t-4 border-t-indigo-500">
      <div className="flex items-center gap-4">
        {showLogo && (
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
            <Image src="/lakvee-logo.png" alt="LakVee Logo" width={32} height={32} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
