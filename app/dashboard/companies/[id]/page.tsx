'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Calendar,
  Star,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Company, BUSINESS_TYPES, BUSINESS_CATEGORIES } from '@/types/company';
import { useAuth } from '@/hooks/useAuth';
import { toCamelCase } from '@/lib/utils';
import PageHeader from '@/components/PageHeader'

export default function CompanyDetailsPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(false)
  const router = useRouter()
  const params = useParams();
  const companyId = params.id as string;
  const { token } = useAuth();

  useEffect(() => {
    if (companyId && token) {
      loadCompany();
    }
  }, [companyId, token]);

  const loadCompany = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const companyRes = await fetch(`/api/companies/${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!companyRes.ok) throw new Error('Failed to fetch company data.');
      const companyData = await companyRes.json();
      setCompany(toCamelCase(companyData));

      const activeCompanyRes = await fetch('/api/companies/active', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (activeCompanyRes.ok) {
        const activeCompanyData = await activeCompanyRes.json();
        setIsActive(activeCompanyData.id === companyId);
      }
    } catch (error) {
      console.error(error);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!company || !token) return;

    if (isActive) {
      alert('Cannot delete the active company. Please set another company as active first.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${company.businessName}"?`)) {
      try {
        const response = await fetch(`/api/companies/${company.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete company.');
        }

        alert('Company deleted successfully.');
        router.push('/dashboard/companies');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'An unknown error occurred.');
      }
    }
  };

  const handleSetActive = async () => {
    if (!company || !token) return;
    try {
      const response = await fetch('/api/companies/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ companyId: company.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to set active company.');
      }

      setIsActive(true);
      alert('Company set as active.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Company not found</h3>
        <p className="text-gray-600 mb-4">The company you're looking for doesn't exist.</p>
        <button
          onClick={() => router.push('/dashboard/companies')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Back to Companies
        </button>
      </div>
    )
  }

  const businessType = BUSINESS_TYPES.find(t => t.value === company.businessType)
  const businessCategory = BUSINESS_CATEGORIES.find(c => c.value === company.businessCategory)

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={company.businessName}
        subtitle="Company Details"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-200" />
              Back
            </button>
            {!isActive && (
              <button
                onClick={handleSetActive}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              >
                <CheckCircle className="w-4 h-4 text-emerald-200" />
                Set as Active
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/companies/${company.id}/edit`)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            >
              <Edit className="w-4 h-4 text-sky-200" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isActive}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-rose-200" />
              Delete
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Logo and Status */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-center">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.businessName}
                  className="w-32 h-32 mx-auto rounded-lg object-cover mb-4"
                />
              ) : (
                <div className="w-32 h-32 mx-auto rounded-lg bg-gray-200 flex items-center justify-center mb-4">
                  <Building2 className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{company.businessName}</h3>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  company.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {company.isActive ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Inactive
                    </>
                  )}
                </span>
                {isActive && (
                  <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    Current
                  </span>
                )}
              </div>
            </div>

            {/* Digital Signature */}
            {company.signature && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Digital Signature</h4>
                <div className="text-center">
                  <img
                    src={company.signature}
                    alt="Digital Signature"
                    className="max-h-20 mx-auto rounded border"
                  />
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="mt-6 pt-6 border-t space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Created: {new Date(company.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Updated: {new Date(company.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="font-medium text-gray-900">{company.phoneNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email ID</p>
                  <p className="font-medium text-gray-900">{company.emailId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">GSTIN</p>
                  <p className="font-medium text-gray-900">{company.gstin || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">State</p>
                  <p className="font-medium text-gray-900">{company.state}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Business Type</p>
                <p className="font-medium text-gray-900">{businessType?.label || company.businessType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Business Category</p>
                <p className="font-medium text-gray-900">{businessCategory?.label || company.businessCategory}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pincode</p>
                <p className="font-medium text-gray-900">{company.pincode}</p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Address</h3>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium text-gray-900">{company.businessAddress}</p>
                <p className="text-sm text-gray-600 mt-1">{company.state} - {company.pincode}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
