'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Save, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface UserData {
    id: number;
    username: string;
    email: string;
    role: string;
}

export default function ProfilePage() {
    const [userData, setUserData] = useState<UserData | null>(null)
    const [email, setEmail] = useState('')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser)
            setUserData(parsedUser)
            setEmail(parsedUser.email)
        } else {
            router.push('/')
        }
    }, [router])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (newPassword && newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        try {
            setLoading(true)
            const response = await fetch('/api/auth/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    currentPassword,
                    newPassword,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setSuccess('Profile updated successfully')
                // Update local storage
                if (userData) {
                    const updatedUser = { ...userData, email }
                    localStorage.setItem('user', JSON.stringify(updatedUser))
                    setUserData(updatedUser)
                }
                // Clear password fields
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
            } else {
                setError(data.error || 'Failed to update profile')
            }
        } catch (err) {
            console.error('Update profile error:', err)
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!userData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Breadcrumbs/Back */}
            <div className="flex items-center gap-2 mb-4">
                <Link
                    href="/dashboard"
                    className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Info Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                            <span className="text-3xl font-bold text-primary-700">
                                {userData.username.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{userData.username}</h2>
                        <p className="text-sm text-slate-500 capitalize px-3 py-1 bg-slate-100 rounded-full mt-2">
                            {userData.role.replace('_', ' ')}
                        </p>

                        <div className="w-full border-t border-slate-100 my-6"></div>

                        <div className="w-full space-y-4 text-left">
                            <div className="flex items-center gap-3 text-slate-600">
                                <Mail className="h-4 w-4 text-slate-400" />
                                <span className="text-sm truncate">{userData.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <User className="h-4 w-4 text-slate-400" />
                                <span className="text-sm">ID: {userData.id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Form Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-semibold text-slate-900">Update Your Account</h3>
                            <p className="text-sm text-slate-500">Keep your account details up to date</p>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
                                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                                    {success}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                            placeholder="name@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Change Password</h4>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                                <input
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                    placeholder="Required for any changes"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                                    <input
                                                        type="password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                        placeholder="Min 6 characters"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                                    <input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                                        placeholder="Repeat new password"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Save className="h-5 w-5" />
                                    )}
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
