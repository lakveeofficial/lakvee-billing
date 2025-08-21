"use client"

import { ReactNode } from 'react'
import Image from 'next/image'
import { Poppins } from 'next/font/google'

const brandFont = Poppins({ subsets: ['latin'], weight: ['700'] })

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  showLogo?: boolean
}

export default function PageHeader({ title, subtitle, actions, showLogo = false }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 opacity-90" />
      <div className="relative px-5 py-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-white">
        <div>
          <div className="flex items-center gap-3">
            {showLogo ? (
              <Image src="/lakvee-logo.png" alt="LakVee Logo" width={40} height={40} className="rounded-sm bg-white/10 p-1" />
            ) : null}
            <h1 className={`text-2xl font-semibold drop-shadow-sm ${brandFont.className}`}>{title}</h1>
          </div>
          {subtitle ? (
            <p className="text-sm/6 opacity-90">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
