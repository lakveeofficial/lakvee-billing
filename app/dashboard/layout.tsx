'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Montserrat } from 'next/font/google'
import {
  Home,
  Package,
  Calculator,
  Receipt,
  Calendar,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  User,
  LogOut,
  ChevronDown,
  List,
  QrCode,
  Users,
  LayoutDashboard,
  Building2,
  FileText,
  UserCircle
} from 'lucide-react'

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

const brandFont = Montserrat({ subsets: ['latin'], weight: ['600', '700'] })

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
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

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (profileDropdownOpen && !target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileDropdownOpen])

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/');
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Companies', href: '/dashboard/companies', icon: Building2 },
    {
      name: 'Parties', href: '#', icon: Users, children: [
        { name: 'Party', href: '/dashboard/clients', icon: Users },
        { name: 'Party Quotations', href: '/dashboard/parties/quotations', icon: FileText },
      ]
    },
    {
      name: 'Booking', href: '#', icon: List, children: [
        { name: 'Cash Booking', href: '/dashboard/bookings/cash', icon: List },
        { name: 'Account Booking', href: '/dashboard/bookings/account', icon: List },
      ]
    },
    {
      name: 'Accounts', href: '#', icon: Calculator, children: [
        { name: 'Bills', href: '/dashboard/accounts/bills', icon: Receipt },
        { name: 'Period Bills', href: '/dashboard/accounts/period-bills', icon: Calendar },
        { name: 'Bills History', href: '/dashboard/accounts/bills-history', icon: FileText },
      ]
    },
    ...(user?.role === 'admin' ? [
      { name: 'Setup', href: '/dashboard/setup', icon: Settings },
    ] : []),
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  ];

  // All users see the same simplified navigation
  const filteredNavigation = navigation

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header Navigation */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 group" aria-label="Billing System Home">
              <div className="relative flex items-center justify-center" style={{ minWidth: '48px', minHeight: '48px' }}>
                <div className="absolute inset-0 bg-primary-100 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <img
                  src="/lakvee-logo2.png"
                  alt="LakVee Logo"
                  width="48"
                  height="48"
                  style={{ width: '48px', height: '48px', minWidth: '48px', objectFit: 'contain' }}
                  className="relative z-10 transition-transform group-hover:scale-110"
                />
              </div>
              <span className={`text-slate-900 font-bold text-xl tracking-tight whitespace-nowrap ${brandFont.className}`}>Billing System</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {filteredNavigation.map((item) => (
                <div key={item.name} className="relative group">
                  <a
                    href={item.href}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200 flex items-center gap-2 border border-transparent hover:border-primary-200"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="whitespace-nowrap">{item.name}</span>
                    {Array.isArray(item.children) && item.children.length > 0 && (
                      <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </a>
                  {Array.isArray(item.children) && item.children.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-2">
                        {item.children.map((child: any) => (
                          <a
                            key={child.name}
                            href={child.href}
                            className="block px-4 py-3 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700 transition-colors duration-150 flex items-center gap-3"
                          >
                            <child.icon className="h-4 w-4 text-slate-400" />
                            <span>{child.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* User Menu & Mobile Menu Button */}
            <div className="flex items-center gap-3">
              {/* Profile Dropdown */}
              <div className="hidden lg:block relative profile-dropdown">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200 border border-transparent hover:border-primary-200"
                >
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{user.username}</p>
                    <p className="text-xs text-slate-500 capitalize">{user.role.replace('_', ' ')}</p>
                  </div>
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          router.push('/dashboard/profile')
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700 transition-colors duration-150 flex items-center gap-3"
                      >
                        <UserCircle className="h-4 w-4 text-slate-400" />
                        <span>Edit Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          handleLogout()
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 flex items-center gap-3"
                      >
                        <LogOut className="h-4 w-4 text-slate-400" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors duration-200"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
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
          <MobileSidebarContent navigation={filteredNavigation} user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

function MobileSidebarContent({
  navigation,
  user,
  onLogout
}: {
  navigation: any[],
  user: User,
  onLogout: () => void
}) {
  const router = useRouter()
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-5 bg-gradient-to-r from-primary-600 to-primary-700">
        <Link href="/dashboard" className="flex items-center gap-3 group" aria-label="Billing System Home">
          <div className="relative bg-white rounded-xl p-1 shadow-inner">
            <img
              src="/lakvee-logo2.png"
              alt="LakVee Logo"
              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
              className="relative transition-transform group-hover:scale-105"
            />
          </div>
          <span className={`text-white font-bold text-lg tracking-tight whitespace-nowrap group-hover:opacity-95 ${brandFont.className}`}>Billing System</span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{user.username}</p>
            <p className="text-xs text-slate-500 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <div key={item.name}>
            <a
              href={item.href}
              className="text-slate-700 hover:bg-primary-600 hover:text-white group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150"
            >
              <item.icon className="text-slate-400 group-hover:text-white mr-3 flex-shrink-0 h-5 w-5" />
              <span className="transition-colors group-hover:text-white">{item.name}</span>
            </a>
            {Array.isArray(item.children) && item.children.length > 0 && (
              <div className="ml-8 mt-1 space-y-1">
                {item.children.map((child: any) => (
                  <a
                    key={child.name}
                    href={child.href}
                    className="text-slate-600 hover:bg-primary-500 hover:text-white group flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-150"
                  >
                    <child.icon className="text-slate-400 group-hover:text-white mr-3 h-4 w-4" />
                    <span className="transition-colors group-hover:text-white">{child.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Profile Actions */}
      <div className="flex-shrink-0 border-t border-slate-200 p-4 space-y-2">
        <button
          onClick={() => {
            router.push('/dashboard/profile')
          }}
          className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-700 hover:bg-primary-600 hover:text-white w-full transition-colors duration-150"
        >
          <UserCircle className="text-slate-400 group-hover:text-white mr-3 flex-shrink-0 h-5 w-5" />
          Edit Profile
        </button>
        <button
          onClick={onLogout}
          className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-700 hover:bg-red-600 hover:text-white w-full transition-colors duration-150"
        >
          <LogOut className="text-slate-400 group-hover:text-white mr-3 flex-shrink-0 h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  )
}
