'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  FileText, 
  List, 
  BarChart3, 
  Upload, 
  Settings,
  LogOut,
  Building2,
  LayoutDashboard, 
  Receipt
} from 'lucide-react'

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

const brandFont = Poppins({ subsets: ['latin'], weight: ['700'] })

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      router.push('/')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/');
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, current: false },
    { name: 'Company Management', href: '/dashboard/companies', icon: Building2, current: false },
    { name: 'Party Management', href: '/dashboard/parties', icon: Users, current: false },
    // Rates masters remain admin-only (root level)
    ...(user?.role === 'admin' ? [
      { name: 'Rate Masters', href: '/dashboard/rates/masters', icon: Settings, current: false },
    ] : []),
    { name: 'Sales Invoice', href: '/dashboard/invoices/new', icon: Receipt, current: false },
    { name: 'Sales List', href: '/dashboard/invoices', icon: FileText, current: false },
    { name: 'CSV Invoices', href: '/dashboard/csv-invoices', icon: FileText, current: false },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, current: false },
    { name: 'CSV Upload', href: '/dashboard/upload', icon: Upload, current: false },
  ];

  // Filter navigation based on user type
  const filteredNavigation = (user?.role === 'billing_operator')
    ? navigation.filter(item => !['CSV Upload', 'CSV Invoices', 'Rate Masters'].includes(item.name))
    : navigation

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent navigation={filteredNavigation} user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent navigation={filteredNavigation} user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ 
  navigation, 
  user, 
  onLogout 
}: { 
  navigation: any[], 
  user: User, 
  onLogout: () => void 
}) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-5 bg-primary-600">
        <Link href="/dashboard" className="flex items-center gap-4 group" aria-label="Billing Portal Home">
          <Image
            src="/lakvee-logo.png"
            alt="LakVee Logo"
            width={48}
            height={48}
            className="rounded-md bg-white p-1.5 shadow"
            priority
          />
          <span className={`text-white font-semibold text-xl tracking-wide whitespace-nowrap group-hover:opacity-95 ${brandFont.className}`}>Billing Portal</span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-900">{user.username}</p>
        <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <div key={item.name}>
            <a
              href={item.href}
              className={`${
                item.current
                  ? 'bg-primary-100 text-primary-900'
                  : 'text-gray-700'
              } hover:bg-primary-900 hover:!text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150`}
            >
              <item.icon
                className={`${
                  item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-white'
                } mr-3 flex-shrink-0 h-5 w-5`}
              />
              <span className="transition-colors group-hover:!text-white">{item.name}</span>
            </a>
            {Array.isArray(item.children) && item.children.length > 0 && (
              <div className="ml-7 mt-1 space-y-1">
                {item.children.map((child: any) => (
                  <a
                    key={child.name}
                    href={child.href}
                    className="text-gray-700 hover:bg-primary-900 hover:!text-white group flex items-center px-2 py-1.5 text-sm rounded-md transition-colors duration-150"
                  >
                    <child.icon className="text-gray-400 group-hover:text-white mr-3 h-4 w-4 transition-colors duration-150" />
                    <span className="transition-colors group-hover:!text-white">{child.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <button
          onClick={onLogout}
          className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-primary-900 hover:text-white w-full transition-colors duration-150"
        >
          <LogOut className="text-gray-400 group-hover:text-white mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-150" />
          Sign out
        </button>
      </div>
    </div>
  )
}
